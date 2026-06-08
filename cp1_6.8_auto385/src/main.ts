import * as THREE from 'three';
import { SceneManager } from './SceneManager';
import { ParticleSystem } from './ParticleSystem';
import { InteractionHandler } from './InteractionHandler';
import { ControlPanel } from './ControlPanel';

class App {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private sceneManager: SceneManager;
  private particleSystem: ParticleSystem;
  private interactionHandler: InteractionHandler;
  private clock: THREE.Clock;

  constructor() {
    const container = document.getElementById('app')!;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 1);
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      500
    );
    this.camera.position.set(0, 0, 40);

    this.sceneManager = new SceneManager(this.scene);
    this.particleSystem = new ParticleSystem(this.scene, 3000);
    this.interactionHandler = new InteractionHandler(
      this.camera,
      this.renderer.domElement,
      this.particleSystem
    );
    new ControlPanel(this.particleSystem, this.interactionHandler);

    this.clock = new THREE.Clock();

    window.addEventListener('resize', this.onResize.bind(this));
    this.animate();
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this));
    const delta = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();

    this.interactionHandler.update();
    this.particleSystem.update(
      delta,
      elapsed,
      this.interactionHandler.getMouseWorldPos()
    );
    this.renderer.render(this.scene, this.camera);
  }
}

new App();
