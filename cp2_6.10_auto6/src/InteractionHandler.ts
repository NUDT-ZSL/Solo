import * as THREE from 'three';
import { VeinParticles } from './VeinParticles';

export class InteractionHandler {
  private camera: THREE.PerspectiveCamera;
  private veinParticles: VeinParticles;
  private renderer: THREE.WebGLRenderer;
  private domElement: HTMLElement;

  private isDragging: boolean = false;
  private prevMouseX: number = 0;
  private prevMouseY: number = 0;

  private rotationX: number = -0.1;
  private rotationY: number = 0;
  private targetRotationX: number = -0.1;
  private targetRotationY: number = 0;

  private zoom: number = 1.0;
  private targetZoom: number = 1.0;
  private baseDistance: number = 22;

  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;

  private shiftPressed: boolean = false;
  private shiftFirstCluster: number = -1;
  private shiftMarkerMesh: THREE.Mesh | null = null;
  private scene: THREE.Scene;

  private elapsedTime: number = 0;

  constructor(
    camera: THREE.PerspectiveCamera,
    scene: THREE.Scene,
    veinParticles: VeinParticles,
    renderer: THREE.WebGLRenderer
  ) {
    this.camera = camera;
    this.scene = scene;
    this.veinParticles = veinParticles;
    this.renderer = renderer;
    this.domElement = renderer.domElement;

    this.raycaster = new THREE.Raycaster();
    this.raycaster.params.Points = { threshold: 0.3 };
    this.mouse = new THREE.Vector2();

    this.bindEvents();
    this.updateCamera();
  }

  private bindEvents(): void {
    const el = this.domElement;

    el.addEventListener('mousedown', this.onMouseDown.bind(this));
    window.addEventListener('mousemove', this.onMouseMove.bind(this));
    window.addEventListener('mouseup', this.onMouseUp.bind(this));
    el.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
    el.addEventListener('click', this.onClick.bind(this));
    window.addEventListener('keydown', this.onKeyDown.bind(this));
    window.addEventListener('keyup', this.onKeyUp.bind(this));
    window.addEventListener('resize', this.onResize.bind(this));
  }

  private onMouseDown(e: MouseEvent): void {
    if (e.button !== 0) return;
    this.isDragging = true;
    this.prevMouseX = e.clientX;
    this.prevMouseY = e.clientY;
  }

  private onMouseMove(e: MouseEvent): void {
    if (this.isDragging) {
      const dx = e.clientX - this.prevMouseX;
      const dy = e.clientY - this.prevMouseY;

      this.targetRotationY += dx * 0.008;
      this.targetRotationX += dy * 0.008;

      this.targetRotationX = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, this.targetRotationX));

      this.prevMouseX = e.clientX;
      this.prevMouseY = e.clientY;
    } else {
      this.handleHover(e);
    }
  }

  private onMouseUp(e: MouseEvent): void {
    if (e.button === 0) {
      this.isDragging = false;
    }
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 1.1 : 0.9;
    this.targetZoom *= delta;
    this.targetZoom = Math.max(0.5, Math.min(5.0, this.targetZoom));
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Shift') {
      this.shiftPressed = true;
    }
  }

  private onKeyUp(e: KeyboardEvent): void {
    if (e.key === 'Shift') {
      this.shiftPressed = false;
      this.shiftFirstCluster = -1;
      this.hideShiftMarker();
    }
  }

  private onClick(e: MouseEvent): void {
    if (this.isDragging) return;

    this.updateMouseCoords(e);
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const intersects = this.raycaster.intersectObject(this.veinParticles.points);
    if (intersects.length === 0) return;

    const hitPoint = intersects[0].point;
    const clusterId = this.veinParticles.getClusterAtPosition(hitPoint, 3.0);
    if (clusterId < 0) return;

    if (this.shiftPressed) {
      this.handleShiftClick(clusterId);
    } else {
      this.veinParticles.triggerBurst(clusterId, this.elapsedTime);
    }
  }

  private handleShiftClick(clusterId: number): void {
    if (this.shiftFirstCluster < 0) {
      this.shiftFirstCluster = clusterId;
      this.showShiftMarker(clusterId);
    } else if (this.shiftFirstCluster !== clusterId) {
      const merged = this.veinParticles.mergeClusters(
        this.shiftFirstCluster,
        clusterId,
        this.elapsedTime
      );
      if (merged) {
        this.shiftFirstCluster = -1;
        this.hideShiftMarker();
      } else {
        this.shiftFirstCluster = clusterId;
        this.showShiftMarker(clusterId);
      }
    }
  }

  private showShiftMarker(clusterId: number): void {
    const cluster = this.veinParticles.getClusters().get(clusterId);
    if (!cluster) return;

    if (!this.shiftMarkerMesh) {
      const geo = new THREE.RingGeometry(cluster.radius * 1.2, cluster.radius * 1.5, 32);
      const mat = new THREE.MeshBasicMaterial({
        color: 0xFFD700,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide
      });
      this.shiftMarkerMesh = new THREE.Mesh(geo, mat);
      this.scene.add(this.shiftMarkerMesh);
    }

    this.shiftMarkerMesh.position.copy(cluster.center);
    this.shiftMarkerMesh.lookAt(this.camera.position);
    this.shiftMarkerMesh.visible = true;
  }

  private hideShiftMarker(): void {
    if (this.shiftMarkerMesh) {
      this.shiftMarkerMesh.visible = false;
    }
  }

  private handleHover(e: MouseEvent): void {
    this.updateMouseCoords(e);
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const intersects = this.raycaster.intersectObject(this.veinParticles.points);
    if (intersects.length > 0) {
      const hitPoint = intersects[0].point;
      const clusterId = this.veinParticles.getClusterAtPosition(hitPoint, 2.5);
      this.veinParticles.setHoveredCluster(clusterId);
      this.domElement.style.cursor = clusterId >= 0 ? 'pointer' : 'grab';
    } else {
      this.veinParticles.setHoveredCluster(-1);
      this.domElement.style.cursor = 'grab';
    }
  }

  private updateMouseCoords(e: MouseEvent): void {
    const rect = this.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private updateCamera(): void {
    const distance = this.baseDistance * this.zoom;
    const x = distance * Math.sin(this.rotationY) * Math.cos(this.rotationX);
    const y = distance * Math.sin(this.rotationX);
    const z = distance * Math.cos(this.rotationY) * Math.cos(this.rotationX);

    this.camera.position.set(x, y, z);
    this.camera.lookAt(0, 0, 0);
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  public update(deltaTime: number, elapsedTime: number): void {
    this.elapsedTime = elapsedTime;

    const t = 1 - Math.pow(0.001, deltaTime);
    this.rotationX += (this.targetRotationX - this.rotationX) * t;
    this.rotationY += (this.targetRotationY - this.rotationY) * t;
    this.zoom += (this.targetZoom - this.zoom) * t;

    this.updateCamera();

    if (this.shiftMarkerMesh && this.shiftMarkerMesh.visible) {
      this.shiftMarkerMesh.lookAt(this.camera.position);
    }
  }
}
