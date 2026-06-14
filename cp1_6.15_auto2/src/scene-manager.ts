import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { SensorData } from './data-generator';
import { aqiToHex, aqiToRgb, pm25ToHeight } from './color-utils';

export type ViewMode = 'top' | 'perspective';
export type SelectionListener = (sensorId: string | null, gridX: number, gridY: number) => void;

interface HeatBlock {
  sensorId: string;
  gridX: number;
  gridY: number;
  mesh: THREE.Mesh;
  targetOpacity: number;
  currentOpacity: number;
  targetHeight: number;
  currentHeight: number;
}

export class SceneManager {
  private static readonly GRID_SIZE = 10;
  private static readonly CELL_SIZE = 1.2;
  private static readonly BUILDING_MIN_HEIGHT = 0.5;
  private static readonly BUILDING_MAX_HEIGHT = 2.5;
  private static readonly FADE_DURATION = 500;
  private static readonly CAMERA_TRANSITION_DURATION = 800;

  private container: HTMLElement;
  private canvas: HTMLCanvasElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private raycaster: THREE.Raycaster;
  private pointer: THREE.Vector2;

  private buildings!: THREE.InstancedMesh;
  private buildingDummy: THREE.Object3D;
  private buildingMaterial: THREE.MeshStandardMaterial;

  private heatBlocks: Map<string, HeatBlock> = new Map();
  private heatGroup: THREE.Group;

  private pulseRing: THREE.Mesh | null = null;
  private selectedSensorId: string | null = null;

  private starField: THREE.Points;

  private animationId: number | null = null;
  private clock: THREE.Clock;

  private isTransitioningCamera: boolean = false;
  private cameraTransitionStart: number = 0;
  private cameraStartPos: THREE.Vector3 = new THREE.Vector3();
  private cameraStartTarget: THREE.Vector3 = new THREE.Vector3();
  private cameraEndPos: THREE.Vector3 = new THREE.Vector3();
  private cameraEndTarget: THREE.Vector3 = new THREE.Vector3();

  private selectionListeners: SelectionListener[] = [];

  private currentViewMode: ViewMode = 'perspective';

