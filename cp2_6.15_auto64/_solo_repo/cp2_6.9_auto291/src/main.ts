import * as THREE from 'three';
import { HeatDataPoint, BuildingMesh } from './types';
import { HeatmapManager } from './HeatmapManager';
import { CameraController } from './CameraController';

const GRID_SIZE = 40;
const BUILDING_COUNT = 200;
const CELL_SIZE = 0.8;

class CityHeatmapApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private cameraController: CameraController;
  private heatmapManager: HeatmapManager;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private clock: THREE.Clock;
  private container: HTMLElement;
  private selectedInfoEl: HTMLElement;
  private thresholdSlider: HTMLInputElement;
  private thresholdValueEl: HTMLElement;
  private downPos: { x: number; y: number } = { x: 0, y: 0 };

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.selectedInfoEl = document.getElementById('selected-info')!;
    this.thresholdSlider = document.getElementById('threshold-slider') as HTMLInputElement;
    this.thresholdValueEl = document.getElementById('threshold-value')!;

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.clock = new THREE.Clock();

    this.scene = this.initScene();
    this.camera = this.initCamera();
    this.renderer = this.initRenderer();
    this.cameraController = new CameraController(this.camera, this.renderer.domElement);
    this.heatmapManager = new HeatmapManager(this.scene);

    this.initGround();
    this.initLights();
    this.initData();
    this.initEventListeners();
    this.initCallbacks();

    this.animate();
  }

  private initScene(): THREE.Scene {
    const scene = new THREE.Scene();
    scene.background = null;
    scene.fog = new THREE.Fog(0x0D0D1A, 30, 80);
    return scene;
  }

  private initCamera(): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(25, 20, 25);
    return camera;
  }

  private initRenderer(): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    this.container.appendChild(renderer.domElement);
    return renderer;
  }

  private initGround(): void {
    const groundGeometry = new THREE.PlaneGeometry(GRID_SIZE, GRID_SIZE);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x1A1A2E,
      transparent: true,
      opacity: 0.9,
      metalness: 0.1,
      roughness: 0.9
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    const gridHelper = new THREE.GridHelper(GRID_SIZE, GRID_SIZE / 2, 0x2A2A4A, 0x2A2A4A);
    gridHelper.position.y = 0.01;
    (gridHelper.material as THREE.Material).opacity = 0.3;
    (gridHelper.material as THREE.Material).transparent = true;
    this.scene.add(gridHelper);
  }

  private initLights(): void {
    const ambientLight = new THREE.AmbientLight(0x404060, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(15, 25, 15);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 100;
    directionalLight.shadow.camera.left = -30;
    directionalLight.shadow.camera.right = 30;
    directionalLight.shadow.camera.top = 30;
    directionalLight.shadow.camera.bottom = -30;
    directionalLight.shadow.bias = -0.0005;
    this.scene.add(directionalLight);

    const hemisphereLight = new THREE.HemisphereLight(0x6060A0, 0x101020, 0.4);
    this.scene.add(hemisphereLight);
  }

  private initData(): void {
    const dataPoints: HeatDataPoint[] = [];
    const halfGrid = GRID_SIZE / 2;
    const usedPositions = new Set<string>();

    for (let i = 0; i < BUILDING_COUNT; i++) {
      let x: number, z: number, key: string;
      let attempts = 0;

      do {
        x = Math.floor((Math.random() * GRID_SIZE - halfGrid) / CELL_SIZE) * CELL_SIZE + CELL_SIZE / 2;
        z = Math.floor((Math.random() * GRID_SIZE - halfGrid) / CELL_SIZE) * CELL_SIZE + CELL_SIZE / 2;
        key = `${x.toFixed(2)}_${z.toFixed(2)}`;
        attempts++;
      } while (usedPositions.has(key) && attempts < 100);

      if (attempts < 100) {
        usedPositions.add(key);
        const heatValue = Math.random() * 100;
        dataPoints.push({
          id: i,
          position: new THREE.Vector3(x, 0, z),
          heatValue,
          regionName: `区域${i + 1}`
        });
      }
    }

    this.heatmapManager.setHeatData(dataPoints);
  }

  private initEventListeners(): void {
    window.addEventListener('resize', this.onWindowResize.bind(this));

    const canvas = this.renderer.domElement;
    canvas.addEventListener('pointermove', this.onPointerMove.bind(this));
    canvas.addEventListener('pointerdown', this.onPointerDown.bind(this));
    canvas.addEventListener('pointerup', this.onPointerUp.bind(this));
    canvas.addEventListener('pointerleave', this.onPointerLeave.bind(this));

    this.thresholdSlider.addEventListener('input', this.onThresholdChange.bind(this));
  }

  private initCallbacks(): void {
    this.heatmapManager.setOnBuildingSelectCallback((building) => {
      this.updateSelectedInfo(building);
      if (building) {
        this.cameraController.focusOnBuilding(building);
      }
    });
  }

  private updateSelectedInfo(building: BuildingMesh | null): void {
    if (building) {
      this.selectedInfoEl.innerHTML = `${building.userData.heatData.regionName}<br/><span style="font-size:14px;color:#AAAAAC">热力值：${Math.round(building.userData.heatData.heatValue)}</span>`;
    } else {
      this.selectedInfoEl.innerHTML = '<span class="empty">未选择</span>';
    }
  }

  private onThresholdChange(e: Event): void {
    const value = parseInt((e.target as HTMLInputElement).value, 10);
    this.thresholdValueEl.textContent = value.toString();
    this.heatmapManager.setThreshold(value);
  }

  private getMousePosition(e: PointerEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private getIntersectedBuilding(): BuildingMesh | null {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const buildings = this.heatmapManager.getBuildings();
    const intersects = this.raycaster.intersectObjects(buildings, false);

    if (intersects.length > 0) {
      return intersects[0].object as BuildingMesh;
    }
    return null;
  }

  private onPointerMove(e: PointerEvent): void {
    this.getMousePosition(e);
    const intersected = this.getIntersectedBuilding();
    this.heatmapManager.handleHover(intersected);
  }

  private onPointerDown(e: PointerEvent): void {
    this.downPos = { x: e.clientX, y: e.clientY };
  }

  private onPointerUp(e: PointerEvent): void {
    const dx = Math.abs(e.clientX - this.downPos.x);
    const dy = Math.abs(e.clientY - this.downPos.y);

    if (dx < 5 && dy < 5) {
      this.getMousePosition(e);
      const intersected = this.getIntersectedBuilding();
      this.heatmapManager.handleClick(intersected);
    }
  }

  private onPointerLeave(): void {
    this.heatmapManager.handleHover(null);
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this));

    const delta = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();

    this.cameraController.update();
    this.heatmapManager.update(delta, elapsed);
    this.heatmapManager.updateLabels(this.camera, this.renderer);

    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    this.heatmapManager.dispose();
    this.cameraController.dispose();
    this.renderer.dispose();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new CityHeatmapApp();
});
