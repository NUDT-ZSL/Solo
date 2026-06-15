import * as THREE from 'three';
import { SceneManager } from './SceneManager';
import { InteractionController } from './InteractionController';
import { UIPanel } from './UIPanel';

class App {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private sceneManager: SceneManager;
  private interactionController: InteractionController;
  private uiPanel: UIPanel;
  private clock: THREE.Clock;
  private animationId: number = 0;

  constructor() {
    const container = document.getElementById('app')!;

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000, 1);
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 0, 5);

    this.clock = new THREE.Clock();

    this.sceneManager = new SceneManager(this.scene);
    this.interactionController = new InteractionController(
      this.camera,
      this.scene,
      this.renderer.domElement,
      this.sceneManager
    );

    this.uiPanel = new UIPanel(container);
    this.uiPanel.onTidalSpeedChange = (v: number) => {
      this.sceneManager.setTidalSpeed(v);
    };
    this.uiPanel.onBrightnessChange = (v: number) => {
      this.sceneManager.setBrightness(v);
    };
    this.uiPanel.onParticleSpeedChange = (v: number) => {
      this.sceneManager.setParticleSpeed(v);
    };
    this.uiPanel.onGlowToggle = (v: boolean) => {
      this.sceneManager.setGlowEnabled(v);
    };

    this.onResize = this.onResize.bind(this);
    window.addEventListener('resize', this.onResize);

    this.animate = this.animate.bind(this);
    this.animate();
  }

  private onResize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(this.animate);
    const delta = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();
    this.sceneManager.update(elapsed, delta);
    this.interactionController.update();
    this.renderer.render(this.scene, this.camera);
  }
}

new App();
