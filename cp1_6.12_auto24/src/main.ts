import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { BuildingModel } from './BuildingModel';
import { SunSimulator } from './SunSimulator';
import { ShadowAnalyzer, markExcludeFromAnalysis } from './ShadowAnalyzer';
import { UIPanel } from './UIPanel';

class Application {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private buildingModel: BuildingModel;
  private sunSimulator: SunSimulator;
  private shadowAnalyzer: ShadowAnalyzer;
  private uiPanel: UIPanel;
  private groundPlane: THREE.Mesh;
  private gridHelper: THREE.GridHelper;
  private clock: THREE.Clock;
  private defaultCameraPosition: THREE.Vector3;
  private defaultCameraTarget: THREE.Vector3;
  private lastShadowAnalysisTime: number = 0;
  private shadowAnalysisInterval: number = 1000;

  constructor() {
    this.clock = new THREE.Clock();
    this.defaultCameraPosition = new THREE.Vector3(80, 60, 80);
    this.defaultCameraTarget = new THREE.Vector3(0, 0, 0);

    this.scene = this.createScene();
    this.camera = this.createCamera();
    this.renderer = this.createRenderer();
    this.controls = this.createControls();

    this.groundPlane = this.createGround();
    this.gridHelper = this.createGrid();
    this.scene.add(this.groundPlane);
    this.scene.add(this.gridHelper);

    this.buildingModel = new BuildingModel();
    this.scene.add(this.buildingModel.group);

    this.sunSimulator = new SunSimulator(this.scene);

    const ambientLight = new THREE.AmbientLight(0x404060, 0.5);
    this.scene.add(ambientLight);

    this.shadowAnalyzer = new ShadowAnalyzer(
      this.renderer,
      this.scene,
      this.groundPlane
    );

    this.uiPanel = new UIPanel({
      onDateChange: (dayOfYear) => this.handleDateChange(dayOfYear),
      onTimeChange: (hour) => this.handleTimeChange(hour),
      onRotationChange: (x, y, z) => this.handleRotationChange(x, y, z),
      onResetCamera: () => this.resetCamera(),
      onExportImage: () => this.exportImage(),
      onLocationChange: (lat, lng, tz) => this.handleLocationChange(lat, lng, tz),
    });

    this.setupEventListeners();
    this.animate();
  }

  private createScene(): THREE.Scene {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1e2a38);
    scene.fog = new THREE.Fog(0x1e2a38, 150, 300);
    return scene;
  }

  private createCamera(): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.copy(this.defaultCameraPosition);
    camera.lookAt(this.defaultCameraTarget);
    return camera;
  }

  private createRenderer(): THREE.WebGLRenderer {
    const container = document.getElementById('canvas-container');
    if (!container) {
      throw new Error('Canvas container not found');
    }

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: true,
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    container.appendChild(renderer.domElement);

    return renderer;
  }

  private createControls(): OrbitControls {
    const controls = new OrbitControls(this.camera, this.renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 20;
    controls.maxDistance = 200;
    controls.maxPolarAngle = Math.PI / 2.1;
    controls.target.copy(this.defaultCameraTarget);
    return controls;
  }

  private createGround(): THREE.Mesh {
    const geometry = new THREE.PlaneGeometry(200, 200);
    const material = new THREE.MeshStandardMaterial({
      color: 0x2a3a4a,
      roughness: 0.9,
      metalness: 0.1,
      transparent: true,
      opacity: 0.8,
    });
    const plane = new THREE.Mesh(geometry, material);
    plane.rotation.x = -Math.PI / 2;
    plane.receiveShadow = true;
    return plane;
  }

  private createGrid(): THREE.GridHelper {
    const grid = new THREE.GridHelper(200, 40, 0xffffff, 0xffffff);
    grid.position.y = 0.01;
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.15;
    markExcludeFromAnalysis(grid);
    return grid;
  }

  private handleDateChange(dayOfYear: number): void {
    const currentHour = this.sunSimulator.getCurrentHour();
    this.sunSimulator.updateSunPosition(dayOfYear, currentHour);
    this.triggerShadowAnalysis();
  }

  private handleTimeChange(hour: number): void {
    const currentDay = this.sunSimulator.getCurrentDayOfYear();
    this.sunSimulator.updateSunPosition(currentDay, hour);
    this.triggerShadowAnalysis();
  }

  private handleRotationChange(x: number, y: number, z: number): void {
    this.buildingModel.setRotation(x, y, z);
    this.triggerShadowAnalysis();
  }

  private handleLocationChange(latitude: number, longitude: number, timezone: number): void {
    this.sunSimulator.setLocation({ latitude, longitude, timezone });
    this.triggerShadowAnalysis();
  }

  private triggerShadowAnalysis(): void {
    this.shadowAnalyzer.markDirty();
    this.lastShadowAnalysisTime = 0;
  }

  private resetCamera(): void {
    const startPosition = this.camera.position.clone();
    const startTarget = this.controls.target.clone();
    const startTime = performance.now();
    const duration = 500;

    const animateReset = () => {
      const elapsed = performance.now() - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);

      this.camera.position.lerpVectors(startPosition, this.defaultCameraPosition, eased);
      this.controls.target.lerpVectors(startTarget, this.defaultCameraTarget, eased);
      this.controls.update();

      if (t < 1) {
        requestAnimationFrame(animateReset);
      }
    };

    animateReset();
  }

  private exportImage(): void {
    const needsColorSpaceSwitch = this.renderer.outputColorSpace !== THREE.SRGBColorSpace;
    if (needsColorSpaceSwitch) {
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    }
    this.renderer.render(this.scene, this.camera);

    const dataURL = this.renderer.domElement.toDataURL('image/png');

    if (needsColorSpaceSwitch) {
      this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    }

    const link = document.createElement('a');
    const date = new Date();
    const timestamp = `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}_${date.getHours().toString().padStart(2, '0')}${date.getMinutes().toString().padStart(2, '0')}`;
    link.download = `sunlight_analysis_${timestamp}.png`;
    link.href = dataURL;
    link.click();
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.handleResize());
  }

  private handleResize(): void {
    const container = document.getElementById('canvas-container');
    if (!container) return;

    let width = window.innerWidth;
    let height = window.innerHeight;

    if (window.innerWidth > 1024) {
      width = window.innerWidth - 280;
    }

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());

    const deltaTime = this.clock.getDelta();
    const currentTime = performance.now();

    this.controls.update();
    this.buildingModel.update(deltaTime);
    this.sunSimulator.update(deltaTime);

    if (currentTime - this.lastShadowAnalysisTime >= this.shadowAnalysisInterval) {
      this.lastShadowAnalysisTime = currentTime;
      const coverage = this.shadowAnalyzer.update(currentTime);
      this.uiPanel.updateCoverage(coverage);
    }

    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    this.buildingModel.dispose();
    this.sunSimulator.dispose();
    this.shadowAnalyzer.dispose();
    this.uiPanel.dispose();

    this.groundPlane.geometry.dispose();
    (this.groundPlane.material as THREE.Material).dispose();
    this.gridHelper.geometry.dispose();
    (this.gridHelper.material as THREE.Material).dispose();

    this.renderer.dispose();
    this.controls.dispose();
  }
}

let app: Application | null = null;

window.addEventListener('DOMContentLoaded', () => {
  app = new Application();
});

window.addEventListener('beforeunload', () => {
  if (app) {
    app.dispose();
    app = null;
  }
});