  constructor(canvasId: string) {
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    this.container = this.canvas.parentElement!;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true
    });
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.buildingDummy = new THREE.Object3D();
    this.buildingMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a3a4a,
      metalness: 0.3,
      roughness: 0.7,
      transparent: true,
      opacity: 0.9
    });
    this.heatGroup = new THREE.Group();
    this.clock = new THREE.Clock();

    this.starField = this.createStarField();

    this.init();
  }

  private init(): void {
    this.setupRenderer();
    this.setupCamera();
    this.setupControls();
    this.setupLights();
    this.setupGroundGrid();
    this.setupBuildings();
    this.scene.add(this.heatGroup);
    this.scene.add(this.starField);
    this.setupEvents();
    this.onWindowResize();
    this.animate();
  }

  private setupRenderer(): void {
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
  }

  private setupCamera(): void {
    this.camera.position.set(12, 14, 12);
    this.camera.lookAt(0, 0, 0);
  }

  private setupControls(): void {
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.screenSpacePanning = true;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 40;
    this.controls.maxPolarAngle = Math.PI / 2.1;
    this.controls.target.set(0, 0, 0);
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0x6080a0, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -15;
    directionalLight.shadow.camera.right = 15;
    directionalLight.shadow.camera.top = 15;
    directionalLight.shadow.camera.bottom = -15;
    this.scene.add(directionalLight);

    const blueLight = new THREE.PointLight(0x4488ff, 0.5, 30);
    blueLight.position.set(-8, 6, -8);
    this.scene.add(blueLight);
  }

  private setupGroundGrid(): void {
    const gridSize = SceneManager.GRID_SIZE * SceneManager.CELL_SIZE;
    const gridHelper = new THREE.GridHelper(
      gridSize,
      SceneManager.GRID_SIZE,
      new THREE.Color(0x4488aa),
      new THREE.Color(0x224466)
    );
    gridHelper.material.transparent = true;
    gridHelper.material.opacity = 0.3;
    this.scene.add(gridHelper);

    const groundGeo = new THREE.PlaneGeometry(gridSize, gridSize);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x0a1628,
      transparent: true,
      opacity: 0.8,
      metalness: 0.2,
      roughness: 0.9
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    ground.receiveShadow = true;
    this.scene.add(ground);
  }

  private setupBuildings(): void {
    const gridSize = SceneManager.GRID_SIZE;
    const cellSize = SceneManager.CELL_SIZE;
    const totalBuildings = gridSize * gridSize;

    const buildingGeo = new THREE.BoxGeometry(cellSize * 0.8, 1, cellSize * 0.8);
    this.buildings = new THREE.InstancedMesh(buildingGeo, this.buildingMaterial, totalBuildings);
    this.buildings.castShadow = true;
    this.buildings.receiveShadow = true;

    const halfGrid = (gridSize - 1) * cellSize / 2;

    for (let gy = 0; gy < gridSize; gy++) {
      for (let gx = 0; gx < gridSize; gx++) {
        const index = gy * gridSize + gx;
        const height = SceneManager.BUILDING_MIN_HEIGHT + 
          Math.random() * (SceneManager.BUILDING_MAX_HEIGHT - SceneManager.BUILDING_MIN_HEIGHT);
        
        this.buildingDummy.position.set(
          gx * cellSize - halfGrid,
          height / 2,
          gy * cellSize - halfGrid
        );
        this.buildingDummy.scale.set(1, height, 1);
        this.buildingDummy.rotation.set(0, 0, 0);
        this.buildingDummy.updateMatrix();
        this.buildings.setMatrixAt(index, this.buildingDummy.matrix);
      }
    }

    this.buildings.instanceMatrix.needsUpdate = true;
    this.scene.add(this.buildings);
  }

  private createStarField(): THREE.Points {
    const starCount = 300;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const radius = 40 + Math.random() * 20;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.5;

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.cos(phi) * 0.5 + 5;
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);

      const colorChoice = Math.random();
      if (colorChoice < 0.7) {
        colors[i * 3] = 0.8; colors[i * 3 + 1] = 0.9; colors[i * 3 + 2] = 1.0;
      } else if (colorChoice < 0.9) {
        colors[i * 3] = 1.0; colors[i * 3 + 1] = 0.95; colors[i * 3 + 2] = 0.8;
      } else {
        colors[i * 3] = 0.6; colors[i * 3 + 1] = 0.8; colors[i * 3 + 2] = 1.0;
      }
    }

    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const starMat = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true
    });

    const stars = new THREE.Points(starGeo, starMat);
    stars.name = 'starField';
    return stars;
  }

  private gridToWorld(gridX: number, gridY: number): THREE.Vector3 {
    const cellSize = SceneManager.CELL_SIZE;
    const halfGrid = (SceneManager.GRID_SIZE - 1) * cellSize / 2;
    return new THREE.Vector3(
      gridX * cellSize - halfGrid,
      0,
      gridY * cellSize - halfGrid
    );
  }

  public updateSensorData(data: SensorData[]): void {
    const activeIds = new Set<string>();

    data.forEach((sensor) => {
      activeIds.add(sensor.id);
      this.updateOrCreateHeatBlock(sensor);
    });

    this.heatBlocks.forEach((block, id) => {
      if (!activeIds.has(id)) {
        block.targetOpacity = 0;
      }
    });
  }

  private updateOrCreateHeatBlock(sensor: SensorData): void {
    const existing = this.heatBlocks.get(sensor.id);
    const targetHeight = pm25ToHeight(sensor.pm25);

    if (existing) {
      existing.targetOpacity = 1;
      existing.targetHeight = targetHeight;

      const color = new THREE.Color(aqiToHex(sensor.aqi));
      (existing.mesh.material as THREE.MeshStandardMaterial).color.copy(color);
      existing.mesh.userData.aqi = sensor.aqi;
    } else {
      this.createHeatBlock(sensor, targetHeight);
    }
  }

  private createHeatBlock(sensor: SensorData, height: number): void {
    const worldPos = this.gridToWorld(sensor.gridX, sensor.gridY);
    const cellSize = SceneManager.CELL_SIZE;

    const geometry = new THREE.BoxGeometry(cellSize * 0.7, 1, cellSize * 0.7);
    const material = new THREE.MeshStandardMaterial({
      color: aqiToHex(sensor.aqi),
      emissive: aqiToHex(sensor.aqi),
      emissiveIntensity: 0.3,
      metalness: 0.4,
      roughness: 0.3,
      transparent: true,
      opacity: 0
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(worldPos.x, height / 2, worldPos.z);
    mesh.scale.set(1, height, 1);
    mesh.castShadow = true;
    mesh.userData = {
      sensorId: sensor.id,
      gridX: sensor.gridX,
      gridY: sensor.gridY,
      aqi: sensor.aqi,
      isHeatBlock: true
    };

    this.heatGroup.add(mesh);

    this.heatBlocks.set(sensor.id, {
      sensorId: sensor.id,
      gridX: sensor.gridX,
      gridY: sensor.gridY,
      mesh,
      targetOpacity: 1,
      currentOpacity: 0,
      targetHeight: height,
      currentHeight: 0
    });
  }

  private setupEvents(): void {
    window.addEventListener('resize', () => this.onWindowResize());
    this.renderer.domElement.addEventListener('pointerdown', (e) => this.onPointerDown(e));
  }

  private onWindowResize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  private onPointerDown(event: PointerEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.camera);

    const intersects = this.raycaster.intersectObjects(this.heatGroup.children, false);

    if (intersects.length > 0) {
      const mesh = intersects[0].object as THREE.Mesh;
      if (mesh.userData && mesh.userData.isHeatBlock) {
        const sensorId: string = mesh.userData.sensorId;
        const gridX: number = mesh.userData.gridX;
        const gridY: number = mesh.userData.gridY;
        this.selectHeatBlock(sensorId, gridX, gridY);
      }
    } else {
      this.clearSelection();
    }
  }

  private selectHeatBlock(sensorId: string, gridX: number, gridY: number): void {
    this.selectedSensorId = sensorId;
    this.createPulseRing(gridX, gridY);
    this.selectionListeners.forEach((fn) => fn(sensorId, gridX, gridY));
  }

  private clearSelection(): void {
    this.selectedSensorId = null;
    this.removePulseRing();
    this.selectionListeners.forEach((fn) => fn(null, 0, 0));
  }

  private createPulseRing(gridX: number, gridY: number): void {
    this.removePulseRing();

    const worldPos = this.gridToWorld(gridX, gridY);
    const cellSize = SceneManager.CELL_SIZE;

    const ringGeo = new THREE.RingGeometry(cellSize * 0.45, cellSize * 0.6, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x66ddff,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide
    });

    this.pulseRing = new THREE.Mesh(ringGeo, ringMat);
    this.pulseRing.rotation.x = -Math.PI / 2;
    this.pulseRing.position.set(worldPos.x, 0.05, worldPos.z);
    this.scene.add(this.pulseRing);
  }

  private removePulseRing(): void {
    if (this.pulseRing) {
      this.scene.remove(this.pulseRing);
      this.pulseRing.geometry.dispose();
      (this.pulseRing.material as THREE.Material).dispose();
      this.pulseRing = null;
    }
  }

  public setView(mode: ViewMode): void {
    if (this.isTransitioningCamera) return;
    this.currentViewMode = mode;

    this.cameraStartPos.copy(this.camera.position);
    this.cameraStartTarget.copy(this.controls.target);

    const halfGrid = (SceneManager.GRID_SIZE - 1) * SceneManager.CELL_SIZE / 2;

    if (mode === 'top') {
      this.cameraEndPos.set(0, 25, 0.01);
      this.cameraEndTarget.set(0, 0, 0);
    } else {
      this.cameraEndPos.set(halfGrid * 1.5, 14, halfGrid * 1.5);
      this.cameraEndTarget.set(0, 0, 0);
    }

    this.cameraTransitionStart = performance.now();
    this.isTransitioningCamera = true;
  }

  public getViewMode(): ViewMode {
    return this.currentViewMode;
  }

  public onSelectionChange(listener: SelectionListener): void {
    this.selectionListeners.push(listener);
  }

  public offSelectionChange(listener: SelectionListener): void {
    const index = this.selectionListeners.indexOf(listener);
    if (index > -1) {
      this.selectionListeners.splice(index, 1);
    }
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);
    const delta = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();

    this.updateHeatBlockAnimations(delta);
    this.updatePulseRing(elapsed);
    this.updateCameraTransition();
    this.updateStarField(elapsed);

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  private updateHeatBlockAnimations(delta: number): void {
    const fadeSpeed = 1 / (SceneManager.FADE_DURATION / 1000);

    this.heatBlocks.forEach((block, id) => {
      const opacityDelta = (block.targetOpacity - block.currentOpacity) * fadeSpeed * delta;
      block.currentOpacity = Math.max(0, Math.min(1, block.currentOpacity + opacityDelta));
      (block.mesh.material as THREE.MeshStandardMaterial).opacity = block.currentOpacity;

      const heightDelta = (block.targetHeight - block.currentHeight) * fadeSpeed * delta * 2;
      block.currentHeight = block.currentHeight + heightDelta;
      block.mesh.scale.y = Math.max(0.01, block.currentHeight);
      block.mesh.position.y = block.currentHeight / 2;

      if (block.targetOpacity === 0 && block.currentOpacity < 0.01) {
        this.heatGroup.remove(block.mesh);
        block.mesh.geometry.dispose();
        (block.mesh.material as THREE.Material).dispose();
        this.heatBlocks.delete(id);
      }
    });
  }

  private updatePulseRing(elapsed: number): void {
    if (this.pulseRing) {
      const pulse = 0.7 + Math.sin(elapsed * 4) * 0.3;
      (this.pulseRing.material as THREE.MeshBasicMaterial).opacity = pulse * 0.9;
      const baseScale = 1 + Math.sin(elapsed * 3) * 0.15;
      this.pulseRing.scale.set(baseScale, baseScale, baseScale);
    }
  }

  private updateCameraTransition(): void {
    if (!this.isTransitioningCamera) return;

    const now = performance.now();
    const t = Math.min(1, (now - this.cameraTransitionStart) / SceneManager.CAMERA_TRANSITION_DURATION);
    const eased = this.easeInOutCubic(t);

    this.camera.position.lerpVectors(this.cameraStartPos, this.cameraEndPos, eased);
    this.controls.target.lerpVectors(this.cameraStartTarget, this.cameraEndTarget, eased);

    if (t >= 1) {
      this.isTransitioningCamera = false;
    }
  }

  private updateStarField(elapsed: number): void {
    this.starField.rotation.y = elapsed * 0.015;
    const positions = this.starField.geometry.attributes.position as THREE.BufferAttribute;
    const colors = this.starField.geometry.attributes.color as THREE.BufferAttribute;
    
    for (let i = 0; i < positions.count; i++) {
      const twinkle = 0.7 + Math.sin(elapsed * 2 + i * 0.5) * 0.3;
      (this.starField.material as THREE.PointsMaterial).opacity = 0.6 + twinkle * 0.2;
    }
    positions.needsUpdate = true;
    colors.needsUpdate = true;
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  public dispose(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }

    this.heatBlocks.forEach((block) => {
      block.mesh.geometry.dispose();
      (block.mesh.material as THREE.Material).dispose();
    });
    this.heatBlocks.clear();

    this.buildings.geometry.dispose();
    this.buildingMaterial.dispose();

    this.removePulseRing();

    this.starField.geometry.dispose();
    (this.starField.material as THREE.Material).dispose();

    this.controls.dispose();
    this.renderer.dispose();

    window.removeEventListener('resize', () => this.onWindowResize());
  }
}
