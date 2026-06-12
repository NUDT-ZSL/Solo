import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { WaveModel } from './WaveModel';
import { ParticleGrid } from './ParticleGrid';
import { UIControl, ParamKey } from './UIControl';

const GRID_SIZE = 400;
const PARTICLE_SPACING = 8;
const AUTO_ROTATE_SPEED = (12 * Math.PI) / 180;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3.0;
const CAMERA_BASE_DISTANCE = 300;
const QUALITY_THRESHOLD = 3000;
const FPS_SAMPLE_WINDOW = 500;
const MIN_ACCEPTABLE_FPS = 30;
const RIPPLE_DRAG_THROTTLE_MS = 40;

class WaveFieldApp {
  private container: HTMLElement;
  private canvas: HTMLCanvasElement;

  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private composer!: EffectComposer;

  private model!: WaveModel;
  private particleGrid!: ParticleGrid;
  private uiControl!: UIControl;

  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private pointerNDC: THREE.Vector2 = new THREE.Vector2();
  private waterPlane: THREE.Plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private hitPoint: THREE.Vector3 = new THREE.Vector3();

  private isPointerDown = false;
  private isRotating = false;
  private pointerDownX = 0;
  private pointerDownY = 0;
  private lastRippleTime = 0;

  private cameraYaw = 0;
  private cameraPitch = 0.45;
  private cameraDistance = CAMERA_BASE_DISTANCE;
  private baseYaw = 0;

  private lastFrameTime = 0;
  private fpsAccumulator = 0;
  private fpsFrameCount = 0;
  private currentFPS = 60;
  private qualityLevel: 'high' | 'low' = 'high';

  private animationFrameId = 0;
  private startTime = 0;

  constructor(containerId: string, canvasId: string) {
    const container = document.getElementById(containerId);
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
    if (!container || !canvas) {
      throw new Error('Failed to find container or canvas element');
    }
    this.container = container;
    this.canvas = canvas;

    this.init();
    this.bindEvents();
    this.start();
  }

