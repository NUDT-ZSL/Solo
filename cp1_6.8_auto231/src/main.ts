import * as THREE from 'three';
import { SceneManager } from './SceneManager';
import { ControlPanel } from './ControlPanel';

class App {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private sceneManager: SceneManager;
  private controlPanel: ControlPanel;
  private clock: THREE.Clock;
  private animationId: number = 0;

  constructor() {
    const container = document.getElementById('app')!;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      200
    );

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 1);
    container.appendChild(this.renderer.domElement);

    const pixelRatio = Math.min(window.devicePixelRatio, 2);

    this.sceneManager = new SceneManager(
      this.scene,
      this.camera,
      this.renderer.domElement,
      pixelRatio
    );

    this.controlPanel = new ControlPanel({
      rayThickness: 1.5,
      particleSpreadSpeed: 1.0,
      onRayThicknessChange: (value) => {
        this.sceneManager.setRayThickness(value);
      },
      onParticleSpreadSpeedChange: (value) => {
        this.sceneManager.setParticleSpreadSpeed(value);
      },
      onReset: () => {
        this.sceneManager.reset();
      },
    });

    this.clock = new THREE.Clock();

    window.addEventListener('resize', this.onResize.bind(this));

    this.fadeIn();
    this.animate();
  }

  private fadeIn(): void {
    const canvas = this.renderer.domElement;
    canvas.style.opacity = '0';
    canvas.style.transition = 'opacity 1.2s ease-out';
    requestAnimationFrame(() => {
      canvas.style.opacity = '1';
    });
  }

  private onResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(this.animate.bind(this));
    const delta = Math.min(this.clock.getDelta(), 0.05);
    const elapsed = this.clock.getElapsedTime();

    this.sceneManager.update(delta, elapsed);
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    cancelAnimationFrame(this.animationId);
    this.sceneManager.dispose();
    this.controlPanel.dispose();
    this.renderer.dispose();
  }
}

new App();
