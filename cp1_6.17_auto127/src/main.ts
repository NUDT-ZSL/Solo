import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { LightingModule } from './lighting-module';
import { SceneModule } from './scene-module';
import { UIModule } from './ui-module';

class App {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private clock: THREE.Clock;

  private lightingModule: LightingModule;
  private sceneModule: SceneModule;
  private uiModule: UIModule;

  private animationId: number | null = null;

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.scene = new THREE.Scene();
    this.clock = new THREE.Clock();

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(1.5, 1.8, 2.5);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.3;

    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.target.set(0, 1.2, -1.5);
    this.controls.minDistance = 2;
    this.controls.maxDistance = 15;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.05;

    this.setupBackground();

    this.lightingModule = new LightingModule(this.scene);
    this.sceneModule = new SceneModule(this.scene);
    this.uiModule = new UIModule();

    this.bindUIEvents();
    this.bindResizeEvent();
    this.start();
  }

  private setupBackground(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 256);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(1, '#E0F0FF');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 256);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    const backgroundGeo = new THREE.SphereGeometry(50, 32, 32);
    const backgroundMat = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.BackSide
    });
    const backgroundMesh = new THREE.Mesh(backgroundGeo, backgroundMat);
    this.scene.add(backgroundMesh);
  }

  private bindUIEvents(): void {
    document.addEventListener('uiTimeChanged', ((e: CustomEvent) => {
      this.lightingModule.setTimeOfDay(e.detail.time);
    }) as EventListener);

    document.addEventListener('uiColorTempChanged', ((e: CustomEvent) => {
      this.lightingModule.setColorTemp(e.detail.temp);
    }) as EventListener);

    document.addEventListener('uiIntensityChanged', ((e: CustomEvent) => {
      this.lightingModule.setIntensity(e.detail.intensity);
    }) as EventListener);
  }

  private bindResizeEvent(): void {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  private start(): void {
    this.animate();
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);

    const delta = this.clock.getDelta();

    this.controls.update();
    this.sceneModule.update(delta);

    this.renderer.render(this.scene, this.camera);
  };

  dispose(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }
    this.renderer.dispose();
    this.controls.dispose();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
