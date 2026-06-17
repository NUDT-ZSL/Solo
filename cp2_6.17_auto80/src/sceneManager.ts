import * as THREE from 'three';
import { createPlantModel } from './plantModel';
import { GardenPlant } from './apiService';

export interface SceneManagerCallbacks {
  onPlantSelected: (plantId: string | null) => void;
  onPlantClicked: (plant: GardenPlant) => void;
  onFpsUpdate: (fps: number) => void;
}

export class SceneManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private container: HTMLElement;
  private callbacks: SceneManagerCallbacks;
  
  private plantMeshes: Map<string, { group: THREE.Group; data: GardenPlant }> = new Map();
  private selectedPlantId: string | null = null;
  private selectionRing: THREE.Mesh | null = null;
  private placementMarker: THREE.Mesh | null = null;
  private ground: THREE.Mesh | null = null;
  
  private isDragging: boolean = false;
  private isPanning: boolean = false;
  private previousMousePosition: { x: number; y: number } = { x: 0, y: 0 };
  private cameraAngle: { theta: number; phi: number } = { theta: Math.PI / 4, phi: Math.PI / 3 };
  private cameraDistance: number = 12;
  private cameraTarget: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private zoomLevel: number = 1;
  
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private mouse: THREE.Vector2 = new THREE.Vector2();
  
  private placingPlantId: string | null = null;
  private placingPlantModel: THREE.Group | null = null;
  private placingPotColor: string = '#8B4513';
  
  private frameCount: number = 0;
  private lastFpsTime: number = 0;
  private currentFps: number = 60;
  
  private animationTime: number = 0;

  constructor(container: HTMLElement, callbacks: SceneManagerCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);
    this.scene.fog = new THREE.FogExp2(0x1a1a2e, 0.03);
    
    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    this.updateCameraPosition();
    
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    container.appendChild(this.renderer.domElement);
    
    this.setupLights();
    this.setupGround();
    this.setupEventListeners();
  }

  private setupLights(): void {
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
    this.scene.add(directionalLight);
  }

  private setupGround(): void {
    const groundRadius = 8;
    const gridSize = 0.5;
    const segments = Math.floor(groundRadius * 2 / gridSize);
    
    const groundGeo = new THREE.CircleGeometry(groundRadius, 64);
    const groundMat = new THREE.MeshLambertMaterial({
      color: 0xe0e0e0
    });
    this.ground = new THREE.Mesh(groundGeo, groundMat);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.receiveShadow = true;
    this.ground.name = 'ground';
    this.scene.add(this.ground);
    
    const gridHelper = new THREE.GridHelper(groundRadius * 2, segments, 0xbdbdbd, 0xbdbdbd);
    gridHelper.position.y = 0.01;
    this.scene.add(gridHelper);
    
    const ringGeo = new THREE.RingGeometry(groundRadius - 0.1, groundRadius, 64);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x9e9e9e, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.015;
    this.scene.add(ring);
  }

  private setupEventListeners(): void {
    const canvas = this.renderer.domElement;
    
    canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    canvas.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    
    window.addEventListener('resize', this.onResize.bind(this));
  }

  private onMouseDown(event: MouseEvent): void {
    if (event.button === 0) {
      if (this.placingPlantId) {
        this.tryPlacePlant(event);
      } else {
        this.isDragging = true;
        this.previousMousePosition = { x: event.clientX, y: event.clientY };
        this.checkPlantClick(event);
      }
    } else if (event.button === 1) {
      event.preventDefault();
      this.isPanning = true;
      this.previousMousePosition = { x: event.clientX, y: event.clientY };
    }
  }

  private onMouseMove(event: MouseEvent): void {
    if (this.placingPlantId && this.placingPlantModel) {
      this.updatePlacementPreview(event);
      return;
    }
    
    if (this.isDragging) {
      const deltaX = event.clientX - this.previousMousePosition.x;
      const deltaY = event.clientY - this.previousMousePosition.y;
      
      this.cameraAngle.theta -= deltaX * 0.005;
      this.cameraAngle.phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.1, this.cameraAngle.phi + deltaY * 0.005));
      
      this.previousMousePosition = { x: event.clientX, y: event.clientY };
      this.updateCameraPosition();
    }
    
    if (this.isPanning) {
      const deltaX = event.clientX - this.previousMousePosition.x;
      const deltaY = event.clientY - this.previousMousePosition.y;
      
      const panSpeed = 0.01 * this.cameraDistance / 10;
      const forward = new THREE.Vector3();
      this.camera.getWorldDirection(forward);
      forward.y = 0;
      forward.normalize();
      
      const right = new THREE.Vector3();
      right.crossVectors(forward, new THREE.Vector3(0, 1, 0));
      
      this.cameraTarget.addScaledVector(right, -deltaX * panSpeed);
      this.cameraTarget.addScaledVector(forward, -deltaY * panSpeed);
      
      this.previousMousePosition = { x: event.clientX, y: event.clientY };
      this.updateCameraPosition();
    }
  }

  private onMouseUp(event: MouseEvent): void {
    if (event.button === 0) {
      this.isDragging = false;
    } else if (event.button === 1) {
      this.isPanning = false;
    }
  }

  private onWheel(event: WheelEvent): void {
    event.preventDefault();
    const zoomSpeed = 0.001;
    this.zoomLevel = Math.max(0.5, Math.min(5.0, this.zoomLevel - event.deltaY * zoomSpeed * this.zoomLevel));
    this.cameraDistance = 12 / this.zoomLevel;
    this.updateCameraPosition();
  }

  private onResize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    
    this.renderer.setSize(width, height);
  }

  private updateCameraPosition(): void {
    const x = this.cameraTarget.x + this.cameraDistance * Math.sin(this.cameraAngle.phi) * Math.cos(this.cameraAngle.theta);
    const y = this.cameraTarget.y + this.cameraDistance * Math.cos(this.cameraAngle.phi);
    const z = this.cameraTarget.z + this.cameraDistance * Math.sin(this.cameraAngle.phi) * Math.sin(this.cameraAngle.theta);
    
    this.camera.position.set(x, y, z);
    this.camera.lookAt(this.cameraTarget);
  }

  private checkPlantClick(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    const plantGroups: THREE.Object3D[] = [];
    this.plantMeshes.forEach((value) => {
      plantGroups.push(value.group);
    });
    
    const intersects = this.raycaster.intersectObjects(plantGroups, true);
    
    if (intersects.length > 0) {
      let parentGroup: THREE.Group | null = null;
      let obj: THREE.Object3D | null = intersects[0].object;
      while (obj) {
        if (obj.userData.plantId) {
          parentGroup = obj as THREE.Group;
          break;
        }
        obj = obj.parent;
      }
      
      if (parentGroup && parentGroup.userData.plantId) {
        const plantId = parentGroup.userData.plantId;
        const plantData = this.plantMeshes.get(plantId)?.data;
        if (plantData) {
          this.selectPlant(plantId);
          this.callbacks.onPlantClicked(plantData);
        }
      }
    } else {
      this.selectPlant(null);
      this.callbacks.onPlantSelected(null);
    }
  }

  private selectPlant(plantId: string | null): void {
    this.selectedPlantId = plantId;
    
    if (this.selectionRing) {
      this.scene.remove(this.selectionRing);
      this.selectionRing = null;
    }
    
    if (plantId) {
      const plant = this.plantMeshes.get(plantId);
      if (plant) {
        const ringGeo = new THREE.RingGeometry(0.4, 0.5, 32);
        const ringMat = new THREE.MeshBasicMaterial({ 
          color: 0x2196f3, 
          transparent: true, 
          opacity: 0.5,
          side: THREE.DoubleSide
        });
        this.selectionRing = new THREE.Mesh(ringGeo, ringMat);
        this.selectionRing.rotation.x = -Math.PI / 2;
        this.selectionRing.position.set(
          plant.data.position.x,
          0.02,
          plant.data.position.z
        );
        this.scene.add(this.selectionRing);
      }
    }
  }

  private updatePlacementPreview(event: MouseEvent): void {
    if (!this.placingPlantModel || !this.ground) return;
    
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.ground);
    
    if (intersects.length > 0) {
      const point = intersects[0].point;
      const distance = Math.sqrt(point.x * point.x + point.z * point.z);
      
      if (distance < 7.5) {
        this.placingPlantModel.position.set(point.x, 0, point.z);
        this.placingPlantModel.visible = true;
        
        if (this.placementMarker) {
          this.placementMarker.position.set(point.x, 0.03, point.z);
          this.placementMarker.visible = true;
        }
      } else {
        this.placingPlantModel.visible = false;
        if (this.placementMarker) {
          this.placementMarker.visible = false;
        }
      }
    }
  }

  private tryPlacePlant(event: MouseEvent): void {
    if (!this.placingPlantId || !this.ground || !this.placingPlantModel) return;
    
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.ground);
    
    if (intersects.length > 0) {
      const point = intersects[0].point;
      const distance = Math.sqrt(point.x * point.x + point.z * point.z);
      
      if (distance < 7.5) {
        this.callbacks.onPlantSelected(this.placingPlantId);
        this.placingPlantId = null;
        
        if (this.placingPlantModel) {
          this.scene.remove(this.placingPlantModel);
          this.placingPlantModel = null;
        }
        
        if (this.placementMarker) {
          this.scene.remove(this.placementMarker);
          this.placementMarker = null;
        }
        
        return { x: point.x, z: point.z };
      }
    }
  }

  startPlacingPlant(plantId: string, potColor: string): void {
    this.cancelPlacingPlant();
    
    this.placingPlantId = plantId;
    this.placingPotColor = potColor;
    
    this.placingPlantModel = createPlantModel(plantId, potColor, 1);
    this.placingPlantModel.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = child.material.clone();
        (child.material as THREE.Material).transparent = true;
        (child.material as THREE.MeshLambertMaterial).opacity = 0.5;
      }
    });
    this.placingPlantModel.visible = false;
    this.scene.add(this.placingPlantModel);
    
    const markerGeo = new THREE.CircleGeometry(0.5, 32);
    const markerMat = new THREE.MeshBasicMaterial({ 
      color: 0x2196f3, 
      transparent: true, 
      opacity: 0.3,
      side: THREE.DoubleSide
    });
    this.placementMarker = new THREE.Mesh(markerGeo, markerMat);
    this.placementMarker.rotation.x = -Math.PI / 2;
    this.placementMarker.visible = false;
    this.scene.add(this.placementMarker);
  }

  cancelPlacingPlant(): void {
    this.placingPlantId = null;
    this.placingPotColor = '#8B4513';
    
    if (this.placingPlantModel) {
      this.scene.remove(this.placingPlantModel);
      this.placingPlantModel = null;
    }
    
    if (this.placementMarker) {
      this.scene.remove(this.placementMarker);
      this.placementMarker = null;
    }
  }

  addPlant(plantData: GardenPlant): void {
    const model = createPlantModel(plantData.plantId, plantData.potColor, plantData.currentHeight / plantData.defaultHeight);
    model.position.set(plantData.position.x, 0, plantData.position.z);
    model.userData.plantId = plantData.id;
    
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.userData.plantId = plantData.id;
      }
    });
    
    this.scene.add(model);
    this.plantMeshes.set(plantData.id, { group: model, data: plantData });
  }

  removePlant(plantId: string): void {
    const plant = this.plantMeshes.get(plantId);
    if (plant) {
      this.scene.remove(plant.group);
      this.plantMeshes.delete(plantId);
      
      if (this.selectedPlantId === plantId) {
        this.selectPlant(null);
      }
    }
  }

  updatePlantData(plantData: GardenPlant): void {
    const plant = this.plantMeshes.get(plantData.id);
    if (plant) {
      plant.data = plantData;
    }
  }

  getZoomLevel(): number {
    return this.zoomLevel;
  }

  animate(): void {
    requestAnimationFrame(this.animate.bind(this));
    
    this.animationTime += 0.016;
    
    if (this.selectionRing && this.selectionRing.material instanceof THREE.MeshBasicMaterial) {
      const pulse = 0.3 + 0.3 * (1 + Math.sin(this.animationTime * Math.PI)) / 2;
      this.selectionRing.material.opacity = pulse;
      const scale = 1 + 0.1 * Math.sin(this.animationTime * Math.PI);
      this.selectionRing.scale.set(scale, scale, 1);
    }
    
    if (this.placementMarker && this.placementMarker.material instanceof THREE.MeshBasicMaterial) {
      const pulse = 0.3 + 0.2 * Math.sin(this.animationTime * 3);
      this.placementMarker.material.opacity = pulse;
    }
    
    this.renderer.render(this.scene, this.camera);
    
    this.frameCount++;
    const now = performance.now();
    if (now - this.lastFpsTime >= 1000) {
      this.currentFps = this.frameCount;
      this.frameCount = 0;
      this.lastFpsTime = now;
      this.callbacks.onFpsUpdate(this.currentFps);
    }
  }

  getPlacingPlantId(): string | null {
    return this.placingPlantId;
  }

  getPlacingPotColor(): string {
    return this.placingPotColor;
  }

  handleGroundClick(callback: (position: { x: number; z: number }) => void): void {
    const originalTryPlace = this.tryPlacePlant.bind(this);
    this.tryPlacePlant = (event: MouseEvent) => {
      if (!this.placingPlantId || !this.ground || !this.placingPlantModel) return;
      
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObject(this.ground);
      
      if (intersects.length > 0) {
        const point = intersects[0].point;
        const distance = Math.sqrt(point.x * point.x + point.z * point.z);
        
        if (distance < 7.5) {
          const plantId = this.placingPlantId;
          const potColor = this.placingPotColor;
          
          this.cancelPlacingPlant();
          callback({ x: point.x, z: point.z });
        }
      }
    };
  }
}
