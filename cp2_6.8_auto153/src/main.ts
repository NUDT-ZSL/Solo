import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { FluidSystem, type FluidMode, type FluidParams } from './fluidSystem';
import { UIControls } from './uiControls';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private fluidSystem: FluidSystem;
  private uiControls: UIControls;
  private clock: THREE.Clock;
  private fpsCounter: HTMLElement;
  private frameCount = 0;
  private lastFpsUpdate = 0;

  constructor() {
    const container = document.getElementById('canvas-container')!;
    this.fpsCounter = document.getElementById('fps-counter')!;

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 3, 10);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000, 0);
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 3;
    this.controls.maxDistance = 30;
    this.controls.enablePan = true;
    this.controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN
    };

    this.fluidSystem = new FluidSystem();
    this.scene.add(this.fluidSystem.points);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    this.uiControls = new UIControls();
    this.uiControls.onParamChange = (key, value) => this.handleParamChange(key, value);
    this.fluidSystem.onModeChange = (name) => this.uiControls.showModeTitle(name);

    this.clock = new THREE.Clock();

    window.addEventListener('resize', () => this.handleResize());
  }

  private handleParamChange(key: keyof FluidParams, value: number | FluidMode): void {
    if (key === 'mode') {
      this.fluidSystem.setMode(value as FluidMode);
    } else {
      (this.fluidSystem.params as unknown as Record<string, number | FluidMode>)[key] = value;
    }
  }

  private handleResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private updateFPS(now: number): void {
    this.frameCount++;
    if (now - this.lastFpsUpdate >= 500) {
      const fps = Math.round((this.frameCount * 1000) / (now - this.lastFpsUpdate));
      this.fpsCounter.textContent = `${fps} FPS`;
      this.frameCount = 0;
      this.lastFpsUpdate = now;
    }
  }

  public animate(): void {
    requestAnimationFrame(() => this.animate());

    const dt = this.clock.getDelta();
    const now = performance.now();

    this.controls.update();
    this.fluidSystem.update(dt, now);
    this.updateFPS(now);

    this.renderer.render(this.scene, this.camera);
  }

  public start(): void {
    this.lastFpsUpdate = performance.now();
    this.animate();
  }
}

const app = new App();
app.start();
