import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { gsap } from 'gsap';

import { SunSystem } from './SunSystem';
import { BuildingSystem, DisplayMode } from './BuildingSystem';
import { ShadowSystem } from './ShadowSystem';
import { UIManager } from './UI';

class SceneManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private container: HTMLElement;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;

  private sunSystem: SunSystem;
  private buildingSystem: BuildingSystem;
  private shadowSystem: ShadowSystem;
  private uiManager: UIManager;

  private readonly initialCameraPosition = new THREE.Vector3(20, 15, 20);
  private readonly initialTarget = new THREE.Vector3(0, 0, 0);

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.scene = new THREE.Scene();
    this.setupBackground();

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.copy(this.initialCameraPosition);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.1;
    this.controls.minDistance = 10;
    this.controls.maxDistance = 50;
    this.controls.target.copy(this.initialTarget);
    this.controls.update();

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.sunSystem = new SunSystem(this.scene);
    this.buildingSystem = new BuildingSystem(this.scene);
    this.shadowSystem = new ShadowSystem(this.scene, this.sunSystem);

    this.uiManager = new UIManager({
      onDateChange: (day) => this.handleDateChange(day),
      onTimeChange: (time) => this.handleTimeChange(time),
      onDisplayModeChange: (mode) => this.handleDisplayModeChange(mode),
      onResetView: () => this.resetView()
    });

    this.setupSystems();
    this.setupEventListeners();
    this.animate();
  }

  private setupBackground(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#1B2838');
    gradient.addColorStop(1, '#0D1B2A');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    this.scene.background = texture;
  }

  private setupSystems(): void {
    this.shadowSystem.createGround();
    this.buildingSystem.createBuildings();
    this.sunSystem.initialize();

    const sunPos = this.sunSystem.getSunPosition();
    this.buildingSystem.setSunDirection(sunPos.direction);

    this.shadowSystem.setupShadowMapping(this.buildingSystem.getBuildings());
    this.shadowSystem.forceUpdate();

    this.buildingSystem.updateRadiationColors();
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.onWindowResize());
    window.addEventListener('click', (e) => this.onMouseClick(e));
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private onMouseClick(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.buildingSystem.getBuildingMeshes());

    if (intersects.length > 0) {
      const mesh = intersects[0].object as THREE.Mesh;
      this.buildingSystem.selectBuilding(mesh);
    } else {
      this.buildingSystem.selectBuilding(null);
    }

    this.uiManager.updateBuildingInfo(this.buildingSystem.getSelectedBuildingInfo());
  }

  private handleDateChange(dayOfYear: number): void {
    this.sunSystem.setTime(dayOfYear, this.sunSystem.getTimeOfDay());
    this.updateLightingAndShadows();
  }

  private handleTimeChange(timeOfDay: number): void {
    this.sunSystem.setTime(this.sunSystem.getDayOfYear(), timeOfDay);
    this.updateLightingAndShadows();
  }

  private handleDisplayModeChange(mode: DisplayMode): void {
    this.buildingSystem.setDisplayMode(mode);
  }

  private updateLightingAndShadows(): void {
    const sunPos = this.sunSystem.getSunPosition();
    this.buildingSystem.setSunDirection(sunPos.direction);
    this.buildingSystem.updateRadiationColors();
    this.shadowSystem.forceUpdate();
  }

  private resetView(): void {
    const startPos = this.camera.position.clone();
    const startTarget = this.controls.target.clone();

    gsap.to({}, {
      duration: 0.8,
      ease: 'power2.inOut',
      onUpdate: function () {
        const t = this.progress();
        this.camera.position.lerpVectors(startPos, this.initialCameraPosition, t);
        this.controls.target.lerpVectors(startTarget, this.initialTarget, t);
        this.controls.update();
      }.bind(this)
    });
  }

  private animate(): void {
    const frameId = requestAnimationFrame(() => this.animate());
    const now = performance.now();

    this.controls.update();

    this.sunSystem.updateSunGlow(this.camera);

    if (this.buildingSystem.getDisplayMode() === 'radiation') {
      const sunPos = this.sunSystem.getSunPosition();
      this.buildingSystem.setSunDirection(sunPos.direction);
      this.buildingSystem.updateRadiationColors();
    }

    this.shadowSystem.update(now);

    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    this.renderer.dispose();
    this.uiManager.destroy();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new SceneManager();
});
