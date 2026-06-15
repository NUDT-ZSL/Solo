import * as THREE from 'three';
import { ParticleInfo } from './particleSystem';

export type ViewMode = '3D' | '2D';

interface CameraAnimation {
  position: THREE.Vector3;
  target: THREE.Vector3;
}

interface HighlightInfo {
  particleIndex: number;
  windSpeed: number;
  brightnessMultiplier: number;
  startBrightness: number;
  targetBrightness: number;
  transitionProgress: number;
  isHighlighted: Set<number>;
}

class SceneRenderer {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private canvas: HTMLCanvasElement;
  private particlePoints: THREE.Points;
  private particleGeometry: THREE.BufferGeometry;
  private particleMaterial: THREE.PointsMaterial;
  private trailLine: THREE.LineSegments;
  private trailGeometry: THREE.BufferGeometry;
  private trailMaterial: THREE.LineBasicMaterial;
  private gridGroup: THREE.Group;
  private clock: THREE.Clock;
  private cameraAnimation: {
    active: boolean;
    duration: number;
    elapsed: number;
    fromPos: THREE.Vector3;
    toPos: THREE.Vector3;
    fromTarget: THREE.Vector3;
    toTarget: THREE.Vector3;
    easeOut: (t: number) => number;
  } | null = null;
  private viewMode: ViewMode = '3D';
  private defaultCameraPos = new THREE.Vector3(0, 50, 200);
  private defaultCameraTarget = new THREE.Vector3(0, 0, 0);
  private topDownCameraPos = new THREE.Vector3(0, 350, 0.01);
  private topDownCameraTarget = new THREE.Vector3(0, 0, 0);
  private highlightInfo: HighlightInfo = {
    particleIndex: -1,
    windSpeed: 0,
    brightnessMultiplier: 1.0,
    startBrightness: 1.0,
    targetBrightness: 1.0,
    transitionProgress: 0,
    isHighlighted: new Set()
  };
  private originalColors: Float32Array;

  constructor(canvasId: string) {
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    this.scene = new THREE.Scene();
    this.clock = new THREE.Clock();
    this.originalColors = new Float32Array();

    this.setupRenderer();
    this.setupCamera();
    this.setupLighting();
    this.setupBackground();
    this.setupParticleGeometry();
    this.setupTrailGeometry();
    this.setupEarthGrid();
    this.setupResizeHandler();
  }

  private setupRenderer(): void {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
  }

