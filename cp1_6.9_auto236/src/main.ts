import * as THREE from 'three';
import { PrismArray } from './PrizmArray';
import { ParticleSystem } from './ParticleSystem';
import { InteractionController } from './InteractionController';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private container: HTMLElement;

  private prismArray: PrismArray;
  private particleSystem: ParticleSystem;
  private interactionController: InteractionController;

  private clock: THREE.Clock;
  private elapsedTime = 0;
  private isRunning = true;

  private fpsDisplay: HTMLElement | null = null;
  private particleCountDisplay: HTMLElement | null = null;
  private playPauseBtn: HTMLElement | null = null;
  private resetViewBtn: HTMLElement | null = null;

  private lastFpsTime = 0;
  private frameCount = 0;
  private currentFps = 0;

  private animationFrameId: number = 0;

  constructor() {
    this.container = document.getElementById('app') || document.body;
    this.clock = new THREE.Clock();

    this.scene = this.createScene();
    this.camera = this.createCamera();
    this.renderer = this.createRenderer();

    this.setupLights();

    const isMobile = window.innerWidth < 768;

    this.prismArray = new PrismArray(this.scene);
    this.particleSystem = new ParticleSystem(this.scene, this.prismArray, isMobile);
    this.interactionController = new InteractionController(
      this.camera,
      this.container,
      this.prismArray,
      this.particleSystem
    );

    this.setupUI();
    this.setupResizeHandler();

    this.start();
  }

  private createScene(): THREE.Scene {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a1a);
    scene.fog = new THREE.FogExp2(0x0a0a1a, 0.025);
    return scene;
  }

  private createCamera(): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    camera.position.set(8, 3, 15);
    camera.lookAt(0, 0, 0);
    return camera;
  }

  private createRenderer(): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });

    renderer.setPixelRatio(
      Math.min(window.devicePixelRatio, 2)
    );
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    this.container.appendChild(renderer.domElement);

    return renderer;
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0x404060, 0.6);
    this.scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0xff66aa, 1.5, 50, 2);
    pointLight1.position.set(0, 8, 0);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x66aaff, 1.2, 50, 2);
    pointLight2.position.set(-10, -3, 10);
    this.scene.add(pointLight2);

    const pointLight3 = new THREE.PointLight(0xaaff66, 1.0, 50, 2);
    pointLight3.position.set(10, 3, -10);
    this.scene.add(pointLight3);

    const centerLight = new THREE.PointLight(0xffffff, 2.0, 30, 1.5);
    centerLight.position.set(0, 0, 0);
    this.scene.add(centerLight);
  }

  private setupUI(): void {
    this.fpsDisplay = document.getElementById('fps');
    this.particleCountDisplay = document.getElementById('particleCount');
    this.playPauseBtn = document.getElementById('playPauseBtn');
    this.resetViewBtn = document.getElementById('resetViewBtn');

    if (this.playPauseBtn) {
      this.playPauseBtn.addEventListener('click', () => {
        this.togglePlayPause();
      });
    }

    if (this.resetViewBtn) {
      this.resetViewBtn.addEventListener('click', () => {
        this.interactionController.resetView();
      });
    }
  }

  private togglePlayPause(): void {
    this.isRunning = !this.isRunning;
    if (this.playPauseBtn) {
      this.playPauseBtn.textContent = this.isRunning ? '⏸ 暂停' : '▶ 播放';
    }
    if (this.isRunning) {
      this.clock.getDelta();
    }
  }

  private setupResizeHandler(): void {
    window.addEventListener('resize', () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();

      this.renderer.setSize(width, height);
      this.renderer.setPixelRatio(
        Math.min(window.devicePixelRatio, 2)
      );
    });
  }

  private start(): void {
    this.clock.start();
    this.animate();
  }

  private animate = (): void => {
    this.animationFrameId = requestAnimationFrame(this.animate);

    const deltaTime = this.isRunning
      ? Math.min(this.clock.getDelta(), 0.1)
      : 0;

    if (this.isRunning) {
      this.elapsedTime += deltaTime;

      this.prismArray.update(deltaTime, this.elapsedTime);
      this.particleSystem.update(deltaTime, this.elapsedTime);
    }

    this.interactionController.update(deltaTime);

    this.renderer.render(this.scene, this.camera);

    this.updateStats();
  };

  private updateStats(): void {
    this.frameCount++;
    const now = performance.now();

    if (now - this.lastFpsTime >= 500) {
      this.currentFps = Math.round(
        (this.frameCount * 1000) / (now - this.lastFpsTime)
      );
      this.frameCount = 0;
      this.lastFpsTime = now;

      if (this.fpsDisplay) {
        this.fpsDisplay.textContent = `FPS: ${this.currentFps}`;
      }
      if (this.particleCountDisplay) {
        this.particleCountDisplay.textContent = `粒子数: ${this.particleSystem.getActiveCount()}`;
      }
    }
  }

  public dispose(): void {
    cancelAnimationFrame(this.animationFrameId);

    this.prismArray.dispose();
    this.particleSystem.dispose();
    this.interactionController.dispose();

    this.renderer.dispose();

    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(
        this.renderer.domElement
      );
    }
  }
}

let app: App | null = null;

document.addEventListener('DOMContentLoaded', () => {
  app = new App();
});

window.addEventListener('beforeunload', () => {
  if (app) {
    app.dispose();
    app = null;
  }
});
