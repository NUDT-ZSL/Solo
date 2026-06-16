import * as THREE from 'three';
import { OrbitControls } from 'three-stdlib';
import { BuildingGrid, BuildingData } from './BuildingGrid';
import { WindField } from './WindField';
import { UIPanel } from './UIPanel';

class WindSimulatorApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private container: HTMLElement;

  private buildingGrid: BuildingGrid;
  private windField: WindField;
  private uiPanel: UIPanel;

  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private selectedBuilding: BuildingData | null = null;

  private clock: THREE.Clock;
  private animationId: number = 0;

  constructor(container: HTMLElement) {
    this.container = container;
    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.scene = this.createScene();
    this.camera = this.createCamera();
    this.renderer = this.createRenderer();
    this.controls = this.createControls();

    this.buildingGrid = new BuildingGrid(this.scene);
    this.windField = new WindField(this.scene, this.buildingGrid.getBuildings());

    this.uiPanel = new UIPanel(this.container, {
      onWindSpeedChange: (speed: number) => this.windField.setWindSpeed(speed),
      onPollutionSourceChange: (index: number) => this.windField.setPollutionSource(index),
      onDensityChange: (density: number) => this.windField.setContaminantDensity(density),
      onToggleSimulation: () => this.toggleSimulation()
    });

    this.setupGround();
    this.setupLights();
    this.setupEventListeners();

    this.uiPanel.showScaleBar();
    this.animate();
  }

  private createScene(): THREE.Scene {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x121220);
    scene.fog = new THREE.Fog(0x121220, 30, 60);
    return scene;
  }

  private createCamera(): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(
      60,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(20, 15, 20);
    camera.lookAt(0, 0, 0);
    return camera;
  }

  private createRenderer(): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(renderer.domElement);
    return renderer;
  }

  private createControls(): OrbitControls {
    const controls = new OrbitControls(this.camera, this.renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 5;
    controls.maxDistance = 50;
    controls.minZoom = 0.3;
    controls.maxZoom = 5;
    controls.enablePan = true;
    controls.maxPolarAngle = Math.PI / 2 - 0.1;
    return controls;
  }

  private setupGround(): void {
    const groundGeometry = new THREE.PlaneGeometry(40, 40);
    const groundMaterial = new THREE.MeshLambertMaterial({
      color: 0x1A1A2E
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    const gridHelper = new THREE.GridHelper(40, 20, 0x2D2D44, 0x1A1A2E);
    gridHelper.position.y = 0.01;
    this.scene.add(gridHelper);
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0x404060, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -20;
    directionalLight.shadow.camera.right = 20;
    directionalLight.shadow.camera.top = 20;
    directionalLight.shadow.camera.bottom = -20;
    this.scene.add(directionalLight);

    const pointLight = new THREE.PointLight(0x6C63FF, 0.3, 30);
    pointLight.position.set(-10, 10, 0);
    this.scene.add(pointLight);
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.onWindowResize.bind(this));
    this.renderer.domElement.addEventListener('click', this.onMouseClick.bind(this));
    this.renderer.domElement.addEventListener('mousemove', this.onMouseMove.bind(this));
  }

  private onWindowResize(): void {
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
  }

  private onMouseClick(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const buildingMeshes = this.buildingGrid.getBuildings().map(b => b.mesh);
    const intersects = this.raycaster.intersectObjects(buildingMeshes);

    if (intersects.length > 0) {
      const buildingData = this.buildingGrid.getBuildingAt(intersects[0].object);
      if (buildingData) {
        this.selectBuilding(buildingData, event.clientX, event.clientY);
        return;
      }
    }

    this.deselectBuilding();
  }

  private onMouseMove(event: MouseEvent): void {
    if (this.selectedBuilding) {
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }
  }

  private selectBuilding(building: BuildingData, screenX: number, screenY: number): void {
    this.selectedBuilding = building;
    this.buildingGrid.highlightBuilding(building);
    this.windField.highlightNearbyPaths(building);

    this.uiPanel.showBuildingInfo(screenX, screenY, {
      height: building.height,
      windPressureLeft: building.windPressureLeft,
      windPressureRight: building.windPressureRight,
      gridX: building.gridX,
      gridZ: building.gridZ
    });
  }

  private deselectBuilding(): void {
    this.selectedBuilding = null;
    this.buildingGrid.clearHighlight();
    this.windField.clearPathHighlight();
    this.uiPanel.hideBuildingInfo();
  }

  private toggleSimulation(): void {
    const isRunning = this.windField.toggleSimulation();
    this.uiPanel.setSimulationState(isRunning);
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(this.animate.bind(this));

    const delta = this.clock.getDelta();

    this.controls.update();
    this.windField.update(delta);

    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    cancelAnimationFrame(this.animationId);
    window.removeEventListener('resize', this.onWindowResize.bind(this));
    
    this.windField.dispose();
    this.uiPanel.dispose();
    
    this.renderer.dispose();
    
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}

const root = document.getElementById('root');
if (root) {
  new WindSimulatorApp(root);
}

export default WindSimulatorApp;