  private setupCamera(): void {
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      2000
    );
    this.camera.position.copy(this.defaultCameraPos);
    this.camera.lookAt(this.defaultCameraTarget);
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(100, 200, 100);
    this.scene.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0x3b82f6, 0.3);
    fillLight.position.set(-100, 100, -100);
    this.scene.add(fillLight);
  }

  private setupBackground(): void {
    const bgCanvas = document.createElement('canvas');
    bgCanvas.width = 2;
    bgCanvas.height = 512;
    const bgCtx = bgCanvas.getContext('2d');
    const gradient = bgCtx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#1e293b');
    gradient.addColorStop(1, '#0b1120');
    bgCtx.fillStyle = gradient;
    bgCtx.fillRect(0, 0, 2, 512);

    const bgTexture = new THREE.CanvasTexture(bgCanvas);
    bgTexture.colorSpace = THREE.SRGBColorSpace;
    this.scene.background = bgTexture;
  }

  private setupParticleGeometry(): void {
    this.particleGeometry = new THREE.BufferGeometry();
    this.particleMaterial = new THREE.PointsMaterial({
      size: 3,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.particlePoints = new THREE.Points(this.particleGeometry, this.particleMaterial);
    this.scene.add(this.particlePoints);
  }

  private setupTrailGeometry(): void {
    this.trailGeometry = new THREE.BufferGeometry();
    this.trailMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.trailLine = new THREE.LineSegments(this.trailGeometry, this.trailMaterial);
    this.scene.add(this.trailLine);
  }

  private setupEarthGrid(): void {
    this.gridGroup = new THREE.Group();
    const radius = 200;
    const gridColor = 0x3b82f6;
    const gridOpacity = 0.3;

    const meridiansMaterial = new THREE.LineBasicMaterial({
      color: gridColor,
      transparent: true,
      opacity: gridOpacity,
      depthWrite: false
    });

    for (let lon = -180; lon <= 180; lon += 15) {
      const points: THREE.Vector3[] = [];
      const lonRad = (lon * Math.PI) / 180;
      for (let lat = -90; lat <= 90; lat += 1) {
        const latRad = (lat * Math.PI) / 180;
        const x = radius * Math.cos(latRad) * Math.cos(lonRad);
        const y = radius * Math.sin(latRad);
        const z = radius * Math.cos(latRad) * Math.sin(lonRad);
        points.push(new THREE.Vector3(x, y, z));
      }
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, meridiansMaterial);
      this.gridGroup.add(line);
    }

    for (let lat = -75; lat <= 75; lat += 15) {
      const points: THREE.Vector3[] = [];
      const latRad = (lat * Math.PI) / 180;
      const r = radius * Math.cos(latRad);
      for (let lon = 0; lon <= 360; lon += 2) {
        const lonRad = (lon * Math.PI) / 180;
        const x = r * Math.cos(lonRad);
        const y = radius * Math.sin(latRad);
        const z = r * Math.sin(lonRad);
        points.push(new THREE.Vector3(x, y, z));
      }
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, meridiansMaterial);
      this.gridGroup.add(line);
    }

    this.gridGroup.rotation.x = Math.PI / 2;
    this.gridGroup.position.y = 50;
    this.scene.add(this.gridGroup);
  }

  private setupResizeHandler(): void {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  public updateParticles(particleData: ParticleInfo[]): void {
    const count = particleData.length;

    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    this.originalColors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const p = particleData[i];
      const idx = i * 3;

      positions[idx] = p.position.x;
      positions[idx + 1] = p.position.y;
      positions[idx + 2] = p.position.z;

      let color = p.color.clone();
      if (this.highlightInfo.isHighlighted.has(i)) {
        color.multiplyScalar(1.5);
        color.r = Math.min(1, color.r);
        color.g = Math.min(1, color.g);
        color.b = Math.min(1, color.b);
      }

      colors[idx] = color.r;
      colors[idx + 1] = color.g;
      colors[idx + 2] = color.b;

      this.originalColors[idx] = p.color.r;
      this.originalColors[idx + 1] = p.color.g;
      this.originalColors[idx + 2] = p.color.b;

      sizes[i] = p.size;
    }

    this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    this.particleGeometry.attributes.position.needsUpdate = true;
    this.particleGeometry.attributes.color.needsUpdate = true;
  }

  public updateTrails(trailData: { positions: Float32Array; colors: Float32Array }): void {
    this.trailGeometry.setAttribute('position', new THREE.BufferAttribute(trailData.positions, 3));
    this.trailGeometry.setAttribute('color', new THREE.BufferAttribute(trailData.colors, 3));
    this.trailGeometry.attributes.position.needsUpdate = true;
    this.trailGeometry.attributes.color.needsUpdate = true;
  }

  public updateHighlights(highlightedIndices: Set<number>): void {
    this.highlightInfo.isHighlighted = highlightedIndices;

    const positionsAttr = this.particleGeometry.getAttribute('position') as THREE.BufferAttribute;
    if (!positionsAttr || !this.originalColors.length) return;

    const count = positionsAttr.count;
    const colors = new Float32Array(count * 3);
    const sizeAttr = this.particleGeometry.getAttribute('size') as THREE.BufferAttribute;

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      let r = this.originalColors[idx];
      let g = this.originalColors[idx + 1];
      let b = this.originalColors[idx + 2];

      if (highlightedIndices.has(i)) {
        r *= 1.5;
        g *= 1.5;
        b *= 1.5;
        r = Math.min(1, r);
        g = Math.min(1, g);
        b = Math.min(1, b);
      }

      colors[idx] = r;
      colors[idx + 1] = g;
      colors[idx + 2] = b;

      if (sizeAttr && highlightedIndices.has(i)) {
        const val = sizeAttr.array[i];
        (sizeAttr.array as Float32Array)[i] = val * 1.3;
      }
    }

    this.particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.particleGeometry.attributes.color.needsUpdate = true;
    if (sizeAttr) {
      sizeAttr.needsUpdate = true;
    }
  }

  public toggleViewMode(): ViewMode {
    if (this.cameraAnimation?.active) return this.viewMode;

    this.viewMode = this.viewMode === '3D' ? '2D' : '3D';

    const fromPos = this.camera.position.clone();
    const toPos = this.viewMode === '3D' ? this.defaultCameraPos.clone() : this.topDownCameraPos.clone();
    const fromTarget = this.defaultCameraTarget.clone();
    const toTarget = this.topDownCameraTarget.clone();

    this.cameraAnimation = {
      active: true,
      duration: 0.6,
      elapsed: 0,
      fromPos,
      toPos,
      fromTarget,
      toTarget,
      easeOut: (t) => this.easeInOutCubic(t)
    };

    return this.viewMode;
  }

  public getViewMode(): ViewMode {
    return this.viewMode;
  }

  public getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  public getScene(): THREE.Scene {
    return this.scene;
  }

  public getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  public getParticlePoints(): THREE.Points {
    return this.particlePoints;
  }

  public renderFrame(): void {
    const deltaTime = this.clock.getDelta();

    if (this.cameraAnimation && this.cameraAnimation.active) {
      this.cameraAnimation.elapsed += deltaTime;
      const anim = this.cameraAnimation;
      const t = Math.min(1, anim.elapsed / anim.duration);
      const eased = anim.easeOut(t);

      this.camera.position.lerpVectors(anim.fromPos, anim.toPos, eased);
      this.camera.lookAt(anim.fromTarget.clone().lerp(anim.toTarget, eased));

      if (t >= 1) {
        this.cameraAnimation.active = false;
      }
    }

    if (this.gridGroup) {
      this.gridGroup.rotation.z += deltaTime * 0.005;
    }

    this.renderer.render(this.scene, this.camera);
  }

  public getDeltaTime(): number {
    return this.clock.getDelta();
  }

  public dispose(): void {
    this.particleGeometry.dispose();
    this.particleMaterial.dispose();
    this.trailGeometry.dispose();
    this.trailMaterial.dispose();
    this.renderer.dispose();
  }
}

let sceneRendererInstance: SceneRenderer | null = null;

export function createSceneRenderer(canvasId: string): SceneRenderer {
  sceneRendererInstance = new SceneRenderer(canvasId);
  return sceneRendererInstance;
}

export function getSceneRenderer(): SceneRenderer | null {
  return sceneRendererInstance;
}

export const sceneRenderer = {
  create: createSceneRenderer,
  get: getSceneRenderer
};
