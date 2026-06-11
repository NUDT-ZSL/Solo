import * as THREE from 'three';
import type { Stroke, StrokePoint } from './drawCanvas';

interface ParticleData {
  originalPosition: THREE.Vector3;
  normal: THREE.Vector3;
  color: THREE.Color;
  size: number;
  baseSize: number;
  amplitude: number;
  frequency: number;
  phase: number;
  originalX: number;
  originalY: number;
  hexColor: string;
  strokeId: number;
}

interface ParticleCloudOptions {
  canvasId: string;
  tooltipId: string;
  particleCountId: string;
  maxParticles: number;
  onParticleCountChange: (count: number) => void;
}

const MAX_PARTICLES = 3000;
const Z_OFFSET_SCALE = 30;
const Z_RANGE_MIN = -60;
const Z_RANGE_MAX = 60;
const ROTATION_SPEED = 0.5;
const ROTATION_SPEED_PER_PIXEL = 0.3;
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 3.0;

export class ParticleCloud {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private canvas: HTMLCanvasElement;
  private tooltip: HTMLElement;
  private particleCountEl: HTMLElement;
  private onParticleCountChange: (count: number) => void;

  private points: THREE.Points | null = null;
  private particles: ParticleData[] = [];
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private hoveredParticleIndex: number = -1;

  private isDragging = false;
  private previousMousePosition = { x: 0, y: 0 };
  private cameraDistance = 200;
  private cameraTheta = 0;
  private cameraPhi = Math.PI / 4;
  private targetRotationY = 0;

  private strokeOrder: number[] = [];
  private strokeParticleMap: Map<number, number[]> = new Map();

  private time = 0;
  private interactive = false;

