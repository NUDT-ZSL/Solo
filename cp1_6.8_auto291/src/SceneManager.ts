import * as THREE from 'three';
import { CONFIG, ThemeName } from './config';
import { ParticleSystem } from './ParticleSystem';
import { InteractionController, InteractionState } from './InteractionController';

export class SceneManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private particleSystem: ParticleSystem;
  private interactionController: InteractionController;
  private clock: THREE.Clock;
  private speedMultiplier = 1.0;
  private animationId = 0;

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x020108);
    this.scene.fog = new THREE.FogExp2(0x020108, 0.008);

    this.camera = new THREE.PerspectiveCamera(
      CONFIG.camera.fov,
      window.innerWidth / window.innerHeight,
      CONFIG.camera.near,
      CONFIG.camera.far
    );
    this.camera.position.set(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    document.body.appendChild(this.renderer.domElement);

    this.particleSystem = new ParticleSystem(this.scene);

    this.interactionController = new InteractionController(
      this.camera,
      this.renderer.domElement,
      (origin) => this.particleSystem.triggerShock(origin)
    );

    this.clock = new THREE.Clock();

    window.addEventListener('resize', () => this.onResize());
  }

  start(): void {
    this.animate();
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(() => this.animate());

    const delta = Math.min(this.clock.getDelta(), 0.1);
    const state = this.interactionController.update(delta);

    this.particleSystem.update(delta, state.cameraZ, this.speedMultiplier, state.idleFactor);

    this.renderer.render(this.scene, this.camera);
  }

  onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  setSpeed(value: number): void {
    this.speedMultiplier = value;
  }

  setDensity(value: number): void {
    this.particleSystem.setDensity(value);
  }

  setTheme(theme: ThemeName): void {
    this.particleSystem.setTheme(theme);
  }

  resetView(): void {
    this.interactionController.resetView();
  }

  dispose(): void {
    cancelAnimationFrame(this.animationId);
    this.particleSystem.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
