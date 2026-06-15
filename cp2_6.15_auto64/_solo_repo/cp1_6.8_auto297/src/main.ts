import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ParticleSystem } from './ParticleSystem';
import { EnergyInjector } from './EnergyInjector';
import { TrailRenderer } from './TrailRenderer';
import { UIManager } from './UIManager';
import {
  CAMERA_FOV,
  CAMERA_NEAR,
  CAMERA_FAR,
  CAMERA_INITIAL_POS,
  BG_COLOR_TOP,
  BG_COLOR_BOTTOM,
} from './constants';

class EntropyMist {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private particleSystem: ParticleSystem;
  private energyInjector: EnergyInjector;
  private trailRenderer: TrailRenderer;
  private uiManager: UIManager;
  private clock: THREE.Clock;
  private animationId: number;

  constructor() {
    const container = document.getElementById('app')!;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(BG_COLOR_BOTTOM);
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(BG_COLOR_BOTTOM, 0.015);

    this.camera = new THREE.PerspectiveCamera(
      CAMERA_FOV,
      window.innerWidth / window.innerHeight,
      CAMERA_NEAR,
      CAMERA_FAR,
    );
    this.camera.position.set(CAMERA_INITIAL_POS.x, CAMERA_INITIAL_POS.y, CAMERA_INITIAL_POS.z);
    this.camera.lookAt(0, 0, 0);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 4;
    this.controls.maxDistance = 40;
    this.controls.enablePan = false;
    this.controls.autoRotate = false;
    this.controls.rotateSpeed = 0.6;
    this.controls.zoomSpeed = 0.8;

    this.createBackground();
    this.particleSystem = new ParticleSystem();
    this.scene.add(this.particleSystem.mesh);

    this.trailRenderer = new TrailRenderer(this.particleSystem);
    this.scene.add(this.trailRenderer.mesh);

    this.energyInjector = new EnergyInjector(this.particleSystem, this.scene, this.camera);

    this.uiManager = new UIManager();
    this.uiManager.setDiffusionChangeCallback((v) => this.particleSystem.setDiffusionRate(v));
    this.uiManager.setInjectionChangeCallback((v) => this.energyInjector.setInjectionStrength(v));
    this.uiManager.setResetCallback(() => {
      this.particleSystem.reset();
    });

    this.clock = new THREE.Clock();
    this.animationId = 0;

    this.bindEvents();
    this.animate();
  }

  private createBackground(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, `#${BG_COLOR_TOP.toString(16).padStart(6, '0')}`);
    gradient.addColorStop(1, `#${BG_COLOR_BOTTOM.toString(16).padStart(6, '0')}`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);

    const texture = new THREE.CanvasTexture(canvas);
    texture.mapping = THREE.EquirectangularReflectionMapping;
    this.scene.background = texture;
  }

  private bindEvents(): void {
    let pointerDownHandled = false;

    this.renderer.domElement.addEventListener('pointerdown', (e) => {
      pointerDownHandled = false;
      const startX = e.clientX;
      const startY = e.clientY;

      const onMove = (moveEvent: PointerEvent) => {
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;
        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
          pointerDownHandled = true;
        }
      };

      const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);

        if (!pointerDownHandled) {
          this.energyInjector.onPointerDown(e, this.renderer.domElement);
        }
        this.energyInjector.onPointerUp();
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    });

    window.addEventListener('resize', () => this.onResize());
  }

  private onResize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(() => this.animate());

    const dt = Math.min(this.clock.getDelta(), 0.05);
    const time = this.clock.elapsedTime;

    this.particleSystem.update(dt, time);
    this.trailRenderer.update();
    this.energyInjector.update(dt);
    this.controls.update();

    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    cancelAnimationFrame(this.animationId);
    this.particleSystem.dispose();
    this.trailRenderer.dispose();
    this.energyInjector.dispose();
    this.uiManager.dispose();
    this.controls.dispose();
    this.renderer.dispose();
  }
}

new EntropyMist();
