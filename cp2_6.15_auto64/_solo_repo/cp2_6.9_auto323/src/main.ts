import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ParticleSystem, ColorMode } from './particleSystem';
import { GravityManager } from './gravityManager';
import { UIControls, UIControlParams } from './uiControls';

class App {
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private particleSystem!: ParticleSystem;
  private gravityManager!: GravityManager;
  private uiControls!: UIControls;
  private clock!: THREE.Clock;
  private container!: HTMLElement;
  private toastEl!: HTMLElement;
  private toastTimer: number | null = null;

  constructor() {
    this.init();
    this.animate();
  }

  private init(): void {
    this.container = document.getElementById('canvas-container')!;
    this.toastEl = document.getElementById('event-toast')!;

    this.scene = new THREE.Scene();
    this.scene.background = null;

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      5000
    );
    this.camera.position.set(0, 100, 800);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000, 0);
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 50;
    this.controls.maxDistance = 3000;

    this.clock = new THREE.Clock();

    const urlParams = new URLSearchParams(window.location.search);
    const particleCount = parseInt(urlParams.get('particles') || '9000');
    const safeCount = Math.min(Math.max(particleCount, 1000), 15000);

    this.particleSystem = new ParticleSystem(
      this.scene,
      { maxParticles: safeCount },
      (msg: string) => this.showToast(msg)
    );

    this.gravityManager = new GravityManager(
      this.scene,
      this.camera,
      this.renderer.domElement
    );

    this.uiControls = new UIControls();
    this.uiControls.setParticleCount(this.particleSystem.getActiveCount());
    this.uiControls.subscribe(this.onUIControl.bind(this));

    window.addEventListener('resize', this.onResize.bind(this));
  }

  private onUIControl(params: Partial<UIControlParams> & { __clearGravity?: boolean; __resetParticles?: boolean }): void {
    if (params.__clearGravity) {
      this.gravityManager.clearAllSources();
      return;
    }
    if (params.__resetParticles) {
      this.particleSystem.reset();
      this.uiControls.setParticleCount(this.particleSystem.getActiveCount());
      return;
    }
    if (params.gravityStrength !== undefined) {
      this.gravityManager.setStrength(params.gravityStrength);
    }
    if (params.particleSize !== undefined) {
      this.particleSystem.setBaseSize(params.particleSize);
    }
    if (params.colorMode !== undefined) {
      this.particleSystem.setColorMode(params.colorMode as ColorMode);
    }
  }

  private showToast(msg: string): void {
    this.toastEl.textContent = msg;
    this.toastEl.classList.add('show');

    if (this.toastTimer !== null) {
      window.clearTimeout(this.toastTimer);
    }

    this.toastTimer = window.setTimeout(() => {
      this.toastEl.classList.remove('show');
      this.toastTimer = null;
    }, 3000);
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());

    const dt = Math.min(this.clock.getDelta() * 1000, 50);

    this.controls.update();
    this.gravityManager.update();

    const sources = this.gravityManager.getGravitySources();
    this.particleSystem.update(dt, sources);

    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    this.particleSystem.dispose();
    this.gravityManager.dispose();
    this.controls.dispose();
    this.renderer.dispose();
    window.removeEventListener('resize', this.onResize.bind(this));
    if (this.toastTimer !== null) {
      window.clearTimeout(this.toastTimer);
    }
  }
}

let app: App;

window.addEventListener('DOMContentLoaded', () => {
  app = new App();
});

window.addEventListener('beforeunload', () => {
  if (app) app.dispose();
});