  private init(): void {
    this.scene = new THREE.Scene();

    const bgCanvas = document.createElement('canvas');
    bgCanvas.width = 2;
    bgCanvas.height = 256;
    const bgCtx = bgCanvas.getContext('2d')!;
    const grad = bgCtx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#0c1929');
    grad.addColorStop(1, '#1a3a5c');
    bgCtx.fillStyle = grad;
    bgCtx.fillRect(0, 0, 2, 256);
    const bgTexture = new THREE.CanvasTexture(bgCanvas);
    bgTexture.colorSpace = THREE.SRGBColorSpace;
    this.scene.background = bgTexture;

    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 5000);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x0c1929, 0);

    this.initLights();
    this.initPostProcessing();

    this.model = new WaveModel();
    this.particleGrid = new ParticleGrid(GRID_SIZE, PARTICLE_SPACING);
    this.scene.add(this.particleGrid.points);

    this.uiControl = new UIControl(this.container);
    this.uiControl.onParamChange = (key: ParamKey, value: number) => {
      this.model.setParams({ [key]: value });
    };

    this.applyCameraTransform();
  }

  private initLights(): void {
    const ambient = new THREE.AmbientLight(0x88aacc, 0.55);
    this.scene.add(ambient);

    const keyLight = new THREE.PointLight(0x7dd3fc, 1.2, 1200, 2);
    keyLight.position.set(0, 260, 160);
    this.scene.add(keyLight);

    const fillLight = new THREE.PointLight(0x38bdf8, 0.7, 1000, 2);
    fillLight.position.set(-220, 120, -120);
    this.scene.add(fillLight);
  }

  private initPostProcessing(): void {
    const size = new THREE.Vector2(window.innerWidth, window.innerHeight);

    this.composer = new EffectComposer(this.renderer);
    this.composer.setSize(window.innerWidth, window.innerHeight);
    this.composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(size, 0.7, 0.55, 0.28);
    this.composer.addPass(bloomPass);
  }

  private applyCameraTransform(): void {
    const r = this.cameraDistance;
    const yaw = this.cameraYaw + this.baseYaw;
    const pitch = this.cameraPitch;
    const x = r * Math.sin(yaw) * Math.cos(pitch);
    const y = r * Math.sin(pitch);
    const z = r * Math.cos(yaw) * Math.cos(pitch);
    this.camera.position.set(x, y + 60, z);
    this.camera.lookAt(0, 0, 0);
  }

  private bindEvents(): void {
    window.addEventListener('resize', this.onResize);
    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    this.canvas.addEventListener('wheel', this.onWheel, { passive: false });
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private onResize = (): void => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
  };

  private getWorldPointOnWater(clientX: number, clientY: number): THREE.Vector3 | null {
    const rect = this.canvas.getBoundingClientRect();
    this.pointerNDC.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointerNDC.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointerNDC, this.camera);
    if (this.raycaster.ray.intersectPlane(this.waterPlane, this.hitPoint)) {
      const half = GRID_SIZE / 2;
      if (
        this.hitPoint.x >= -half &&
        this.hitPoint.x <= half &&
        this.hitPoint.z >= -half &&
        this.hitPoint.z <= half
      ) {
        return this.hitPoint.clone();
      }
    }
    return null;
  }

  private onPointerDown = (e: PointerEvent): void => {
    this.isPointerDown = true;
    this.isRotating = false;
    this.pointerDownX = e.clientX;
    this.pointerDownY = e.clientY;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);

    if (e.button === 0) {
      const pt = this.getWorldPointOnWater(e.clientX, e.clientY);
      if (pt) {
        const now = performance.now();
        this.model.addRipple(pt.x, pt.z, now - this.startTime);
        this.lastRippleTime = now;
      }
    }
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (!this.isPointerDown) return;

    const dx = e.clientX - this.pointerDownX;
    const dy = e.clientY - this.pointerDownY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (!this.isRotating) {
      if (dist > 6) {
        this.isRotating = true;
      } else {
        return;
      }
    }

    this.cameraYaw -= dx * 0.005;
    this.cameraPitch += dy * 0.004;
    this.cameraPitch = Math.max(0.08, Math.min(1.3, this.cameraPitch));
    this.pointerDownX = e.clientX;
    this.pointerDownY = e.clientY;

    const now = performance.now();
    if (now - this.lastRippleTime > RIPPLE_DRAG_THROTTLE_MS) {
      const pt = this.getWorldPointOnWater(e.clientX, e.clientY);
      if (pt) {
        this.model.addRipple(pt.x, pt.z, now - this.startTime);
        this.lastRippleTime = now;
      }
    }
  };

  private onPointerUp = (_e: PointerEvent): void => {
    this.isPointerDown = false;
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 1.12 : 1 / 1.12;
    const targetDistance = this.cameraDistance * factor;
    const minDist = CAMERA_BASE_DISTANCE * MIN_ZOOM;
    const maxDist = CAMERA_BASE_DISTANCE * MAX_ZOOM;
    this.cameraDistance = Math.max(minDist, Math.min(maxDist, targetDistance));
  };

  private updateFPS(dt: number): void {
    this.fpsAccumulator += dt;
    this.fpsFrameCount++;
    if (this.fpsAccumulator >= FPS_SAMPLE_WINDOW) {
      this.currentFPS = (this.fpsFrameCount * 1000) / this.fpsAccumulator;
      this.fpsAccumulator = 0;
      this.fpsFrameCount = 0;
      this.enforceQualityPolicy();
    }
  }

  private enforceQualityPolicy(): void {
    const overBudget =
      this.particleGrid.particleCount > QUALITY_THRESHOLD ||
      this.currentFPS < MIN_ACCEPTABLE_FPS;
    const newLevel: 'high' | 'low' = overBudget ? 'low' : 'high';
    if (newLevel !== this.qualityLevel) {
      this.qualityLevel = newLevel;
      this.particleGrid.setQualityLevel(this.qualityLevel);
    }
  }

  private start(): void {
    this.startTime = performance.now();
    this.lastFrameTime = this.startTime;
    this.animate();
  }

  private animate = (): void => {
    this.animationFrameId = requestAnimationFrame(this.animate);

    const now = performance.now();
    const dt = now - this.lastFrameTime;
    this.lastFrameTime = now;
    const elapsed = now - this.startTime;

    this.updateFPS(dt);

    if (!this.isRotating) {
      this.baseYaw += AUTO_ROTATE_SPEED * (dt / 1000);
    }
    this.applyCameraTransform();

    this.model.update(elapsed);
    this.particleGrid.update(this.model, elapsed);

    this.composer.render();
  };

  public dispose(): void {
    cancelAnimationFrame(this.animationFrameId);
    window.removeEventListener('resize', this.onResize);
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('wheel', this.onWheel);
    this.particleGrid.geometry.dispose();
    this.particleGrid.material.dispose();
    this.renderer.dispose();
    this.composer.dispose();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new WaveFieldApp('app', 'scene-canvas');
});
