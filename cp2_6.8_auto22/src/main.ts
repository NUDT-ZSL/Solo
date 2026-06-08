import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { FurnitureManager, FurnitureItem, FurnitureType } from './furnitureManager';
import { EnvironmentManager, FloorMaterialType, WALL_COLOR_PRESETS } from './environment';

class RoomLayoutApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private furnitureManager: FurnitureManager;
  private environmentManager: EnvironmentManager;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  
  private isDragging: boolean = false;
  private dragItem: FurnitureItem | null = null;
  private selectedFurnitureType: FurnitureType | null = null;
  private itemPendingDelete: FurnitureItem | null = null;
  
  private clock: THREE.Clock;
  private angleIndicatorTimeout: number | null = null;
  
  private canvas: HTMLCanvasElement;
  private angleIndicator: HTMLElement;
  private angleValue: HTMLElement;
  private deleteConfirm: HTMLElement;
  private confirmDeleteBtn: HTMLButtonElement;
  private cancelDeleteBtn: HTMLButtonElement;
  private furnitureList: HTMLElement;
  private lightSlider: HTMLInputElement;
  private lightValue: HTMLElement;
  private furnitureInfoSection: HTMLElement;
  private furnitureNameEl: HTMLElement;
  private furniturePosXEl: HTMLElement;
  private furniturePosZEl: HTMLElement;
  private furnitureRotationEl: HTMLElement;

  constructor() {
    this.canvas = document.getElementById('sceneCanvas') as HTMLCanvasElement;
    this.angleIndicator = document.getElementById('angleIndicator') as HTMLElement;
    this.angleValue = document.getElementById('angleValue') as HTMLElement;
    this.deleteConfirm = document.getElementById('deleteConfirm') as HTMLElement;
    this.confirmDeleteBtn = document.getElementById('confirmDelete') as HTMLButtonElement;
    this.cancelDeleteBtn = document.getElementById('cancelDelete') as HTMLButtonElement;
    this.furnitureList = document.getElementById('furnitureList') as HTMLElement;
    this.lightSlider = document.getElementById('lightIntensity') as HTMLInputElement;
    this.lightValue = document.getElementById('lightValue') as HTMLElement;
    this.furnitureInfoSection = document.getElementById('furnitureInfoSection') as HTMLElement;
    this.furnitureNameEl = document.getElementById('furnitureName') as HTMLElement;
    this.furniturePosXEl = document.getElementById('furniturePosX') as HTMLElement;
    this.furniturePosZEl = document.getElementById('furniturePosZ') as HTMLElement;
    this.furnitureRotationEl = document.getElementById('furnitureRotation') as HTMLElement;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xF5F5F5);
    this.scene.fog = new THREE.Fog(0xF5F5F5, 8, 15);

    const container = this.canvas.parentElement!;
    this.camera = new THREE.PerspectiveCamera(
      50,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    this.camera.position.set(4, 4, 4);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 2;
    this.controls.maxDistance = 10;
    this.controls.maxPolarAngle = Math.PI / 2.2;
    this.controls.target.set(0, 0.5, 0);
    this.controls.update();

    this.furnitureManager = new FurnitureManager(this.scene);
    this.environmentManager = new EnvironmentManager(this.scene);
    
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.clock = new THREE.Clock();

    this.bindEvents();
    this.animate();
  }

  private bindEvents(): void {
    window.addEventListener('resize', () => this.onWindowResize());

    this.furnitureList.addEventListener('click', (e) => {
      const item = (e.target as HTMLElement).closest('.furniture-item');
      if (item) {
        const type = item.getAttribute('data-type') as FurnitureType;
        this.selectFurnitureType(type, item as HTMLElement);
      }
    });

    document.querySelectorAll('.section-header').forEach(header => {
      header.addEventListener('click', () => {
        header.classList.toggle('collapsed');
      });
    });

    document.querySelectorAll('.color-swatch').forEach(swatch => {
      swatch.addEventListener('click', () => {
        document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
        swatch.classList.add('active');
        const colorHex = parseInt((swatch as HTMLElement).dataset.color!.replace('#', ''), 16);
        this.environmentManager.setWallColor(colorHex);
      });
    });

    document.querySelectorAll('.material-option').forEach(opt => {
      opt.addEventListener('click', () => {
        document.querySelectorAll('.material-option').forEach(o => o.classList.remove('active'));
        opt.classList.add('active');
        const material = (opt as HTMLElement).dataset.material as FloorMaterialType;
        this.environmentManager.setFloorMaterial(material);
      });
    });

    this.lightSlider.addEventListener('input', () => {
      const value = parseFloat(this.lightSlider.value);
      this.lightValue.textContent = value.toFixed(1);
      this.environmentManager.setLightIntensity(value);
    });

    this.confirmDeleteBtn.addEventListener('click', () => {
      if (this.itemPendingDelete) {
        this.furnitureManager.deleteItem(this.itemPendingDelete);
        this.itemPendingDelete = null;
        this.hideDeleteConfirm();
        this.hideFurnitureInfo();
      }
    });

    this.cancelDeleteBtn.addEventListener('click', () => {
      this.itemPendingDelete = null;
      this.hideDeleteConfirm();
    });

    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
    this.canvas.addEventListener('mouseleave', (e) => this.onMouseUp(e));
    this.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.onRightClick(e);
    });
    this.canvas.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
  }

  private selectFurnitureType(type: FurnitureType, element: HTMLElement): void {
    document.querySelectorAll('.furniture-item').forEach(i => i.classList.remove('active'));
    element.classList.add('active');
    this.selectedFurnitureType = type;
    
    const position = new THREE.Vector3(
      (Math.random() - 0.5) * 2,
      0,
      (Math.random() - 0.5) * 2
    );
    const item = this.furnitureManager.createFurniture(type, position);
    if (item) {
      this.furnitureManager.selectItem(item);
      this.showFurnitureInfo(item);
    }
  }

  private onWindowResize(): void {
    const container = this.canvas.parentElement!;
    this.camera.aspect = container.clientWidth / container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(container.clientWidth, container.clientHeight);
  }

  private updateMouse(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private getFloorIntersection(): THREE.Vector3 | null {
    const floor = this.environmentManager.getFloorMesh();
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(floor);
    if (intersects.length > 0) {
      return intersects[0].point;
    }
    return null;
  }

  private getFurnitureIntersection(): FurnitureItem | null {
    const furnitureGroups = this.furnitureManager.getItems().map(i => i.group);
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(furnitureGroups, true);
    if (intersects.length > 0) {
      return this.furnitureManager.findItemByGroup(intersects[0].object);
    }
    return null;
  }

  private onMouseDown(e: MouseEvent): void {
    if (e.button !== 0) return;

    this.updateMouse(e);
    const hitItem = this.getFurnitureIntersection();
    
    if (hitItem) {
      this.isDragging = true;
      this.dragItem = hitItem;
      this.controls.enabled = false;
      this.furnitureManager.selectItem(hitItem);
      this.showFurnitureInfo(hitItem);
    } else {
      this.furnitureManager.selectItem(null);
      this.hideFurnitureInfo();
    }
  }

  private onMouseMove(e: MouseEvent): void {
    this.updateMouse(e);

    if (this.isDragging && this.dragItem) {
      const floorPoint = this.getFloorIntersection();
      if (floorPoint) {
        this.furnitureManager.moveItem(this.dragItem, floorPoint.x, floorPoint.z);
        this.updateFurnitureInfo(this.dragItem);
      }
    } else {
      const hoveredItem = this.getFurnitureIntersection();
      this.furnitureManager.setHoveredItem(hoveredItem);
      this.canvas.style.cursor = hoveredItem ? 'pointer' : 'default';
    }
  }

  private onMouseUp(e: MouseEvent): void {
    if (e.button !== 0) return;

    if (this.isDragging && this.dragItem) {
      this.furnitureManager.snapItemToGrid(this.dragItem);
      this.updateFurnitureInfo(this.dragItem);
    }

    this.isDragging = false;
    this.dragItem = null;
    this.controls.enabled = true;
  }

  private onRightClick(e: MouseEvent): void {
    this.updateMouse(e);
    const hitItem = this.getFurnitureIntersection();
    
    if (hitItem) {
      this.itemPendingDelete = hitItem;
      this.showDeleteConfirm();
    }
  }

  private onWheel(e: WheelEvent): void {
    this.updateMouse(e);
    const selectedItem = this.furnitureManager.getSelectedItem();
    const hoveredItem = this.getFurnitureIntersection();
    const targetItem = selectedItem || hoveredItem;

    if (targetItem) {
      e.preventDefault();
      e.stopPropagation();
      this.controls.enabled = false;

      const rotationDelta = e.deltaY > 0 ? Math.PI / 4 : -Math.PI / 4;
      const newRotation = this.furnitureManager.rotateItem(targetItem, rotationDelta);
      
      this.showAngleIndicator(newRotation);

      setTimeout(() => {
        this.controls.enabled = true;
      }, 100);
    }
  }

  private showAngleIndicator(rotation: number): void {
    const degrees = Math.round((rotation * 180) / Math.PI) % 360;
    const normalizedDegrees = degrees < 0 ? degrees + 360 : degrees;
    this.angleValue.textContent = `${normalizedDegrees}°`;
    this.angleIndicator.style.display = 'block';

    if (this.angleIndicatorTimeout) {
      window.clearTimeout(this.angleIndicatorTimeout);
    }

    this.angleIndicatorTimeout = window.setTimeout(() => {
      this.angleIndicator.style.display = 'none';
      const selected = this.furnitureManager.getSelectedItem();
      if (selected) {
        this.furnitureManager.snapItemToGrid(selected);
        this.updateFurnitureInfo(selected);
      }
    }, 800);
  }

  private showDeleteConfirm(): void {
    this.deleteConfirm.style.display = 'flex';
    this.controls.enabled = false;
  }

  private hideDeleteConfirm(): void {
    this.deleteConfirm.style.display = 'none';
    this.controls.enabled = true;
  }

  private showFurnitureInfo(item: FurnitureItem): void {
    this.furnitureInfoSection.style.display = 'block';
    this.updateFurnitureInfo(item);
  }

  private hideFurnitureInfo(): void {
    this.furnitureInfoSection.style.display = 'none';
  }

  private updateFurnitureInfo(item: FurnitureItem): void {
    this.furnitureNameEl.textContent = item.name;
    this.furniturePosXEl.textContent = item.group.position.x.toFixed(2) + ' m';
    this.furniturePosZEl.textContent = item.group.position.z.toFixed(2) + ' m';
    
    const degrees = Math.round((item.targetRotation * 180) / Math.PI) % 360;
    const normalizedDegrees = degrees < 0 ? degrees + 360 : degrees;
    this.furnitureRotationEl.textContent = `${normalizedDegrees}°`;
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());

    const deltaTime = Math.min(this.clock.getDelta(), 0.1);

    this.controls.update();
    this.furnitureManager.update(deltaTime);
    this.environmentManager.update(deltaTime);

    const selected = this.furnitureManager.getSelectedItem();
    if (selected) {
      this.updateFurnitureInfo(selected);
    }

    this.renderer.render(this.scene, this.camera);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new RoomLayoutApp();
});
