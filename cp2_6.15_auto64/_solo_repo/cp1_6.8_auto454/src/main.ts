import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ParticleScene } from './scene';
import { InteractionManager } from './interaction';
import { UIController } from './ui';

class App {
  private renderer: THREE.WebGLRenderer;
  private camera: THREE.PerspectiveCamera;
  private composer: EffectComposer;
  private particleScene: ParticleScene;
  private interaction: InteractionManager;
  private ui: UIController;
  private clock: THREE.Clock;
  private animId: number = 0;

  constructor() {
    const container = document.getElementById('app')!;

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    this.composer = new EffectComposer(this.renderer);
    const renderPass = new RenderPass(this.camera, new THREE.Scene());
    this.composer.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      1.2,
      0.4,
      0.3
    );
    this.composer.addPass(bloomPass);

    this.particleScene = new ParticleScene();
    this.particleScene.init();

    renderPass.scene = this.particleScene.scene;

    this.interaction = new InteractionManager(
      this.camera,
      this.renderer.domElement,
      this.particleScene
    );

    this.ui = new UIController(this.particleScene, this.interaction);

    this.clock = new THREE.Clock();

    window.addEventListener('resize', this.onResize);

    this.hideLoading();
    this.animate();
  }

  private hideLoading() {
    const loading = document.getElementById('loading');
    if (loading) {
      loading.classList.add('fade-out');
      setTimeout(() => loading.remove(), 800);
    }
  }

  private onResize = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;

    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
  };

  private animate = () => {
    this.animId = requestAnimationFrame(this.animate);

    const elapsed = this.clock.getElapsedTime();

    this.interaction.update();
    this.particleScene.update(elapsed, this.camera);
    this.composer.render();
  };

  dispose() {
    cancelAnimationFrame(this.animId);
    window.removeEventListener('resize', this.onResize);
    this.interaction.dispose();
    this.ui.dispose();
    this.particleScene.dispose();
    this.renderer.dispose();
  }
}

new App();
