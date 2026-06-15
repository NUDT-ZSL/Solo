import * as THREE from 'three';
import { GUI } from 'dat.gui';
import { AssetManager, GardenAssets } from './AssetManager';
import { ParticleSystem } from './ParticleSystem';
import { SeasonController, SeasonState } from './SeasonController';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private clock: THREE.Clock;
  private assetManager: AssetManager;
  private assets!: GardenAssets;
  private particleSystem!: ParticleSystem;
  private seasonController!: SeasonController;
  private container: HTMLElement;

  private isDragging: boolean = false;
  private prevMouseX: number = 0;
  private prevMouseY: number = 0;
  private cameraTheta: number = Math.PI * 0.25;
  private cameraPhi: number = Math.PI * 0.3;
  private cameraDistance: number = 10;
  private cameraTarget: THREE.Vector3 = new THREE.Vector3(0, 2, 0);

  private statSeason!: HTMLElement;
  private statCanopy!: HTMLElement;
  private statGrass!: HTMLElement;
  private statSky!: HTMLElement;
  private statParticles!: HTMLElement;
  private slider!: HTMLInputElement;
  private seasonLabel!: HTMLElement;

  private gui: GUI;

  constructor() {
    this.container = document.getElementById('app')!;
    this.clock = new THREE.Clock();
    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.updateCameraPosition();

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.container.appendChild(this.renderer.domElement);

    this.assetManager = new AssetManager(this.scene);

    this.gui = new GUI({ width: 260 } as any);
    this.gui.domElement.style.position = 'absolute';
    this.gui.domElement.style.top = '20px';
    this.gui.domElement.style.left = '20px';
    this.gui.domElement.style.opacity = '0.85';

    this.initStats();
    this.initSlider();
    this.initInteraction();
    this.initScene();
    window.addEventListener('resize', this.onResize.bind(this));
  }

  private initStats(): void {
    this.statSeason = document.getElementById('stat-season')!;
    this.statCanopy = document.getElementById('stat-canopy')!;
    this.statGrass = document.getElementById('stat-grass')!;
    this.statSky = document.getElementById('stat-sky')!;
    this.statParticles = document.getElementById('stat-particles')!;
  }

  private initSlider(): void {
    this.slider = document.getElementById('season-slider') as HTMLInputElement;
    this.seasonLabel = document.getElementById('season-label')!;

    this.slider.addEventListener('input', (e) => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      this.seasonController.setTarget(val);
    });
  }

  private initInteraction(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.prevMouseX = e.clientX;
      this.prevMouseY = e.clientY;
      canvas.style.cursor = 'grabbing';
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
      canvas.style.cursor = 'grab';
    });

    canvas.style.cursor = 'grab';

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.prevMouseX;
      const dy = e.clientY - this.prevMouseY;
      this.prevMouseX = e.clientX;
      this.prevMouseY = e.clientY;

      this.cameraTheta -= dx * 0.005;
      this.cameraPhi = Math.max(
        Math.PI * 0.1,
        Math.min(Math.PI * 0.48, this.cameraPhi - dy * 0.005)
      );
      this.updateCameraPosition();
    });

    canvas.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        this.cameraDistance = Math.max(
          2,
          Math.min(20, this.cameraDistance + e.deltaY * 0.01)
        );
        this.updateCameraPosition();
      },
      { passive: false }
    );
  }

  private updateCameraPosition(): void {
    const sinPhi = Math.sin(this.cameraPhi);
    const x =
      this.cameraTarget.x + this.cameraDistance * sinPhi * Math.sin(this.cameraTheta);
    const y = this.cameraTarget.y + this.cameraDistance * Math.cos(this.cameraPhi);
    const z =
      this.cameraTarget.z + this.cameraDistance * sinPhi * Math.cos(this.cameraTheta);

    this.camera.position.set(x, y, z);
    this.camera.lookAt(this.cameraTarget);
  }

  private initScene(): void {
    this.assets = this.assetManager.createGarden();

    this.particleSystem = new ParticleSystem(
      this.scene,
      this.assets.treePositions,
      this.assets.canopyHeights
    );

    this.seasonController = new SeasonController(this.assets, this.particleSystem);
    this.seasonController.onUpdate = (state: SeasonState) => {
      this.updateStats(state);
    };
    this.seasonController.setTarget(0);

    const debugFolder = this.gui.addFolder('季节控制');
    const params = { 季节: 0 };
    debugFolder
      .add(params, '季节', 0, 3, 0.001)
      .onChange((val: number) => {
        this.seasonController.setTarget(val);
        this.slider.value = val.toString();
      })
      .name('季节参数');
    debugFolder.open();

    const cameraFolder = this.gui.addFolder('相机');
    const camParams = { 距离: 10, 水平角: 45, 俯仰角: 54 };
    cameraFolder
      .add(camParams, '距离', 2, 20, 0.1)
      .onChange((v: number) => {
        this.cameraDistance = v;
        this.updateCameraPosition();
      })
      .name('视距');
    cameraFolder
      .add(camParams, '水平角', 0, 360, 1)
      .onChange((v: number) => {
        this.cameraTheta = (v * Math.PI) / 180;
        this.updateCameraPosition();
      })
      .name('方位角(°)');
    cameraFolder
      .add(camParams, '俯仰角', 18, 86, 1)
      .onChange((v: number) => {
        this.cameraPhi = (v * Math.PI) / 180;
        this.updateCameraPosition();
      })
      .name('高度角(°)');

    this.animate();
  }

  private updateStats(state: SeasonState): void {
    const r = (c: THREE.Color) =>
      `rgb(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)})`;

    this.statSeason.textContent = `季节：${state.seasonName}`;
    this.statCanopy.textContent = `树冠：${r(state.canopyColor)}`;
    this.statGrass.textContent = `草地：${r(state.grassColor)}`;
    this.statSky.textContent = `天空：${r(state.skyColor)}`;
    this.statParticles.textContent = `粒子：${state.particleCount}`;

    this.seasonLabel.textContent = `${state.seasonName} · 2024-2025`;
    this.slider.style.setProperty('--thumb-color', state.thumbColor);
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());

    const delta = Math.min(this.clock.getDelta(), 0.05);

    this.seasonController.update();
    this.particleSystem.animate(delta);

    this.renderer.render(this.scene, this.camera);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
