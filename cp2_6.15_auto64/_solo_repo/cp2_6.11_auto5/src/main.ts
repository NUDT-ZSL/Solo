import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';
import { Kaleidoscope } from './kaleidoscope';
import { InteractionController } from './interaction';

class App {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private composer: EffectComposer;
  private outlinePass: OutlinePass;

  private kaleidoscope: Kaleidoscope;
  private interaction: InteractionController;

  private clock: THREE.Clock;
  private animationId: number = 0;
  private loadingOverlay: HTMLElement;

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.loadingOverlay = document.getElementById('loading')!;
    this.clock = new THREE.Clock();

    this.scene = new THREE.Scene();

    const fov = 50;
    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 100);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.container.appendChild(this.renderer.domElement);

    this.composer = new EffectComposer(this.renderer);
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    this.outlinePass = new OutlinePass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      this.scene,
      this.camera
    );
    this.outlinePass.edgeStrength = 3;
    this.outlinePass.edgeGlow = 0.8;
    this.outlinePass.edgeThickness = 2;
    this.outlinePass.pulsePeriod = 0;
    this.outlinePass.visibleEdgeColor.set(0xffffff);
    this.outlinePass.hiddenEdgeColor.set(0xffffff);
    this.composer.addPass(this.outlinePass);

    this.kaleidoscope = new Kaleidoscope();
    this.scene.add(this.kaleidoscope.group);

    this.interaction = new InteractionController(
      this.camera,
      this.kaleidoscope,
      this.renderer.domElement
    );

    this.setupLights();
    this.bindEvents();
    this.start();

    setTimeout(() => {
      this.loadingOverlay.classList.add('hidden');
      setTimeout(() => {
        this.loadingOverlay.style.display = 'none';
      }, 800);
    }, 600);
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0x404060, 0.6);
    this.scene.add(ambientLight);

    const warmLight = new THREE.DirectionalLight(0xffaa66, 0.5);
    warmLight.position.set(3, 4, 2);
    this.scene.add(warmLight);

    const coolLight = new THREE.DirectionalLight(0x66aaff, 0.4);
    coolLight.position.set(-3, -2, -4);
    this.scene.add(coolLight);

    const rimLight = new THREE.DirectionalLight(0x9966ff, 0.3);
    rimLight.position.set(0, 2, -5);
    this.scene.add(rimLight);
  }

  private bindEvents(): void {
    window.addEventListener('resize', this.onResize);
  }

  private onResize = (): void => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    this.composer.setSize(width, height);
    this.outlinePass.setSize(width, height);
  };

  private start(): void {
    this.animate();
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);

    const deltaTime = this.clock.getDelta();

    this.interaction.update(deltaTime, this.kaleidoscope.getMeshes());
    this.kaleidoscope.update(deltaTime, this.camera.position);

    const hovered = this.interaction.getHoveredMesh();
    if (hovered) {
      this.outlinePass.selectedObjects = [hovered];
    } else {
      this.outlinePass.selectedObjects = [];
    }

    this.composer.render();
  };

  public dispose(): void {
    cancelAnimationFrame(this.animationId);
    window.removeEventListener('resize', this.onResize);

    this.interaction.dispose();
    this.kaleidoscope.dispose();

    this.renderer.dispose();
    this.composer.dispose();

    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}

let app: App | null = null;

window.addEventListener('DOMContentLoaded', () => {
  app = new App();
});

declare global {
  interface ImportMeta {
    hot?: {
      dispose(callback: () => void): void;
    };
  }
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    if (app) {
      app.dispose();
      app = null;
    }
  });
}
