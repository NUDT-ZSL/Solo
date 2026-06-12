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

const vertexShader = /* glsl */ `
  attribute vec3 originalColor;
  attribute float depthValue;
  attribute float pointDensity;
  
  uniform float pointSizeBase;
  uniform float depthOffset;
  uniform float saturation;
  uniform int renderMode;
  uniform vec3 solidColor;
  uniform float pixelRatio;
  
  varying vec3 vColor;
  varying float vDepth;
  
  vec3 rgbToHsl(vec3 c) {
    float r = c.r, g = c.g, b = c.b;
    float maxC = max(max(r, g), b);
    float minC = min(min(r, g), b);
    float h = 0.0, s = 0.0;
    float l = (maxC + minC) * 0.5;
    if (maxC != minC) {
      float d = maxC - minC;
      s = l > 0.5 ? d / (2.0 - maxC - minC) : d / (maxC + minC);
      if (r == maxC) { h = (g - b) / d + (g < b ? 6.0 : 0.0); }
      else if (g == maxC) { h = (b - r) / d + 2.0; }
      else { h = (r - g) / d + 4.0; }
      h /= 6.0;
    }
    return vec3(h, s, l);
  }
  
  float hue2rgb(float p, float q, float t) {
    if (t < 0.0) t += 1.0;
    if (t > 1.0) t -= 1.0;
    if (t < 1.0/6.0) return p + (q - p) * 6.0 * t;
    if (t < 1.0/2.0) return q;
    if (t < 2.0/3.0) return p + (q - p) * (2.0/3.0 - t) * 6.0;
    return p;
  }
  
  vec3 hslToRgb(vec3 hsl) {
    float h = hsl.x, s = hsl.y, l = hsl.z;
    float r, g, b;
    if (s == 0.0) {
      r = g = b = l;
    } else {
      float q = l < 0.5 ? l * (1.0 + s) : l + s - l * s;
      float p = 2.0 * l - q;
      r = hue2rgb(p, q, h + 1.0/3.0);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1.0/3.0);
    }
    return vec3(r, g, b);
  }
  
  vec3 adjustSaturation(vec3 color, float sat) {
    vec3 hsl = rgbToHsl(color);
    hsl.y = clamp(hsl.y * sat, 0.0, 1.0);
    return hslToRgb(hsl);
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
    
    float cameraDistance = -mvPosition.z;
    float distanceFactor = 300.0 / max(cameraDistance, 0.1);
    float densityFactor = mix(0.7, 1.3, pointDensity);
    float size = pointSizeBase * distanceFactor * densityFactor * pixelRatio;
    
    float minSizePx = 2.0 * pixelRatio;
    float maxSizePx = 6.0 * pixelRatio;
    gl_PointSize = clamp(size, minSizePx, maxSizePx);
    
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

const fragmentShader = /* glsl */ `
  varying vec3 vColor;
  
  void main() {
    vec2 c = gl_PointCoord - vec2(0.5);
    float d = length(c);
    if (d > 0.5) discard;
    float a = 1.0 - smoothstep(0.3, 0.5, d);
    gl_FragColor = vec4(vColor, a);
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
  private _renderMode: RenderMode = 'original';

  private animationId: number | null = null;
  private lastFrameTime = 0;
  private fps = 0;
  private frameCount = 0;
  private fpsUpdateTime = 0;

  private pointCount = 0;
  private origPositions: Float32Array | null = null;
  private origColors: Float32Array | null = null;
  private origDepths: Float32Array | null = null;

  private onFpsUpdateCb?: (fps: number) => void;
  private onPointCountCb?: (count: number) => void;

  constructor(container: HTMLElement) {
    this.container = container;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0d1117);

    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.01,
      1000
    );
    this.camera.position.set(0, 0, 3);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setClearColor(0x0d1117, 1);
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.rotateSpeed = 0.6;
    this.controls.zoomSpeed = 0.8;
    this.controls.minDistance = 0.3;
    this.controls.maxDistance = 30;

    this.setupLights();
    this.setupResize();
    this.animate();
  }

  private setupLights() {
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.4));

    const d1 = new THREE.DirectionalLight(0xffffff, 0.6);
    d1.position.set(Math.cos(THREE.MathUtils.degToRad(30)), Math.sin(THREE.MathUtils.degToRad(30)), 1).normalize();
    this.scene.add(d1);

    const d2 = new THREE.DirectionalLight(0xffffff, 0.4);
    d2.position.set(Math.cos(THREE.MathUtils.degToRad(-45)), Math.sin(THREE.MathUtils.degToRad(-45)), -1).normalize();
    this.scene.add(d2);
  }

  private setupResize() {
    window.addEventListener('resize', () => {
      this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    });
  }

  public updatePointCloud(data: ParsedPointCloud) {
    this.pointCount = data.pointCount;

    if (data.pointCount === 0) {
      if (this.pointCloud) {
        this.scene.remove(this.pointCloud);
        this.pointCloud.geometry.dispose();
        if (this.material) this.material.dispose();
      }
      this.pointCloud = null;
      this.material = null;
      this.origPositions = null;
      this.origColors = null;
      this.origDepths = null;
      this.emitCount();
      return;
    }

    this.origPositions = data.positions.slice();
    this.origColors = data.colors.slice();
    this.origDepths = data.rawDepthValues.slice();

    const density = new Float32Array(data.pointCount);
    this.computePointDensity(data.positions, data.pointCount, density);

    if (!this.pointCloud || !this.material) {
      this.createPoints(data, density);
    } else {
      this.updateBuffers(data, density);
    }

    this.fitView();
    this.emitCount();
  }

  private computePointDensity(positions: Float32Array, n: number, out: Float32Array) {
    if (n === 0) return;
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    for (let i = 0; i < n; i++) {
      const i3 = i * 3;
      const x = positions[i3], y = positions[i3 + 1], z = positions[i3 + 2];
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
    }
    const sx = maxX - minX || 1;
    const sy = maxY - minY || 1;
    const sz = maxZ - minZ || 1;
    const cellSize = Math.max(sx, sy, sz) / 20;
    const grid = new Map<string, number>();
    const keys: string[] = new Array(n);
    for (let i = 0; i < n; i++) {
      const i3 = i * 3;
      const gx = Math.floor((positions[i3] - minX) / cellSize);
      const gy = Math.floor((positions[i3 + 1] - minY) / cellSize);
      const gz = Math.floor((positions[i3 + 2] - minZ) / cellSize);
      const k = `${gx}_${gy}_${gz}`;
      keys[i] = k;
      grid.set(k, (grid.get(k) || 0) + 1);
    }
    let maxCount = 0;
    grid.forEach((v) => { if (v > maxCount) maxCount = v; });
    const norm = maxCount || 1;
    for (let i = 0; i < n; i++) {
      const c = grid.get(keys[i]) || 0;
      out[i] = 1 - Math.min(1, c / norm);
    }
  }

  private createPoints(data: ParsedPointCloud, density: Float32Array) {
    if (this.pointCloud) {
      this.scene.remove(this.pointCloud);
      this.pointCloud.geometry.dispose();
      if (this.material) this.material.dispose();
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(data.positions.slice(), 3));
    g.setAttribute('originalColor', new THREE.BufferAttribute(data.colors.slice(), 3));
    g.setAttribute('depthValue', new THREE.BufferAttribute(data.rawDepthValues.slice(), 1));
    g.setAttribute('pointDensity', new THREE.BufferAttribute(density.slice(), 1));
    g.computeBoundingSphere();

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        pointSizeBase: { value: this.state.pointSize },
        depthOffset: { value: this.state.depthOffset },
        saturation: { value: this.state.saturation },
        renderMode: { value: this.renderModeIndex(this._renderMode) },
        solidColor: { value: new THREE.Color(this.state.solidColor) },
        pixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.pointCloud = new THREE.Points(g, this.material);
    this.scene.add(this.pointCloud);
  }

  private updateBuffers(data: ParsedPointCloud, density: Float32Array) {
    if (!this.pointCloud || !this.material) return;
    const g = this.pointCloud.geometry;
    const pa = g.getAttribute('position') as THREE.BufferAttribute;
    if (pa.count !== data.pointCount) {
      g.dispose();
      this.createPoints(data, density);
      return;
    }
    (pa.array as Float32Array).set(data.positions);
    (g.getAttribute('originalColor').array as Float32Array).set(data.colors);
    (g.getAttribute('depthValue').array as Float32Array).set(data.rawDepthValues);
    (g.getAttribute('pointDensity').array as Float32Array).set(density);
    pa.needsUpdate = true;
    (g.getAttribute('originalColor') as THREE.BufferAttribute).needsUpdate = true;
    (g.getAttribute('depthValue') as THREE.BufferAttribute).needsUpdate = true;
    (g.getAttribute('pointDensity') as THREE.BufferAttribute).needsUpdate = true;
    g.computeBoundingSphere();
  }

  private renderModeIndex(m: RenderMode): number {
    return m === 'solid' ? 0 : m === 'depth' ? 1 : 2;
  }

  private fitView() {
    if (!this.pointCloud) return;
    const box = new THREE.Box3().setFromObject(this.pointCloud);
    const c = box.getCenter(new THREE.Vector3());
    const s = box.getSize(new THREE.Vector3());
    const m = Math.max(s.x, s.y, s.z);
    const fov = this.camera.fov * Math.PI / 180;
    const z = (m / (2 * Math.tan(fov / 2))) * 1.5;
    this.camera.position.set(c.x, c.y, c.z + z);
    this.controls.target.copy(c);
    this.controls.update();
  }

  public setPointSize(v: number) { this.targetState.pointSize = v; }
  public setDepthOffset(v: number) { this.targetState.depthOffset = v; }
  public setSaturation(v: number) { this.targetState.saturation = v; }
  public setRenderMode(m: RenderMode) { this.targetState.renderMode = m; }

  public getState() { return { ...this.state }; }
  public getPointCount() { return this.pointCount; }

  public getPointData(): { positions: Float32Array; colors: Float32Array; count: number } | null {
    if (!this.pointCloud || !this.origPositions || !this.origColors || !this.origDepths) return null;
    const n = this.pointCount;
    const p = new Float32Array(n * 3);
    const c = new Float32Array(n * 3);
    const off = this.state.depthOffset;
    const sat = this.state.saturation;
    const rm = this._renderMode;
    const solid = new THREE.Color(this.state.solidColor);

    const rgbHslSat = (r: number, g: number, b: number, s: number): [number, number, number] => {
      const maxC = Math.max(r, g, b), minC = Math.min(r, g, b);
      const l = (maxC + minC) * 0.5;
      if (maxC === minC) { return [l, l, l]; }
      const d = maxC - minC;
      const hslS = l > 0.5 ? d / (2 - maxC - minC) : d / (maxC + minC);
      let h: number;
      if (r === maxC) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      else if (g === maxC) h = ((b - r) / d + 2) / 6;
      else h = ((r - g) / d + 4) / 6;
      const ns = Math.max(0, Math.min(1, hslS * s));
      const q = l < 0.5 ? l * (1 + ns) : l + ns - l * ns;
      const pp = 2 * l - q;
      const hue2 = (t: number) => {
        if (t < 0) t += 1; if (t > 1) t -= 1;
        if (t < 1/6) return pp + (q - pp) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return pp + (q - pp) * (2/3 - t) * 6;
        return pp;
      };
      return [
        Math.max(0, Math.min(1, hue2(h + 1/3))),
        Math.max(0, Math.min(1, hue2(h))),
        Math.max(0, Math.min(1, hue2(h - 1/3))),
      ];
    };

    for (let i = 0; i < n; i++) {
      const i3 = i * 3;
      p[i3] = this.origPositions[i3];
      p[i3 + 1] = this.origPositions[i3 + 1];
      p[i3 + 2] = this.origPositions[i3 + 2] + off;
      if (rm === 'solid') {
        c[i3] = solid.r; c[i3 + 1] = solid.g; c[i3 + 2] = solid.b;
      } else if (rm === 'depth') {
        const t = Math.max(0, Math.min(1, this.origDepths[i]));
        c[i3] = 1 - t; c[i3 + 1] = 0; c[i3 + 2] = t;
      } else {
        const [r, g, b] = rgbHslSat(
          this.origColors[i3], this.origColors[i3 + 1], this.origColors[i3 + 2], sat
        );
        c[i3] = r; c[i3 + 1] = g; c[i3 + 2] = b;
      }
    }
    return { positions: p, colors: c, count: n };
  }

  public setOnFpsUpdate(cb: (fps: number) => void) { this.onFpsUpdateCb = cb; }
  public setOnPointCountUpdate(cb: (count: number) => void) { this.onPointCountCb = cb; }
  private emitCount() { if (this.onPointCountCb) this.onPointCountCb(this.pointCount); }

  private lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

  private updateUniforms() {
    const t = 0.18;
    this.state.pointSize = this.lerp(this.state.pointSize, this.targetState.pointSize, t);
    this.state.depthOffset = this.lerp(this.state.depthOffset, this.targetState.depthOffset, t);
    this.state.saturation = this.lerp(this.state.saturation, this.targetState.saturation, t);
    if (this._renderMode !== this.targetState.renderMode) {
      this._renderMode = this.targetState.renderMode;
      this.state.renderMode = this._renderMode;
    }
    if (this.material) {
      this.material.uniforms.pointSizeBase.value = this.state.pointSize;
      this.material.uniforms.depthOffset.value = this.state.depthOffset;
      this.material.uniforms.saturation.value = this.state.saturation;
      this.material.uniforms.renderMode.value = this.renderModeIndex(this._renderMode);
    }
  }

  private animate = () => {
    this.animationId = requestAnimationFrame(this.animate);
    const now = performance.now();
    this.lastFrameTime = now;
    this.frameCount++;
    if (now - this.fpsUpdateTime >= 500) {
      this.fps = Math.round(this.frameCount * 1000 / (now - this.fpsUpdateTime));
      this.frameCount = 0;
      this.fpsUpdateTime = now;
      if (this.onFpsUpdateCb) this.onFpsUpdateCb(this.fps);
    }
    this.updateUniforms();
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  public dispose() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    if (this.pointCloud) {
      this.pointCloud.geometry.dispose();
      if (this.material) this.material.dispose();
    }
    this.controls.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
