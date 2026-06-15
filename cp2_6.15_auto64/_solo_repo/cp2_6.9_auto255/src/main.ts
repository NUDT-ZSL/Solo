import * as THREE from 'three';
import { ParticleSystem } from './ParticleSystem';
import { InteractionManager } from './InteractionManager';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private particleSystem: ParticleSystem;
  private interactionManager: InteractionManager;
  private statsElement: HTMLElement | null = null;
  private clock: THREE.Clock;
  private lastTime: number = 0;
  private frameCount: number = 0;
  private fps: number = 0;
  private fpsUpdateTime: number = 0;
  private animationFrameId: number | null = null;

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x05050A);
    this.scene.fog = new THREE.FogExp2(0x05050A, 0.002);

    const container = document.getElementById('canvas-container');
    if (!container) {
      throw new Error('Canvas container not found');
    }

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      2000
    );
    this.camera.position.set(0, 30, 150);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x05050A, 1);
    container.appendChild(this.renderer.domElement);

    this.statsElement = document.getElementById('stats');

    this.particleSystem = new ParticleSystem(this.scene, this.camera);
    this.interactionManager = new InteractionManager(
      this.camera,
      this.renderer,
      this.particleSystem
    );

    this.clock = new THREE.Clock();

    window.addEventListener('resize', this.onResize.bind(this));

    this.animate();
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  private updateStats(): void {
    if (!this.statsElement) return;

    const particleCount = this.particleSystem.getTotalParticleCount();
    this.statsElement.textContent = `粒子: ${particleCount} | FPS: ${this.fps}`;
  }

  private animate(): void {
    this.animationFrameId = requestAnimationFrame(this.animate.bind(this));

    const delta = this.clock.getDelta();
    const deltaTime = delta * 1000;
    const currentTime = performance.now();

    this.frameCount++;
    if (currentTime - this.fpsUpdateTime >= 500) {
      this.fps = Math.round((this.frameCount * 1000) / (currentTime - this.fpsUpdateTime));
      this.frameCount = 0;
      this.fpsUpdateTime = currentTime;
      this.particleSystem.updatePerformanceParams(this.fps);
      this.updateStats();
    }

    this.interactionManager.update();
    this.particleSystem.update(deltaTime);

    this.renderer.render(this.scene, this.camera);
    this.lastTime = currentTime;
  }

  public dispose(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.interactionManager.dispose();
    this.particleSystem.dispose();
    this.renderer.dispose();
    window.removeEventListener('resize', this.onResize.bind(this));
  }
}

let app: App | null = null;

window.addEventListener('DOMContentLoaded', () => {
  try {
    app = new App();
  } catch (error) {
    console.error('Failed to initialize app:', error);
  }
});

window.addEventListener('beforeunload', () => {
  if (app) {
    app.dispose();
  }
});
