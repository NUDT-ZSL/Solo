import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { FoldSimulator } from './foldSimulator';

const CANVAS_WIDTH = 980;
const CANVAS_HEIGHT = 700;
const DEFAULT_CAMERA_THETA = Math.PI * 0.25;
const DEFAULT_CAMERA_PHI = Math.PI * 0.4;
const DEFAULT_CAMERA_DISTANCE = 4.5;

class App {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private foldSimulator: FoldSimulator;
  private clock: THREE.Clock;
  private isAnimatingCamera: boolean = false;
  private cameraAnimStart: { theta: number; phi: number; distance: number; } | null = null;
  private cameraAnimEnd: { theta: number; phi: number; distance: number; } | null = null;
  private cameraAnimProgress: number = 0;
  private cameraAnimDuration: number = 0.5;
  private progressSlider!: HTMLInputElement;
  private progressValueSpan!: HTMLElement;
  private modelButtons!: NodeListOf<HTMLButtonElement>;
  private currentModel: string = 'crane';

  constructor() {
    const container = document.getElementById('canvas-container');
    if (!container) {
      throw new Error('Canvas container not found');
    }

    this.scene = new THREE.Scene();

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(CANVAS_WIDTH, CANVAS_HEIGHT);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(
      45,
      CANVAS_WIDTH / CANVAS_HEIGHT,
      0.1,
      100
    );
    this.setCameraPosition(DEFAULT_CAMERA_THETA, DEFAULT_CAMERA_PHI, DEFAULT_CAMERA_DISTANCE);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.1;
    this.controls.enablePan = false;
    this.controls.minDistance = 2;
    this.controls.maxDistance = 10;
    this.controls.target.set(0, 0, 0);
    this.controls.update();

    this.setupLights();
    this.foldSimulator = new FoldSimulator(this.scene);
    this.clock = new THREE.Clock();

    this.setupUI();
    this.animate();
  }

  private setCameraPosition(theta: number, phi: number, distance: number): void {
    const x = distance * Math.sin(phi) * Math.sin(theta);
    const y = distance * Math.cos(phi);
    const z = distance * Math.sin(phi) * Math.cos(theta);
    this.camera.position.set(x, y, z);
    this.camera.lookAt(0, 0, 0);
  }

  private getCameraSpherical(): { theta: number; phi: number; distance: number } {
    const pos = this.camera.position;
    const distance = pos.length();
    const phi = Math.acos(Math.max(-1, Math.min(1, pos.y / distance)));
    const theta = Math.atan2(pos.x, pos.z);
    return { theta, phi, distance };
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0xE6E0D0, 0.4);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xFFFBE6, 0.8);
    dirLight.position.set(-3, 4, 2);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 20;
    dirLight.shadow.camera.left = -3;
    dirLight.shadow.camera.right = 3;
    dirLight.shadow.camera.top = 3;
    dirLight.shadow.camera.bottom = -3;
    dirLight.shadow.bias = -0.0005;
    this.scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0xE6E0D0, 0.25);
    fillLight.position.set(2, 2, -2);
    this.scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xD4C4A8, 0.15);
    rimLight.position.set(0, -2, -3);
    this.scene.add(rimLight);
  }

  private setupUI(): void {
    this.progressSlider = document.getElementById('fold-slider') as HTMLInputElement;
    this.progressValueSpan = document.getElementById('progress-value') as HTMLElement;
    this.modelButtons = document.querySelectorAll('.model-btn') as NodeListOf<HTMLButtonElement>;

    if (this.progressSlider) {
      this.progressSlider.addEventListener('input', (e: Event) => {
        const target = e.target as HTMLInputElement;
        const value = parseInt(target.value, 10);
        this.foldSimulator.setFoldProgress(value / 100);
        this.updateProgressDisplay(value);
      });
    }

    this.modelButtons.forEach((btn: HTMLButtonElement) => {
      btn.addEventListener('click', () => {
        const modelName = btn.dataset.model;
        if (modelName && modelName !== this.currentModel) {
          this.switchModel(modelName);
        }
      });
    });
  }

  private switchModel(modelName: string): void {
    this.currentModel = modelName;

    this.modelButtons.forEach((btn: HTMLButtonElement) => {
      if (btn.dataset.model === modelName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    this.foldSimulator.loadModel(modelName);
    this.foldSimulator.setFoldProgress(0);
    if (this.progressSlider) {
      this.progressSlider.value = '0';
    }
    this.updateProgressDisplay(0);

    this.startCameraResetAnimation();
  }

  private startCameraResetAnimation(): void {
    const current = this.getCameraSpherical();
    this.cameraAnimStart = current;
    this.cameraAnimEnd = {
      theta: DEFAULT_CAMERA_THETA,
      phi: DEFAULT_CAMERA_PHI,
      distance: DEFAULT_CAMERA_DISTANCE
    };
    this.cameraAnimProgress = 0;
    this.isAnimatingCamera = true;
    this.controls.enabled = false;
  }

  private updateCameraAnimation(dt: number): void {
    if (!this.isAnimatingCamera || !this.cameraAnimStart || !this.cameraAnimEnd) {
      return;
    }

    this.cameraAnimProgress = Math.min(1, this.cameraAnimProgress + dt / this.cameraAnimDuration);
    
    let t = this.cameraAnimProgress;
    t = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

    const theta = this.lerpAngle(this.cameraAnimStart.theta, this.cameraAnimEnd.theta, t);
    const phi = this.lerp(this.cameraAnimStart.phi, this.cameraAnimEnd.phi, t);
    const distance = this.lerp(this.cameraAnimStart.distance, this.cameraAnimEnd.distance, t);

    this.setCameraPosition(theta, phi, distance);

    if (this.cameraAnimProgress >= 1) {
      this.isAnimatingCamera = false;
      this.controls.enabled = true;
      this.controls.update();
    }
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  private lerpAngle(a: number, b: number, t: number): number {
    let diff = b - a;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    return a + diff * t;
  }

  private updateProgressDisplay(value: number): void {
    if (this.progressValueSpan) {
      this.progressValueSpan.textContent = value.toString();
    }
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);
    const dt = this.clock.getDelta();

    if (this.isAnimatingCamera) {
      this.updateCameraAnimation(dt);
    } else {
      this.controls.update();
    }

    this.renderer.render(this.scene, this.camera);
  };

  public dispose(): void {
    this.foldSimulator.dispose();
    this.renderer.dispose();
    this.controls.dispose();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  try {
    new App();
  } catch (e) {
    console.error('Failed to initialize app:', e);
  }
});
