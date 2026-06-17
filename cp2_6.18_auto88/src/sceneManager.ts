import * as THREE from 'three';
import { GardenPlant, WateringRecord, apiService } from './apiService';
import { PlantModelManager } from './plantModel';

interface PlantInstance {
  gardenPlant: GardenPlant;
  model: THREE.Group;
  selectionRing: THREE.Mesh | null;
}

export type PlacementCallback = (position: { x: number; y: number; z: number }) => void;
export type SelectionCallback = (gardenPlant: GardenPlant | null) => void;
export type FPSUpdateCallback = (fps: number) => void;

export class SceneManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private container: HTMLElement;
  private plantModelManager: PlantModelManager;
  private plantInstances: Map<string, PlantInstance> = new Map();
  private ground: THREE.Mesh | null = null;
  private placementMarker: THREE.Mesh | null = null;
  private previewModel: THREE.Group | null = null;
  private selectedPlantId: string | null = null;
  private isPlacing: boolean = false;
  private placingPlantId: string | null = null;
  private placementCallback: PlacementCallback | null = null;
  private selectionCallback: SelectionCallback | null = null;
  private fpsCallback: FPSUpdateCallback | null = null;

  private isDragging: boolean = false;
  private isPanning: boolean = false;
  private previousMousePosition = { x: 0, y: 0 };
  private cameraDistance = 12;
  private cameraTheta = 0;
  private cameraPhi = Math.PI / 4;
  private cameraTarget = new THREE.Vector3(0, 0, 0);
  private minZoom = 0.5;
  private maxZoom = 5.0;
  private currentZoom = 1.0;

  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();

  private frameCount = 0;
  private lastFpsUpdate = 0;
  private currentFps = 60;

  private animationFrameId: number | null = null;
  private pulseStartTime = 0;

  constructor(container: HTMLElement, plantModelManager: PlantModelManager) {
    this.container = container;
    this.plantModelManager = plantModelManager;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });

    this.setupScene();
    this.setupRenderer();
    this.setupCamera();
    this.setupEventListeners();
    this.loadGarden();
  }

  private setupScene(): void {
    this.scene.background = new THREE.Color(0x1a1a2e);
    this.scene.fog = new THREE.FogExp2(0x1a1a2e, 0.03);

    const ambientLight = new THREE.HemisphereLight(0x87ceeb, 0xf5f5dc, 0.6);
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
    directionalLight.shadow.bias = -0.0001;
    directionalLight.shadow.normalBias = 0.02;
    this.scene.add(directionalLight);

    this.createGround();
    this.createPlacementMarker();
  }

  private createGround(): void {
    const groundRadius = 8;
    const gridSize = 0.5;

    const groundGeometry = new THREE.CircleGeometry(groundRadius, 64);
    const groundCanvas = document.createElement('canvas');
    const size = 512;
    groundCanvas.width = size;
    groundCanvas.height = size;
    const ctx = groundCanvas.getContext('2d')!;

    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, '#e0e0e0');
    gradient.addColorStop(1, '#9e9e9e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    ctx.strokeStyle = '#bdbdbd';
    ctx.lineWidth = 1;
    const gridCount = Math.floor(groundRadius * 2 / gridSize);
    const step = size / gridCount;

    for (let i = 0; i <= gridCount; i++) {
      const pos = i * step;
      ctx.beginPath();
      ctx.moveTo(pos, 0);
      ctx.lineTo(pos, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, pos);
      ctx.lineTo(size, pos);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(groundCanvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;

    const groundMaterial = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.9,
      metalness: 0.1
    });

    this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);
  }

  private createPlacementMarker(): void {
    const markerGeometry = new THREE.RingGeometry(0.25, 0.35, 32);
    const markerMaterial = new THREE.MeshBasicMaterial({
      color: 0x42a5f5,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide
    });
    this.placementMarker = new THREE.Mesh(markerGeometry, markerMaterial);
    this.placementMarker.rotation.x = -Math.PI / 2;
    this.placementMarker.visible = false;
    this.scene.add(this.placementMarker);
  }

  private setupRenderer(): void {
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);
  }

  private setupCamera(): void {
    this.updateCameraPosition();
  }

  private updateCameraPosition(): void {
    const distance = this.cameraDistance * this.currentZoom;
    this.camera.position.x = this.cameraTarget.x + distance * Math.sin(this.cameraPhi) * Math.cos(this.cameraTheta);
    this.camera.position.y = this.cameraTarget.y + distance * Math.cos(this.cameraPhi);
    this.camera.position.z = this.cameraTarget.z + distance * Math.sin(this.cameraPhi) * Math.sin(this.cameraTheta);
    this.camera.lookAt(this.cameraTarget);
  }

  private setupEventListeners(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    canvas.addEventListener('mouseleave', this.onMouseUp.bind(this));
    canvas.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    window.addEventListener('resize', this.onResize.bind(this));
  }

  private onMouseDown(event: MouseEvent): void {
    if (this.isPlacing) {
      this.handlePlacementClick(event);
      return;
    }

    if (event.button === 0) {
      this.handlePlantClick(event);
      this.isDragging = true;
    } else if (event.button === 1) {
      this.isPanning = true;
    }

    this.previousMousePosition = { x: event.clientX, y: event.clientY };
  }

  private onMouseMove(event: MouseEvent): void {
    const deltaX = event.clientX - this.previousMousePosition.x;
    const deltaY = event.clientY - this.previousMousePosition.y;

    if (this.isPlacing && this.previewModel) {
      this.updatePreviewPosition(event);
    } else if (this.isDragging) {
      this.cameraTheta -= deltaX * 0.005;
      this.cameraPhi = Math.max(0.1, Math.min(Math.PI / 2 - 0.1, this.cameraPhi - deltaY * 0.005));
      this.updateCameraPosition();
    } else if (this.isPanning) {
      const panSpeed = 0.01 * this.currentZoom;
      const right = new THREE.Vector3();
      const up = new THREE.Vector3(0, 1, 0);
      this.camera.getWorldDirection(right);
      right.cross(up).normalize();
      this.cameraTarget.add(right.multiplyScalar(-deltaX * panSpeed));
      this.cameraTarget.y += deltaY * panSpeed;
      this.cameraTarget.y = Math.max(0, this.cameraTarget.y);
      this.updateCameraPosition();
    }

    this.previousMousePosition = { x: event.clientX, y: event.clientY };
  }

  private onMouseUp(): void {
    this.isDragging = false;
    this.isPanning = false;
  }

  private onWheel(event: WheelEvent): void {
    event.preventDefault();
    const zoomSpeed = 0.001;
    this.currentZoom += event.deltaY * zoomSpeed;
    this.currentZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.currentZoom));
    this.updateCameraPosition();
  }

  private onResize(): void {
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
  }

  private handlePlantClick(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const plantMeshes: THREE.Object3D[] = [];
    this.plantInstances.forEach((instance) => {
      plantMeshes.push(instance.model);
    });

    const intersects = this.raycaster.intersectObjects(plantMeshes, true);

    if (intersects.length > 0) {
      let selectedModel = intersects[0].object;
      while (selectedModel.parent && !this.plantInstances.has(selectedModel.userData.plantId)) {
        selectedModel = selectedModel.parent;
      }
      const plantId = selectedModel.userData.plantId;
      if (plantId && this.plantInstances.has(plantId)) {
        this.selectPlant(plantId);
        return;
      }
    }

    this.deselectPlant();
  }

  private handlePlacementClick(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    if (this.ground) {
      const intersects = this.raycaster.intersectObject(this.ground);
      if (intersects.length > 0) {
        const point = intersects[0].point;
        const distanceFromCenter = Math.sqrt(point.x ** 2 + point.z ** 2);
        if (distanceFromCenter <= 7.5) {
          this.cancelPlacement();
          if (this.placementCallback) {
            this.placementCallback({ x: point.x, y: 0, z: point.z });
          }
        }
      }
    }
  }

  private updatePreviewPosition(event: MouseEvent): void {
    if (!this.previewModel || !this.ground) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.ground);

    if (intersects.length > 0) {
      const point = intersects[0].point;
      const distanceFromCenter = Math.sqrt(point.x ** 2 + point.z ** 2);
      const isValid = distanceFromCenter <= 7.5;

      this.previewModel.position.set(point.x, 0, point.z);
      this.previewModel.visible = true;

      if (this.placementMarker) {
        this.placementMarker.position.set(point.x, 0.01, point.z);
        this.placementMarker.visible = true;
        (this.placementMarker.material as THREE.MeshBasicMaterial).color.setHex(
          isValid ? 0x42a5f5 : 0xf44336
        );
      }
    }
  }

  private async loadGarden(): Promise<void> {
    const gardenPlants = await apiService.getGarden();
    for (const gardenPlant of gardenPlants) {
      this.addPlantInstance(gardenPlant);
    }
  }

  private addPlantInstance(gardenPlant: GardenPlant): void {
    const model = this.plantModelManager.createPlantModel(
      gardenPlant.plantId,
      gardenPlant.potColor,
      gardenPlant.currentHeight
    );

    if (!model) return;

    model.position.set(gardenPlant.position.x, gardenPlant.position.y, gardenPlant.position.z);
    model.userData.plantId = gardenPlant.id;

    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.userData.plantId = gardenPlant.id;
      }
    });

    this.scene.add(model);
    this.plantInstances.set(gardenPlant.id, {
      gardenPlant,
      model,
      selectionRing: null
    });
  }

  public async addPlant(plantId: string, position: { x: number; y: number; z: number }, potColor: string): Promise<GardenPlant | null> {
    const newPlant = await apiService.addPlant(plantId, position, potColor);
    if (newPlant) {
      this.addPlantInstance(newPlant);
    }
    return newPlant;
  }

  public async deletePlant(plantId: string): Promise<boolean> {
    const success = await apiService.deletePlant(plantId);
    if (success) {
      this.removePlantInstance(plantId);
      if (this.selectedPlantId === plantId) {
        this.deselectPlant();
      }
    }
    return success;
  }

  public updatePlantHeight(plantId: string, newHeight: number): void {
    const instance = this.plantInstances.get(plantId);
    if (!instance) return;

    this.scene.remove(instance.model);

    const newModel = this.plantModelManager.createPlantModel(
      instance.gardenPlant.plantId,
      instance.gardenPlant.potColor,
      newHeight
    );

    if (newModel) {
      newModel.position.copy(instance.model.position);
      newModel.userData.plantId = plantId;

      newModel.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.userData.plantId = plantId;
        }
      });

      this.scene.add(newModel);
      instance.model = newModel;
      instance.gardenPlant.currentHeight = newHeight;

      if (this.selectedPlantId === plantId) {
        this.createSelectionRing(instance);
        this.updateSelectionCallback();
      }
    }
  }

  public addWateringRecord(plantId: string, record: WateringRecord): void {
    const instance = this.plantInstances.get(plantId);
    if (instance) {
      if (!instance.gardenPlant.wateringRecords) {
        instance.gardenPlant.wateringRecords = [];
      }
      instance.gardenPlant.wateringRecords.unshift(record);
      this.updateSelectionCallback();
    }
  }

  private removePlantInstance(plantId: string): void {
    const instance = this.plantInstances.get(plantId);
    if (!instance) return;

    this.scene.remove(instance.model);
    if (instance.selectionRing) {
      this.scene.remove(instance.selectionRing);
    }

    instance.model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });

    this.plantInstances.delete(plantId);
  }

  private selectPlant(plantId: string): void {
    if (this.selectedPlantId === plantId) return;

    this.deselectPlant();
    this.selectedPlantId = plantId;

    const instance = this.plantInstances.get(plantId);
    if (instance) {
      this.createSelectionRing(instance);
    }

    this.updateSelectionCallback();
  }

  private createSelectionRing(instance: PlantInstance): void {
    if (instance.selectionRing) {
      this.scene.remove(instance.selectionRing);
    }

    const ringGeometry = new THREE.RingGeometry(0.8, 1.0, 32);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0x42a5f5,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(instance.model.position);
    ring.position.y = 0.02;

    instance.selectionRing = ring;
    this.scene.add(ring);
  }

  private deselectPlant(): void {
    if (this.selectedPlantId) {
      const instance = this.plantInstances.get(this.selectedPlantId);
      if (instance && instance.selectionRing) {
        this.scene.remove(instance.selectionRing);
        instance.selectionRing = null;
      }
    }
    this.selectedPlantId = null;
    this.updateSelectionCallback();
  }

  private updateSelectionCallback(): void {
    if (this.selectionCallback) {
      if (this.selectedPlantId) {
        const instance = this.plantInstances.get(this.selectedPlantId);
        this.selectionCallback(instance ? instance.gardenPlant : null);
      } else {
        this.selectionCallback(null);
      }
    }
  }

  public startPlacement(plantId: string, callback: PlacementCallback): void {
    this.isPlacing = true;
    this.placingPlantId = plantId;
    this.placementCallback = callback;

    this.previewModel = this.plantModelManager.createPreviewModel(plantId);
    if (this.previewModel) {
      this.previewModel.visible = false;
      this.scene.add(this.previewModel);
    }

    this.deselectPlant();
  }

  public cancelPlacement(): void {
    this.isPlacing = false;
    this.placingPlantId = null;
    this.placementCallback = null;

    if (this.previewModel) {
      this.scene.remove(this.previewModel);
      this.previewModel.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
      this.previewModel = null;
    }

    if (this.placementMarker) {
      this.placementMarker.visible = false;
    }
  }

  public isInPlacementMode(): boolean {
    return this.isPlacing;
  }

  public setSelectionCallback(callback: SelectionCallback | null): void {
    this.selectionCallback = callback;
  }

  public setFPSUpdateCallback(callback: FPSUpdateCallback | null): void {
    this.fpsCallback = callback;
  }

  public getCurrentZoom(): number {
    return this.currentZoom;
  }

  private updatePulse(time: number): void {
    this.plantInstances.forEach((instance) => {
      if (instance.selectionRing) {
        const elapsed = (time - this.pulseStartTime) / 2000;
        const opacity = 0.3 + Math.sin(elapsed * Math.PI * 2) * 0.15 + 0.15;
        (instance.selectionRing.material as THREE.MeshBasicMaterial).opacity = opacity;
      }
    });
  }

  public animate(): void {
    this.animationFrameId = requestAnimationFrame(() => this.animate());

    const now = performance.now();
    this.frameCount++;

    if (now - this.lastFpsUpdate >= 1000) {
      this.currentFps = this.frameCount;
      this.frameCount = 0;
      this.lastFpsUpdate = now;
      if (this.fpsCallback) {
        this.fpsCallback(this.currentFps);
      }
    }

    this.updatePulse(now);
    this.renderer.render(this.scene, this.camera);
  }

  public getCurrentFPS(): number {
    return this.currentFps;
  }

  public dispose(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    this.plantInstances.forEach((_, plantId) => {
      this.removePlantInstance(plantId);
    });

    this.renderer.dispose();
    this.container.removeChild(this.renderer.domElement);
  }
}
