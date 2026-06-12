import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { ParsedPointCloud } from './depthParser';

export type RenderMode = 'solid' | 'depth' | 'original';

export interface PointCloudState {
  pointSize: number;
  depthOffset: number;
  saturation: number;
  renderMode: RenderMode;
  solidColor: string;
}

const vertexShader = `
  attribute vec3 originalColor;
  attribute float depthValue;
  attribute float targetSize;
  
  uniform float pointSizeBase;
  uniform float depthOffset;
  uniform float saturation;
  uniform int renderMode;
  uniform vec3 solidColor;
  uniform float time;
  
  varying vec3 vColor;
  varying float vDepth;
  
  vec3 adjustSaturation(vec3 color, float sat) {
    float gray = dot(color, vec3(0.299, 0.587, 0.114));
    return mix(vec3(gray), color, sat);
  }
  
  vec3 depthToColor(float depth) {
    float t = clamp(depth, 0.0, 1.0);
    vec3 color1 = vec3(1.0, 0.0, 0.0);
    vec3 color2 = vec3(0.0, 0.0, 1.0);
    return mix(color1, color2, t);
  }
  
  void main() {
    vec3 pos = position;
    pos.z += depthOffset;
    
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    
    float distanceFactor = 300.0 / -mvPosition.z;
    float size = pointSizeBase * targetSize * distanceFactor;
    gl_PointSize = clamp(size, 2.0, 6.0);
    
    vDepth = depthValue;
    
    if (renderMode == 0) {
      vColor = solidColor;
    } else if (renderMode == 1) {
      vColor = depthToColor(depthValue);
    } else {
      vColor = adjustSaturation(originalColor, saturation);
    }
  }
`;

const fragmentShader = `
  varying vec3 vColor;
  
  void main() {
    vec2 center = gl_PointCoord - vec2(0.5);
    float dist = length(center);
    
    if (dist > 0.5) {
      discard;
    }
    
    float alpha = 1.0 - smoothstep(0.3, 0.5, dist);
    gl_FragColor = vec4(vColor, alpha);
  }
`;

export class PointCloudRenderer {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private pointCloud: THREE.Points | null = null;
  private material: THREE.ShaderMaterial | null = null;
  private container: HTMLElement;
  
  private state: PointCloudState = {
    pointSize: 3,
    depthOffset: 0,
    saturation: 1,
    renderMode: 'original',
    solidColor: '#cccccc',
  };
  
  private targetState: PointCloudState = { ...this.state };
  private currentRenderMode: RenderMode = 'original';
  private targetRenderMode: RenderMode = 'original';
  
  private animationId: number | null = null;
  private lastFrameTime = 0;
  private fps = 0;
  private frameCount = 0;
  private fpsUpdateTime = 0;
  private startTime = 0;
  
  private pointCount = 0;
  private originalPositions: Float32Array | null = null;
  private originalColors: Float32Array | null = null;
  private depthValues: Float32Array | null = null;
  private targetSizes: Float32Array | null = null;
  
  private onFpsUpdate?: (fps: number) => void;
  private onPointCountUpdate?: (count: number) => void;

