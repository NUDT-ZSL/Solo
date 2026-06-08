import * as THREE from 'three';
import { BuildingManager, BuildingType } from './BuildingManager';
import { EnvironmentManager } from './EnvironmentManager';
import { UIManager } from './UIManager';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private canvas: HTMLCanvasElement;
  private container: HTMLElement;

  private buildingManager: BuildingManager;
  private environmentManager: EnvironmentManager;
  private uiManager: UIManager;

  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private groundPlane: THREE.Plane;

  private previewMesh: THREE.Mesh | null = null;
  private isDraggingBuilding: boolean = false;
  private draggingBuildingType: BuildingType | null = null;

  private clock: THREE.Clock;

  private isPointerLocked: boolean = false;
  private isRotating: boolean = false;
  private isPanning: boolean = false;
  private lastPointerX: number = 0;
  private lastPointerY: number = 0;
  private spherical: { radius: number; theta: number; phi: number };
  private cameraTarget: THREE.Vector3;

  constructor() {
    this.canvas = document.getElementById('scene-canvas') as HTMLCanvasElement;
    if (!this.canvas) throw new Error('Canvas element not found');

    this.container = document.getElementById('scene-container') as HTMLElement;
    if (!this.container) throw new Error('Scene container not found');

    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);

    this.camera = new THREE.PerspectiveCamera(
      45,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      1000
    );

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    this.cameraTarget = new THREE.Vector3(0, 0, 0);
    this.spherical = {
      radius: 22,
      theta: Math.PI * 0.25,
      phi: Math.PI * 0.35,
    };
    this.updateCameraPosition();

    this.buildingManager = new BuildingManager(this.scene, (count) => {
      this.uiManager.updateBuildingCount(count, BuildingManager.MAX_BUILDINGS);
    });

    this.environmentManager = new EnvironmentManager(
      this.scene,
      this.camera,
      this.renderer
    );

    this.uiManager = new UIManager();

    this.setupEventListeners();
    this.uiManager.setTime(12);
    this.uiManager.updateBuildingCount(0, BuildingManager.MAX_BUILDINGS);
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.onResize.bind(this));

    this.canvas.addEventListener('dragover', this.onDragOver.bind(this));
    this.canvas.addEventListener('dragleave', this.onDragLeave.bind(this));
    this.canvas.addEventListener('drop', this.onDrop.bind(this));

    this.uiManager.setTimeChangeCallback((time) => {
      this.environmentManager.setTime(time);
      this.updateWindowState();
    });

    this.uiManager.setBuildingDragCallbacks(
      (type) => {
        this.isDraggingBuilding = true;
        this.draggingBuildingType = type;
        this.createPreviewMesh(type);
      },
      () => {
        this.isDraggingBuilding = false;
        this.draggingBuildingType = null;
        this.removePreviewMesh();
      }
    );

    this.canvas.addEventListener('pointerdown', this.onPointerDown.bind(this));
    window.addEventListener('pointermove', this.onPointerMove.bind(this));
    window.addEventListener('pointerup', this.onPointerUp.bind(this));
    this.canvas.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private createPreviewMesh(type: BuildingType): void {
    this.removePreviewMesh();
    this.previewMesh = this.buildingManager.createPreviewMesh(type);
    this.scene.add(this.previewMesh);
  }

  private removePreviewMesh(): void {
    if (this.previewMesh) {
      this.scene.remove(this.previewMesh);
      if (this.previewMesh.geometry) this.previewMesh.geometry.dispose();
      if (this.previewMesh.material) {
        const mat = this.previewMesh.material as THREE.Material;
        mat.dispose();
      }
      this.previewMesh = null;
    }
  }

  private onResize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private onDragOver(e: DragEvent): void {
    e.preventDefault();
    if (!e.dataTransfer) return;
    e.dataTransfer.dropEffect = 'copy';

    if (!this.isDraggingBuilding || !this.previewMesh) return;
    this.updateMouseAndPreview(e);
  }

  private onDragLeave(_e: DragEvent): void {
    /* noop */
  }

  private onDrop(e: DragEvent): void {
    e.preventDefault();
    if (!e.dataTransfer) return;

    const type = e.dataTransfer.getData('text/plain') as BuildingType;
    if (!type) return;

    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersectPoint = new THREE.Vector3();
    if (!this.raycaster.ray.intersectPlane(this.groundPlane, intersectPoint)) {
      this.removePreviewMesh();
      return;
    }

    const { gridX, gridZ } = this.buildingManager.snapToGrid(
      intersectPoint.x,
      intersectPoint.z
    );

    if (!this.buildingManager.isCellOccupied(gridX, gridZ)) {
      this.buildingManager.placeBuilding(type, gridX, gridZ);
    }

    this.removePreviewMesh();
  }

  private updateMouseAndPreview(e: DragEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersectPoint = new THREE.Vector3();
    if (!this.raycaster.ray.intersectPlane(this.groundPlane, intersectPoint)) return;

    const { gridX, gridZ } = this.buildingManager.snapToGrid(
      intersectPoint.x,
      intersectPoint.z
    );

    if (this.previewMesh) {
      this.previewMesh.position.set(gridX, this.previewMesh.position.y, gridZ);
      const isOccupied = this.buildingManager.isCellOccupied(gridX, gridZ);
      const mat = this.previewMesh.material as THREE.MeshStandardMaterial;
      if (isOccupied) {
        mat.color.setHex(0xff4444);
        mat.opacity = 0.3;
      } else {
        const config = {
          [BuildingType.LOW_RISE]: '#F5E6CC',
          [BuildingType.MID_RISE]: '#B3D4FC',
          [BuildingType.HIGH_RISE]: '#2C3E50',
        }[this.draggingBuildingType as BuildingType] || '#ffffff';
        mat.color.set(config);
        mat.opacity = 0.5;
      }
    }
  }

  private onPointerDown(e: PointerEvent): void {
    if (this.isDraggingBuilding) return;

    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;

    if (e.button === 0) {
      this.isRotating = true;
    } else if (e.button === 2) {
      this.isPanning = true;
    }
  }

  private onPointerMove(e: PointerEvent): void {
    if (!this.isRotating && !this.isPanning) return;

    const dx = e.clientX - this.lastPointerX;
    const dy = e.clientY - this.lastPointerY;
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;

    if (this.isRotating) {
      this.spherical.theta -= dx * 0.005;
      this.spherical.phi -= dy * 0.005;
      this.spherical.phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, this.spherical.phi));
      this.updateCameraPosition();
    }

    if (this.isPanning) {
      const panSpeed = 0.02 * this.spherical.radius;
      const right = new THREE.Vector3();
      const up = new THREE.Vector3(0, 1, 0);
      this.camera.getWorldDirection(right);
      right.cross(up).normalize();
      this.cameraTarget.addScaledVector(right, -dx * panSpeed);
      this.cameraTarget.y += dy * panSpeed;
      this.cameraTarget.y = Math.max(-2, Math.min(10, this.cameraTarget.y));
      this.updateCameraPosition();
    }
  }

  private onPointerUp(_e: PointerEvent): void {
    this.isRotating = false;
    this.isPanning = false;
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
    this.spherical.radius *= zoomFactor;
    this.spherical.radius = Math.max(8, Math.min(50, this.spherical.radius));
    this.updateCameraPosition();
  }

  private updateCameraPosition(): void {
    const { radius, theta, phi } = this.spherical;
    const x = this.cameraTarget.x + radius * Math.sin(phi) * Math.cos(theta);
    const y = this.cameraTarget.y + radius * Math.cos(phi);
    const z = this.cameraTarget.z + radius * Math.sin(phi) * Math.sin(theta);
    this.camera.position.set(x, y, z);
    this.camera.lookAt(this.cameraTarget);
  }

  private updateWindowState(): void {
    const isNight = this.environmentManager.isNight();
    const progress = this.environmentManager.getNightTransitionProgress();
    this.buildingManager.updateWindowVisibility(isNight, progress);
  }

  public start(): void {
    this.animate();
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());

    const delta = Math.min(this.clock.getDelta(), 0.1);

    this.buildingManager.updateAnimations(delta);
    this.updateWindowState();

    this.renderer.render(this.scene, this.camera);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  try {
    const app = new App();
    app.start();
  } catch (err) {
    console.error('Failed to initialize app:', err);
  }
});