  constructor(options: ParticleCloudOptions) {
    this.canvas = document.getElementById(options.canvasId) as HTMLCanvasElement;
    this.tooltip = document.getElementById(options.tooltipId)!;
    this.particleCountEl = document.getElementById(options.particleCountId)!;
    this.onParticleCountChange = options.onParticleCountChange;

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      60,
      this.canvas.clientWidth / this.canvas.clientHeight,
      0.1,
      1000
    );
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true
    });

    this.init();
  }

  private init(): void {
    this.setupRenderer();
    this.setupCamera();
    this.setupLights();
    this.setupEventListeners();
    this.updateCameraPosition();
  }

  private setupRenderer(): void {
    const rect = this.canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }

  private setupCamera(): void {
    this.camera.fov = 60;
    this.camera.aspect = this.canvas.clientWidth / this.canvas.clientHeight;
    this.camera.near = 0.1;
    this.camera.far = 1000;
    this.camera.updateProjectionMatrix();
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0xffffff, 0.8, 500);
    pointLight1.position.set(100, 100, 100);
    pointLight1.castShadow = true;
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x6666ff, 0.4, 500);
    pointLight2.position.set(-100, -100, 100);
    this.scene.add(pointLight2);
  }

  private setupEventListeners(): void {
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
    this.canvas.addEventListener('wheel', this.handleWheel.bind(this), { passive: false });

    window.addEventListener('resize', this.handleResize.bind(this));
  }

  public setInteractive(interactive: boolean): void {
    this.interactive = interactive;
    this.canvas.classList.toggle('interactive', interactive);
  }

  private handleMouseDown(e: MouseEvent): void {
    if (!this.interactive) return;
    this.isDragging = true;
    this.previousMousePosition = { x: e.clientX, y: e.clientY };
  }

  private handleMouseMove(e: MouseEvent): void {
    this.updateMousePosition(e);

    if (this.isDragging && this.interactive) {
      const deltaX = e.clientX - this.previousMousePosition.x;
      const deltaY = e.clientY - this.previousMousePosition.y;

      this.cameraTheta -= deltaX * ROTATION_SPEED_PER_PIXEL * Math.PI / 180;
      this.cameraPhi -= deltaY * ROTATION_SPEED_PER_PIXEL * Math.PI / 180;

      this.cameraPhi = Math.max(0.1, Math.min(Math.PI - 0.1, this.cameraPhi));

      this.previousMousePosition = { x: e.clientX, y: e.clientY };
      this.updateCameraPosition();
    }

    if (this.interactive && this.points) {
      this.performRaycast(e);
    }
  }

  private handleMouseUp(): void {
    this.isDragging = false;
  }

  private handleMouseLeave(): void {
    this.isDragging = false;
    this.hideTooltip();
    this.hoveredParticleIndex = -1;
  }

  private handleWheel(e: WheelEvent): void {
    if (!this.interactive) return;
    e.preventDefault();

    const zoomSpeed = 0.001;
    this.cameraDistance += e.deltaY * zoomSpeed * this.cameraDistance;
    this.cameraDistance = Math.max(MIN_ZOOM * 100, Math.min(MAX_ZOOM * 100, this.cameraDistance));

    this.updateCameraPosition();
  }

  private handleResize(): void {
    const rect = this.canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private updateMousePosition(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private updateCameraPosition(): void {
    const x = this.cameraDistance * Math.sin(this.cameraPhi) * Math.sin(this.cameraTheta);
    const y = this.cameraDistance * Math.cos(this.cameraPhi);
    const z = this.cameraDistance * Math.sin(this.cameraPhi) * Math.cos(this.cameraTheta);

    this.camera.position.set(x, y, z);
    this.camera.lookAt(0, 0, 0);
  }

  private performRaycast(e: MouseEvent): void {
    if (!this.points || this.particles.length === 0) return;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.points);

    if (intersects.length > 0) {
      const index = intersects[0].index;
      if (index !== undefined && index !== this.hoveredParticleIndex) {
        this.hoveredParticleIndex = index;
        this.showTooltip(e, index);
      }
    } else {
      this.hoveredParticleIndex = -1;
      this.hideTooltip();
    }
  }

  private showTooltip(e: MouseEvent, index: number): void {
    const particle = this.particles[index];
    if (!particle) return;

    this.tooltip.innerHTML = `
      <div>坐标: (${Math.round(particle.originalX)}, ${Math.round(particle.originalY)})</div>
      <div>颜色: ${particle.hexColor}</div>
    `;
    this.tooltip.style.display = 'block';
    this.tooltip.style.left = e.clientX + 'px';
    this.tooltip.style.top = e.clientY + 'px';
  }

  private hideTooltip(): void {
    this.tooltip.style.display = 'none';
  }

  public generateFromStrokes(strokes: Stroke[]): void {
    this.removeOldParticlesForNewStrokes(strokes);

    for (const stroke of strokes) {
      if (!this.strokeOrder.includes(stroke.id)) {
        this.strokeOrder.push(stroke.id);
        const particleIndices = this.createParticlesFromStroke(stroke);
        this.strokeParticleMap.set(stroke.id, particleIndices);
      }
    }

    this.enforceParticleLimit();
    this.updateParticleSystem();
    this.updateParticleCount();
  }

  private removeOldParticlesForNewStrokes(newStrokes: Stroke[]): void {
    const newStrokeIds = new Set(newStrokes.map(s => s.id));
    const existingIds = new Set(this.strokeOrder);
    
    for (const id of this.strokeOrder) {
      if (!newStrokeIds.has(id) && !existingIds.has(id)) {
        this.removeStroke(id);
      }
    }
  }

  private removeStroke(strokeId: number): void {
    const indices = this.strokeParticleMap.get(strokeId);
    if (!indices) return;

    for (let i = indices.length - 1; i >= 0; i--) {
      const idx = indices[i];
      this.particles.splice(idx, 1);
      
      for (const [id, idxs] of this.strokeParticleMap) {
        if (id !== strokeId) {
          for (let j = 0; j < idxs.length; j++) {
            if (idxs[j] > idx) {
              idxs[j]--;
            }
          }
        }
      }
    }

    this.strokeParticleMap.delete(strokeId);
    const orderIndex = this.strokeOrder.indexOf(strokeId);
    if (orderIndex > -1) {
      this.strokeOrder.splice(orderIndex, 1);
    }
  }

  private enforceParticleLimit(): void {
    while (this.particles.length > MAX_PARTICLES && this.strokeOrder.length > 0) {
      const oldestStrokeId = this.strokeOrder[0];
      this.removeStroke(oldestStrokeId);
    }
  }

  private createParticlesFromStroke(stroke: Stroke): number[] {
    const indices: number[] = [];
    const points = stroke.points;

    if (points.length < 2) return indices;

    const normals = this.calculateStrokeNormals(points);

    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      const normal = normals[i];

      const densityMultiplier = this.calculateDensityFromBrightness(point.brightness);
      const extraParticles = Math.floor(densityMultiplier * 3);

      for (let j = 0; j <= extraParticles; j++) {
        if (this.particles.length >= MAX_PARTICLES) break;

        const zOffset = this.calculateZOffset(point.curvature, point.brightness);
        const jitterX = (Math.random() - 0.5) * 2;
        const jitterY = (Math.random() - 0.5) * 2;
        const jitterZ = (Math.random() - 0.5) * 4;

        const canvasRect = this.canvas.getBoundingClientRect();
        const centerX = canvasRect.width / 2;
        const centerY = canvasRect.height / 2;

        const originalPos = new THREE.Vector3(
          point.x - centerX + jitterX,
          centerY - point.y + jitterY,
          zOffset + jitterZ
        );

        const baseSize = 3 + Math.random() * 5;
        const particle: ParticleData = {
          originalPosition: originalPos.clone(),
          normal: normal.clone(),
          color: new THREE.Color(point.color),
          size: baseSize,
          baseSize: baseSize,
          amplitude: 2 + Math.random() * 2,
          frequency: 0.8 + Math.random() * 0.4,
          phase: Math.random() * Math.PI * 2,
          originalX: point.x,
          originalY: point.y,
          hexColor: point.color,
          strokeId: stroke.id
        };

        indices.push(this.particles.length);
        this.particles.push(particle);
      }
    }

    return indices;
  }

  private calculateDensityFromBrightness(brightness: number): number {
    return (1 - brightness) * 3;
  }

  private calculateZOffset(curvature: number, brightness: number): number {
    let z = curvature * Z_OFFSET_SCALE;
    z += (Math.random() - 0.5) * (1 - brightness) * 20;
    return Math.max(Z_RANGE_MIN, Math.min(Z_RANGE_MAX, z));
  }

  private calculateStrokeNormals(points: StrokePoint[]): THREE.Vector3[] {
    const normals: THREE.Vector3[] = [];

    for (let i = 0; i < points.length; i++) {
      let tangent: THREE.Vector3;

      if (i === 0) {
        const p0 = points[i];
        const p1 = points[i + 1];
        tangent = new THREE.Vector3(p1.x - p0.x, p0.y - p1.y, 0).normalize();
      } else if (i === points.length - 1) {
        const p0 = points[i - 1];
        const p1 = points[i];
        tangent = new THREE.Vector3(p1.x - p0.x, p0.y - p1.y, 0).normalize();
      } else {
        const p0 = points[i - 1];
        const p1 = points[i];
        const p2 = points[i + 1];
        const t1 = new THREE.Vector3(p1.x - p0.x, p0.y - p1.y, 0);
        const t2 = new THREE.Vector3(p2.x - p1.x, p1.y - p2.y, 0);
        tangent = t1.add(t2).normalize();
      }

      const normal = new THREE.Vector3(-tangent.y, tangent.x, 0);
      if (normal.length() === 0) {
        normal.set(0, 0, 1);
      } else {
        normal.normalize();
      }
      normals.push(normal);
    }

    return normals;
  }

  private updateParticleSystem(): void {
    if (this.points) {
      this.scene.remove(this.points);
      this.points.geometry.dispose();
      (this.points.material as THREE.Material).dispose();
    }

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.particles.length * 3);
    const colors = new Float32Array(this.particles.length * 3);
    const sizes = new Float32Array(this.particles.length);

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      positions[i * 3] = p.originalPosition.x;
      positions[i * 3 + 1] = p.originalPosition.y;
      positions[i * 3 + 2] = p.originalPosition.z;

      colors[i * 3] = p.color.r;
      colors[i * 3 + 1] = p.color.g;
      colors[i * 3 + 2] = p.color.b;

      sizes[i] = p.size;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        pixelRatio: { value: this.renderer.getPixelRatio() }
      },
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        varying float vDistance;
        uniform float pixelRatio;
        
        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vDistance = length(mvPosition.xyz);
          
          float sizeMultiplier = 1.0 + 0.5 * sin(time * 2.0 + position.x * 0.1);
          gl_PointSize = size * pixelRatio * (300.0 / vDistance) * sizeMultiplier;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vDistance;
        
        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          
          if (dist > 0.5) discard;
          
          float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
          float glowIntensity = exp(-dist * 3.0);
          
          float distanceFade = 1.0 - smoothstep(100.0, 400.0, vDistance);
          alpha *= distanceFade;
          
          vec3 finalColor = vColor * (0.7 + 0.3 * glowIntensity);
          gl_FragColor = vec4(finalColor, alpha * 0.9);
        }
      `,
      transparent: true,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.points = new THREE.Points(geometry, material);
    this.points.castShadow = true;
    this.points.receiveShadow = true;
    this.scene.add(this.points);
  }

  public update(deltaTime: number): void {
    this.time += deltaTime;

    if (!this.isDragging && this.points) {
      this.targetRotationY += ROTATION_SPEED * Math.PI / 180 * deltaTime;
    }

    if (this.points) {
      this.points.rotation.y = this.targetRotationY;
    }

    this.updateParticlePositions();
    this.renderer.render(this.scene, this.camera);
  }

  private updateParticlePositions(): void {
    if (!this.points || this.particles.length === 0) return;

    const positions = this.points.geometry.attributes.position.array as Float32Array;
    const sizes = this.points.geometry.attributes.size.array as Float32Array;

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      
      const wave = Math.sin(this.time * p.frequency * Math.PI * 2 + p.phase);
      const displacement = p.normal.clone().multiplyScalar(wave * p.amplitude);
      
      const newPos = p.originalPosition.clone().add(displacement);
      
      positions[i * 3] = newPos.x;
      positions[i * 3 + 1] = newPos.y;
      positions[i * 3 + 2] = newPos.z;

      const sizeMultiplier = 0.5 + 0.5 * (0.5 + 0.5 * wave);
      sizes[i] = p.baseSize * sizeMultiplier;
    }

    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.size.needsUpdate = true;

    if (this.points.material instanceof THREE.ShaderMaterial) {
      this.points.material.uniforms.time.value = this.time;
    }
  }

  private updateParticleCount(): void {
    const count = this.particles.length;
    this.particleCountEl.textContent = count.toString();
    this.onParticleCountChange(count);
  }

  public clear(): void {
    if (this.points) {
      this.scene.remove(this.points);
      this.points.geometry.dispose();
      (this.points.material as THREE.Material).dispose();
      this.points = null;
    }

    this.particles = [];
    this.strokeOrder = [];
    this.strokeParticleMap.clear();
    this.targetRotationY = 0;
    this.hoveredParticleIndex = -1;
    this.hideTooltip();

    this.cameraTheta = 0;
    this.cameraPhi = Math.PI / 4;
    this.cameraDistance = 200;
    this.updateCameraPosition();

    this.updateParticleCount();
  }

  public getParticleCount(): number {
    return this.particles.length;
  }

  public destroy(): void {
    this.clear();
    this.renderer.dispose();
  }
}
