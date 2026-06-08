import * as THREE from 'three';
import { ModelManager, GeometryType } from './ModelManager';
import { LightManager } from './LightManager';
import { UIController } from './UIController';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private canvas: HTMLCanvasElement;

  private modelManager: ModelManager;
  private lightManager: LightManager;
  private uiController: UIController;

  private cameraTheta: number = Math.PI / 4;
  private cameraPhi: number = Math.PI / 6;
  private cameraDistance: number = 8;
  private cameraTarget: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

  private isRotating: boolean = false;
  private isDraggingLight: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;

  private readonly MIN_DISTANCE = 3;
  private readonly MAX_DISTANCE = 20;
  private readonly MIN_PHI = -70 * Math.PI / 180 + Math.PI / 2;
  private readonly MAX_PHI = 70 * Math.PI / 180 + Math.PI / 2;

  private animationFrameId: number | null = null;

  constructor() {
    const canvasContainer = document.getElementById('canvas-container')!;
    const uiContainer = document.getElementById('ui-container')!;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);
    this.scene.fog = new THREE.Fog(0x1a1a2e, 15, 40);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    this.updateCameraPosition();

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    this.canvas = this.renderer.domElement;
    canvasContainer.appendChild(this.canvas);

    this.addGroundPlane();
    this.addGridHelper();

    this.modelManager = new ModelManager(this.scene);
    this.lightManager = new LightManager(this.scene);

    this.uiController = new UIController(
      uiContainer,
      this.modelManager,
      this.lightManager,
      { reset: () => this.resetCamera() }
    );

    this.uiController.setOnGeometryChangeCallback((type: GeometryType) => {
      this.modelManager.switchGeometry(type);
    });

    this.bindMouseEvents();
    this.bindResizeEvent();
    this.startAnimationLoop();
  }

  private addGroundPlane(): void {
    const geometry = new THREE.PlaneGeometry(50, 50);
    const material = new THREE.MeshStandardMaterial({
      color: 0x1a1a2e,
      roughness: 0.9,
      metalness: 0.1,
      transparent: true,
      opacity: 0.5
    });
    const plane = new THREE.Mesh(geometry, material);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = -3;
    plane.receiveShadow = true;
    this.scene.add(plane);
  }

  private addGridHelper(): void {
    const grid = new THREE.GridHelper(20, 20, 0x444466, 0x333355);
    grid.position.y = -2.99;
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.3;
    this.scene.add(grid);
  }

  private updateCameraPosition(): void {
    const phi = THREE.MathUtils.clamp(this.cameraPhi, this.MIN_PHI, this.MAX_PHI);
    const distance = THREE.MathUtils.clamp(this.cameraDistance, this.MIN_DISTANCE, this.MAX_DISTANCE);

    this.camera.position.x = this.cameraTarget.x + distance * Math.sin(phi) * Math.sin(this.cameraTheta);
    this.camera.position.y = this.cameraTarget.y + distance * Math.cos(phi);
    this.camera.position.z = this.cameraTarget.z + distance * Math.sin(phi) * Math.cos(this.cameraTheta);

    this.camera.lookAt(this.cameraTarget);
    this.cameraDistance = distance;
    this.cameraPhi = phi;

    if (this.lightManager) {
      this.lightManager.adjustPointLightIntensityByDistance(this.cameraDistance);
    }
  }

  private resetCamera(): void {
    this.cameraTheta = Math.PI / 4;
    this.cameraPhi = Math.PI / 6;
    this.cameraDistance = 8;
    this.cameraTarget.set(0, 0, 0);
    this.updateCameraPosition();
  }

  private bindMouseEvents(): void {
    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button === 2) {
        const lightId = this.lightManager.getMarkerAtPosition(
          e.clientX, e.clientY, this.camera, this.canvas
        );
        if (lightId) {
          this.isDraggingLight = true;
          this.lightManager.startDrag(lightId, e.clientX, e.clientY, this.camera, this.canvas);
        }
      } else if (e.button === 0) {
        this.isRotating = true;
      }
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isDraggingLight) {
        this.lightManager.updateDrag(e.clientX, e.clientY, this.camera, this.canvas);
        this.uiController.refreshLightPositions();
      } else if (this.isRotating) {
        const deltaX = e.clientX - this.lastMouseX;
        const deltaY = e.clientY - this.lastMouseY;

        this.cameraTheta -= deltaX * 0.005;
        this.cameraPhi -= deltaY * 0.005;

        this.updateCameraPosition();

        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 2 && this.isDraggingLight) {
        this.isDraggingLight = false;
        this.lightManager.endDrag();
        this.uiController.refreshLightPositions();
      }
      if (e.button === 0) {
        this.isRotating = false;
      }
    });

    this.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomSpeed = 0.001;
      this.cameraDistance += e.deltaY * zoomSpeed * this.cameraDistance;
      this.updateCameraPosition();
    }, { passive: false });
  }

  private bindResizeEvent(): void {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  private startAnimationLoop(): void {
    const animate = (time: number) => {
      this.animationFrameId = requestAnimationFrame(animate);
      this.lightManager.updateDraggingAnimation(time);
      this.renderer.render(this.scene, this.camera);
    };

    this.animationFrameId = requestAnimationFrame(animate);
  }

  public dispose(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.modelManager.dispose();
    this.lightManager.dispose();
    this.renderer.dispose();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