  constructor(container: HTMLElement) {
    this.container = container;
    this.startTime = performance.now();
    
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0d1117);
    
    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 0, 3);
    
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setClearColor(0x0d1117, 1);
    
    container.appendChild(this.renderer.domElement);
    
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.rotateSpeed = 0.6;
    this.controls.zoomSpeed = 0.8;
    this.controls.minDistance = 0.5;
    this.controls.maxDistance = 20;
    
    this.setupLights();
    this.setupResizeHandler();
    this.animate();
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);
    
    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.6);
    dirLight1.position.set(
      Math.cos(THREE.MathUtils.degToRad(30)),
      Math.sin(THREE.MathUtils.degToRad(30)),
      1
    ).normalize();
    this.scene.add(dirLight1);
    
    const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
    dirLight2.position.set(
      Math.cos(THREE.MathUtils.degToRad(-45)),
      Math.sin(THREE.MathUtils.degToRad(-45)),
      -1
    ).normalize();
    this.scene.add(dirLight2);
  }

  private setupResizeHandler(): void {
    window.addEventListener('resize', () => {
      this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    });
  }

  public updatePointCloud(data: ParsedPointCloud): void {
    this.pointCount = data.pointCount;
    
    if (data.pointCount === 0) {
      if (this.pointCloud) {
        this.scene.remove(this.pointCloud);
        this.pointCloud.geometry.dispose();
        if (this.material) this.material.dispose();
      }
      this.pointCloud = null;
      this.material = null;
      this.originalPositions = null;
      this.originalColors = null;
      this.depthValues = null;
      this.targetSizes = null;
      this.notifyPointCountUpdate();
      return;
    }

    this.originalPositions = data.positions.slice();
    this.originalColors = data.colors.slice();
    this.depthValues = data.rawDepthValues.slice();
    
    this.targetSizes = new Float32Array(data.pointCount);
    for (let i = 0; i < data.pointCount; i++) {
      this.targetSizes[i] = 1.0;
    }

    if (!this.pointCloud || !this.material) {
      this.createPointCloud(data);
    } else {
      this.updateGeometryAttributes(data);
    }
    
    this.fitCameraToPointCloud();
    this.notifyPointCountUpdate();
  }

  private createPointCloud(data: ParsedPointCloud): void {
    if (this.pointCloud) {
      this.scene.remove(this.pointCloud);
      this.pointCloud.geometry.dispose();
      if (this.material) this.material.dispose();
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(data.positions.slice(), 3));
    geometry.setAttribute('originalColor', new THREE.BufferAttribute(data.colors.slice(), 3));
    geometry.setAttribute('depthValue', new THREE.BufferAttribute(data.rawDepthValues.slice(), 1));
    geometry.setAttribute('targetSize', new THREE.BufferAttribute(this.targetSizes!.slice(), 1));
    geometry.computeBoundingSphere();
    
    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        pointSizeBase: { value: this.state.pointSize },
        depthOffset: { value: this.state.depthOffset },
        saturation: { value: this.state.saturation },
        renderMode: { value: this.getRenderModeIndex(this.currentRenderMode) },
        solidColor: { value: new THREE.Color(this.state.solidColor) },
        time: { value: 0 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    
    this.pointCloud = new THREE.Points(geometry, this.material);
    this.scene.add(this.pointCloud);
  }

  private updateGeometryAttributes(data: ParsedPointCloud): void {
    if (!this.pointCloud || !this.material) return;
    
    const geometry = this.pointCloud.geometry;
    
    const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute;
    const colorAttr = geometry.getAttribute('originalColor') as THREE.BufferAttribute;
    const depthAttr = geometry.getAttribute('depthValue') as THREE.BufferAttribute;
    const sizeAttr = geometry.getAttribute('targetSize') as THREE.BufferAttribute;
    
    if (posAttr.count !== data.pointCount) {
      geometry.dispose();
      this.createPointCloud(data);
      return;
    }
    
    const posArray = posAttr.array as Float32Array;
    const colorArray = colorAttr.array as Float32Array;
    const depthArray = depthAttr.array as Float32Array;
    const sizeArray = sizeAttr.array as Float32Array;
    
    posArray.set(data.positions);
    colorArray.set(data.colors);
    depthArray.set(data.rawDepthValues);
    sizeArray.set(this.targetSizes!);
    
    posAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;
    depthAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;
    
    geometry.computeBoundingSphere();
    geometry.boundingSphere!.needsUpdate = true;
  }

  private getRenderModeIndex(mode: RenderMode): number {
    switch (mode) {
      case 'solid': return 0;
      case 'depth': return 1;
      case 'original': return 2;
      default: return 2;
    }
  }

  private fitCameraToPointCloud(): void {
    if (!this.pointCloud) return;
    
    const box = new THREE.Box3().setFromObject(this.pointCloud);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = this.camera.fov * (Math.PI / 180);
    let cameraZ = maxDim / (2 * Math.tan(fov / 2));
    cameraZ *= 1.5;
    
    this.camera.position.set(center.x, center.y, center.z + cameraZ);
    this.controls.target.copy(center);
    this.controls.update();
  }

  public setPointSize(size: number): void {
    this.targetState.pointSize = size;
  }

  public setDepthOffset(offset: number): void {
    this.targetState.depthOffset = offset;
  }

  public setSaturation(saturation: number): void {
    this.targetState.saturation = saturation;
  }

  public setRenderMode(mode: RenderMode): void {
    this.targetRenderMode = mode;
    this.targetState.renderMode = mode;
  }

  public getState(): PointCloudState {
    return { ...this.state };
  }

  public getPointCount(): number {
    return this.pointCount;
  }

  public getPointData(): { positions: Float32Array; colors: Float32Array; count: number } | null {
    if (!this.pointCloud || !this.material || !this.originalPositions || !this.originalColors || !this.depthValues) {
      return null;
    }
    
    const count = this.pointCount;
    const outPositions = new Float32Array(count * 3);
    const outColors = new Float32Array(count * 3);
    
    const depthOffset = this.state.depthOffset;
    const saturation = this.state.saturation;
    const renderMode = this.currentRenderMode;
    const solidColor = new THREE.Color(this.state.solidColor);
    
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      outPositions[i3] = this.originalPositions[i3];
      outPositions[i3 + 1] = this.originalPositions[i3 + 1];
      outPositions[i3 + 2] = this.originalPositions[i3 + 2] + depthOffset;
      
      if (renderMode === 'solid') {
        outColors[i3] = solidColor.r;
        outColors[i3 + 1] = solidColor.g;
        outColors[i3 + 2] = solidColor.b;
      } else if (renderMode === 'depth') {
        const t = Math.min(Math.max(this.depthValues[i], 0), 1);
        outColors[i3] = 1 - t;
        outColors[i3 + 1] = 0;
        outColors[i3 + 2] = t;
      } else {
        const r = this.originalColors[i3];
        const g = this.originalColors[i3 + 1];
        const b = this.originalColors[i3 + 2];
        const gray = r * 0.299 + g * 0.587 + b * 0.114;
        outColors[i3] = Math.max(0, Math.min(1, gray + (r - gray) * saturation));
        outColors[i3 + 1] = Math.max(0, Math.min(1, gray + (g - gray) * saturation));
        outColors[i3 + 2] = Math.max(0, Math.min(1, gray + (b - gray) * saturation));
      }
    }
    
    return { positions: outPositions, colors: outColors, count };
  }

  public setOnFpsUpdate(callback: (fps: number) => void): void {
    this.onFpsUpdate = callback;
  }

  public setOnPointCountUpdate(callback: (count: number) => void): void {
    this.onPointCountUpdate = callback;
  }

  private notifyPointCountUpdate(): void {
    if (this.onPointCountUpdate) {
      this.onPointCountUpdate(this.pointCount);
    }
  }

  private lerp(current: number, target: number, factor: number): number {
    return current + (target - current) * factor;
  }

  private updateStateAnimation(): void {
    const factor = 0.15;
    
    this.state.pointSize = this.lerp(this.state.pointSize, this.targetState.pointSize, factor);
    this.state.depthOffset = this.lerp(this.state.depthOffset, this.targetState.depthOffset, factor);
    this.state.saturation = this.lerp(this.state.saturation, this.targetState.saturation, factor);
    
    if (this.material) {
      this.material.uniforms.pointSizeBase.value = this.state.pointSize;
      this.material.uniforms.depthOffset.value = this.state.depthOffset;
      this.material.uniforms.saturation.value = this.state.saturation;
      this.material.uniforms.time.value = (performance.now() - this.startTime) / 1000;
      
      if (this.currentRenderMode !== this.targetRenderMode) {
        this.currentRenderMode = this.targetRenderMode;
        this.material.uniforms.renderMode.value = this.getRenderModeIndex(this.currentRenderMode);
      }
    }
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);
    
    const now = performance.now();
    const delta = now - this.lastFrameTime;
    this.lastFrameTime = now;
    
    this.frameCount++;
    if (now - this.fpsUpdateTime >= 500) {
      this.fps = Math.round((this.frameCount * 1000) / (now - this.fpsUpdateTime));
      this.frameCount = 0;
      this.fpsUpdateTime = now;
      if (this.onFpsUpdate) {
        this.onFpsUpdate(this.fps);
      }
    }
    
    this.updateStateAnimation();
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  public dispose(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    
    if (this.pointCloud) {
      this.pointCloud.geometry.dispose();
      if (this.material) {
        this.material.dispose();
      }
    }
    
    this.controls.dispose();
    this.renderer.dispose();
    
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}
