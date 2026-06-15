import * as THREE from 'three';
import { TreeGenerator } from './tree';
import { InteractionManager } from './interaction';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private tree: TreeGenerator;
  private interaction: InteractionManager;
  private clock: THREE.Clock;

  private cameraAngle: number = 0;
  private cameraHeight: number = 4;
  private cameraDistance: number = 9;
  private targetCameraAngle: number = 0;
  private isOrbiting: boolean = false;
  private lastMouseX: number = 0;

  private speedSlider: HTMLInputElement | null = null;
  private radiusSlider: HTMLInputElement | null = null;
  private speedValue: HTMLSpanElement | null = null;
  private radiusValue: HTMLSpanElement | null = null;
  private statsEl: HTMLElement | null = null;
  private statBranches: HTMLElement | null = null;
  private statLeaves: HTMLElement | null = null;
  private statLayers: HTMLElement | null = null;

  constructor() {
    this.clock = new THREE.Clock();

    this.scene = new THREE.Scene();

    const container = document.getElementById('canvas-container');
    if (!container) throw new Error('Canvas container not found');

    const width = container.clientWidth;
    const height = container.clientHeight;

    this.camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    this.updateCameraPosition();

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height);
    this.renderer.setClearColor(0x000000, 0);
    container.appendChild(this.renderer.domElement);

    this.setupLights();
    this.setupGround();

    this.tree = new TreeGenerator(this.scene);
    this.tree.generateTree(new THREE.Vector3(0, 0, 0));

    this.interaction = new InteractionManager(
      this.scene,
      this.camera,
      this.renderer,
      this.tree
    );

    this.setupUIControls();
    this.setupOrbitControls();

    window.addEventListener('resize', this.onResize.bind(this));

    this.animate();
  }

  private setupLights(): void {
    const ambient = new THREE.AmbientLight(0xffffff, 0.55);
    this.scene.add(ambient);

    const sunLight = new THREE.DirectionalLight(0xfff8dc, 0.9);
    sunLight.position.set(6, 10, 5);
    this.scene.add(sunLight);

    const fillLight = new THREE.DirectionalLight(0x90ee90, 0.35);
    fillLight.position.set(-5, 4, -3);
    this.scene.add(fillLight);

    const rimLight = new THREE.PointLight(0x98fb98, 0.4, 20);
    rimLight.position.set(0, 5, -6);
    this.scene.add(rimLight);
  }

  private setupGround(): void {
    const groundGeo = new THREE.CircleGeometry(12, 32);
    const groundMat = new THREE.MeshLambertMaterial({
      color: 0x3a6b3a,
      transparent: true,
      opacity: 0.6
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    this.scene.add(ground);
  }

  private setupUIControls(): void {
    this.speedSlider = document.getElementById('speed-slider') as HTMLInputElement;
    this.radiusSlider = document.getElementById('radius-slider') as HTMLInputElement;
    this.speedValue = document.getElementById('speed-value');
    this.radiusValue = document.getElementById('radius-value');
    this.statsEl = document.getElementById('stats');
    this.statBranches = document.getElementById('stat-branches');
    this.statLeaves = document.getElementById('stat-leaves');
    this.statLayers = document.getElementById('stat-layers');

    if (this.speedSlider && this.speedValue) {
      this.speedSlider.addEventListener('input', () => {
        const val = parseFloat(this.speedSlider!.value);
        this.tree.growthSpeed = val;
        this.speedValue!.textContent = val.toFixed(1) + 'x';
      });
    }

    if (this.radiusSlider && this.radiusValue) {
      this.radiusSlider.addEventListener('input', () => {
        const val = parseFloat(this.radiusSlider!.value);
        this.interaction.setCutRadius(val);
        this.radiusValue!.textContent = val.toFixed(1);
      });
    }

    this.interaction.setStatsCallback((stats) => {
      if (stats && this.statsEl && this.statBranches && this.statLeaves && this.statLayers) {
        this.statBranches.textContent = String(stats.branchCount);
        this.statLeaves.textContent = String(stats.leafCount);
        this.statLayers.textContent = String(stats.maxLayer);
        this.statsEl.classList.add('visible');
      } else if (this.statsEl) {
        this.statsEl.classList.remove('visible');
      }
    });
  }

  private setupOrbitControls(): void {
    const dom = this.renderer.domElement;

    dom.addEventListener('contextmenu', (e) => e.preventDefault());

    dom.addEventListener('mousedown', (e) => {
      if (e.button === 2 || e.button === 1) {
        this.isOrbiting = true;
        this.lastMouseX = e.clientX;
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isOrbiting) {
        const delta = e.clientX - this.lastMouseX;
        this.targetCameraAngle += delta * 0.005;
        this.lastMouseX = e.clientX;
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 2 || e.button === 1) {
        this.isOrbiting = false;
      }
    });

    dom.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.cameraDistance = Math.max(4, Math.min(16, this.cameraDistance + e.deltaY * 0.008));
      this.cameraHeight = Math.max(2, Math.min(8, this.cameraHeight + e.deltaY * -0.003));
    }, { passive: false });
  }

  private updateCameraPosition(): void {
    this.camera.position.x = Math.sin(this.cameraAngle) * this.cameraDistance;
    this.camera.position.z = Math.cos(this.cameraAngle) * this.cameraDistance;
    this.camera.position.y = this.cameraHeight;
    this.camera.lookAt(0, 2.5, 0);
  }

  private onResize(): void {
    const container = document.getElementById('canvas-container');
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this));

    const delta = Math.min(this.clock.getDelta(), 0.1);

    this.cameraAngle += (this.targetCameraAngle - this.cameraAngle) * 0.08;
    this.updateCameraPosition();

    this.tree.update(delta);
    this.interaction.update(delta);

    this.renderer.render(this.scene, this.camera);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
