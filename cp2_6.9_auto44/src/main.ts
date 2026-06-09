import * as THREE from 'three';
import { PointCloud } from './pointCloud';
import { UIController } from './ui';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private pointCloud!: PointCloud;
  private uiController!: UIController;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private isDragging: boolean = false;
  private previousMouse: THREE.Vector2 = new THREE.Vector2();
  private cameraDistance: number = 3.5;
  private cameraTheta: number = 0;
  private cameraPhi: number = Math.PI / 3;
  private targetTheta: number = 0;
  private targetPhi: number = Math.PI / 3;
  private targetDistance: number = 3.5;
  private readonly ROTATION_SPEED = 0.005;
  private readonly ZOOM_SPEED = 0.001;
  private readonly MIN_DISTANCE = 1.5;
  private readonly MAX_DISTANCE = 8;

  constructor() {
    this.scene = new THREE.Scene();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    const container = document.getElementById('canvas-container')!;
    const width = container.clientWidth;
    const height = container.clientHeight;

    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    this.updateCameraPosition();

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height);
    this.renderer.setClearColor(0x000000, 0);
    container.appendChild(this.renderer.domElement);

    this.init();
  }

  private init(): void {
    this.pointCloud = new PointCloud(this.scene);
    this.uiController = new UIController(this.pointCloud);
    this.setupEventListeners();
    this.animate();
  }

  private updateCameraPosition(): void {
    const x = this.cameraDistance * Math.sin(this.cameraPhi) * Math.sin(this.cameraTheta);
    const y = this.cameraDistance * Math.cos(this.cameraPhi);
    const z = this.cameraDistance * Math.sin(this.cameraPhi) * Math.cos(this.cameraTheta);
    this.camera.position.set(x, y, z);
    this.camera.lookAt(0, 0, 0);
  }

  private setupEventListeners(): void {
    const canvas = this.renderer.domElement;
    const container = document.getElementById('canvas-container')!;

    canvas.addEventListener('pointerdown', (e) => {
      this.isDragging = true;
      this.previousMouse.set(e.clientX, e.clientY);
      canvas.setPointerCapture(e.pointerId);
    });

    canvas.addEventListener('pointermove', (e) => {
      if (this.isDragging) {
        const deltaX = e.clientX - this.previousMouse.x;
        const deltaY = e.clientY - this.previousMouse.y;

        if (!this.pointCloud.isAutoRotating()) {
          this.targetTheta -= deltaX * this.ROTATION_SPEED;
          this.targetPhi = Math.max(
            0.1,
            Math.min(Math.PI - 0.1, this.targetPhi - deltaY * this.ROTATION_SPEED)
          );
        }

        this.previousMouse.set(e.clientX, e.clientY);
      }
    });

    canvas.addEventListener('pointerup', (e) => {
      if (this.isDragging) {
        const moved = Math.abs(e.clientX - this.previousMouse.x) > 3 ||
                      Math.abs(e.clientY - this.previousMouse.y) > 3;
        this.isDragging = false;
        canvas.releasePointerCapture(e.pointerId);

        if (!moved) {
          this.handleClick(e);
        }
      }
    });

    canvas.addEventListener('pointerleave', () => {
      this.isDragging = false;
    });

    container.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.targetDistance = Math.max(
        this.MIN_DISTANCE,
        Math.min(this.MAX_DISTANCE, this.targetDistance + e.deltaY * this.ZOOM_SPEED)
      );
    }, { passive: false });

    window.addEventListener('resize', () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    });
  }

  private handleClick(e: PointerEvent): void {
    const container = document.getElementById('canvas-container')!;
    const rect = container.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const points = this.pointCloud.getPoints();
    const intersects = this.raycaster.intersectObject(points);

    if (intersects.length > 0) {
      const index = intersects[0].index;
      if (index !== undefined) {
        const info = this.pointCloud.highlightParticle(index, this.camera);
        if (info) {
          this.uiController.showParticleInfo(info);
        }
      }
    }
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    this.cameraTheta += (this.targetTheta - this.cameraTheta) * 0.15;
    this.cameraPhi += (this.targetPhi - this.cameraPhi) * 0.15;
    this.cameraDistance += (this.targetDistance - this.cameraDistance) * 0.15;

    if (!this.pointCloud.isAutoRotating()) {
      this.updateCameraPosition();
    } else {
      const x = this.cameraDistance * Math.sin(this.cameraPhi) * Math.sin(this.cameraTheta);
      const y = this.cameraDistance * Math.cos(this.cameraPhi);
      const z = this.cameraDistance * Math.sin(this.cameraPhi) * Math.cos(this.cameraTheta);
      this.camera.position.set(x, y, z);
      this.camera.lookAt(0, 0, 0);
    }

    this.pointCloud.update(performance.now());
    this.renderer.render(this.scene, this.camera);
  };
}

new App();
