import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import Stats from 'stats.js';

import { AppManager } from './AppManager';

class GameApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private composer: EffectComposer;
  private bloomPass: UnrealBloomPass;
  private container: HTMLElement;
  private appManager: AppManager;
  private clock: THREE.Clock;
  private stats: Stats;
  private fpsCheckTimer: number = 0;
  private fpsCheckInterval: number = 5;
  private lowFpsTriggered: boolean = false;
  private frameCount: number = 0;
  private running: boolean = true;

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.clock = new THREE.Clock();

    this.scene = this.createScene();
    this.camera = this.createCamera();
    this.renderer = this.createRenderer();
    this.controls = this.createControls();
    this.composer = this.createComposer();
    this.bloomPass = this.createBloomPass();
    this.stats = this.createStats();

    this.appManager = new AppManager(this.scene, this.camera, this.container);
    this.appManager.setBloomPass(this.bloomPass);

    this.setupEventListeners();
    this.animate();
  }

  private createScene(): THREE.Scene {
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a0620, 0.015);

    const ambientLight = new THREE.AmbientLight(0x404080, 0.4);
    scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0x8866ff, 1.5, 30);
    pointLight1.position.set(5, 8, 5);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xff66cc, 1, 25);
    pointLight2.position.set(-6, 4, -4);
    scene.add(pointLight2);

    return scene;
  }

  private createCamera(): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );

    const distance = 20;
    const angleY = Math.PI / 4;
    camera.position.set(
      distance * Math.sin(angleY) * Math.cos(0),
      distance * Math.cos(angleY),
      distance * Math.sin(angleY) * Math.sin(0)
    );
    camera.lookAt(0, 1, 0);

    return camera;
  }

  private createRenderer(): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.container.appendChild(renderer.domElement);
    return renderer;
  }

  private createControls(): OrbitControls {
    const controls = new OrbitControls(this.camera, this.renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.enablePan = false;
    controls.minDistance = 5;
    controls.maxDistance = 30;
    controls.maxPolarAngle = Math.PI * 0.85;
    controls.minPolarAngle = Math.PI * 0.1;
    controls.target.set(0, 1, 0);
    return controls;
  }

  private createComposer(): EffectComposer {
    const composer = new EffectComposer(this.renderer);
    
    const renderPass = new RenderPass(this.scene, this.camera);
    composer.addPass(renderPass);

    return composer;
  }

  private createBloomPass(): UnrealBloomPass {
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.6,
      0.8,
      0.3
    );
    this.composer.addPass(bloomPass);
    return bloomPass;
  }

  private createStats(): Stats {
    const stats = new Stats();
    stats.showPanel(0);
    const statsContainer = document.getElementById('stats-container')!;
    statsContainer.appendChild(stats.dom);
    return stats;
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.onWindowResize);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('beforeunload', this.onBeforeUnload);
  }

  private onWindowResize = (): void => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    this.composer.setSize(width, height);
    this.bloomPass.setSize(width, height);
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') {
      this.running = false;
    }
  };

  private onBeforeUnload = (): void => {
    this.dispose();
  };

  private checkFpsPerformance(deltaTime: number): void {
    this.fpsCheckTimer += deltaTime;
    this.frameCount++;

    if (this.fpsCheckTimer >= this.fpsCheckInterval) {
      const avgFps = this.frameCount / this.fpsCheckTimer;
      
      if (avgFps < 50 && !this.lowFpsTriggered) {
        console.warn(`Low FPS detected: ${avgFps.toFixed(1)}. Reducing quality...`);
        this.lowFpsTriggered = true;
        this.appManager.handleLowFps();
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      }

      this.fpsCheckTimer = 0;
      this.frameCount = 0;
    }
  }

  private animate = (): void => {
    if (!this.running) return;

    requestAnimationFrame(this.animate);

    const deltaTime = Math.min(this.clock.getDelta(), 0.05);

    this.stats.begin();

    this.controls.update();
    this.appManager.update(deltaTime);
    this.composer.render();

    this.checkFpsPerformance(deltaTime);

    this.stats.end();
  };

  private dispose(): void {
    window.removeEventListener('resize', this.onWindowResize);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('beforeunload', this.onBeforeUnload);

    this.appManager.dispose();
    this.controls.dispose();
    this.renderer.dispose();
    this.composer.dispose();
    this.bloomPass.dispose?.();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new GameApp();
});
