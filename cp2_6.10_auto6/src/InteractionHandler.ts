import * as THREE from 'three';
import { VeinParticles } from './VeinParticles';

export class InteractionHandler {
  private camera: THREE.PerspectiveCamera;
  private scene: THREE.Scene;
  private veinParticles: VeinParticles;
  private renderer: THREE.WebGLRenderer;
  private domElement: HTMLElement;

  private isDragging: boolean = false;
  private previousMouse: { x: number; y: number } = { x: 0, y: 0 };

  private rotationX: number = 0;
  private rotationY: number = 0;
  private targetRotationX: number = 0;
  private targetRotationY: number = 0;

  private zoomFactor: number = 1.0;
  private targetZoomFactor: number = 1.0;
  private baseDistance: number = 20;

  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;

  private shiftPressed: boolean = false;
  private shiftSelectedCluster: number = -1;

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
    this.raycaster.params.Points = { threshold: 0.5 };
    this.mouse = new THREE.Vector2();

    this.bindEvents();
  }

  private bindEvents(): void {
    this.domElement.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.domElement.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.domElement.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.domElement.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
    this.domElement.addEventListener('keydown', this.onKeyDown.bind(this));
    this.domElement.addEventListener('keyup', this.onKeyUp.bind(this));
    this.domElement.addEventListener('click', this.onClick.bind(this));
    window.addEventListener('keydown', this.onKeyDown.bind(this));
    window.addEventListener('keyup', this.onKeyUp.bind(this));
  }

  private onMouseDown(e: MouseEvent): void {
    if (e.button === 0) {
      this.isDragging = true;
      this.previousMouse.x = e.clientX;
      this.previousMouse.y = e.clientY;
    }
  }

  private onMouseMove(e: MouseEvent): void {
    if (this.isDragging) {
      const deltaX = e.clientX - this.previousMouse.x;
      const deltaY = e.clientY - this.previousMouse.y;

      this.targetRotationY += deltaX * 0.005;
      this.targetRotationX += deltaY * 0.005;

      this.targetRotationX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.targetRotationX));

      this.previousMouse.x = e.clientX;
      this.previousMouse.y = e.clientY;
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
    const delta = e.deltaY * 0.001;
    this.targetZoomFactor *= 1 + delta;
    this.targetZoomFactor = Math.max(0.5, Math.min(5.0, this.targetZoomFactor));
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Shift') {
      this.shiftPressed = true;
    }
  }

  private onKeyUp(e: KeyboardEvent): void {
    if (e.key === 'Shift') {
      this.shiftPressed = false;
      this.shiftSelectedCluster = -1;
    }
  }

  private onClick(e: MouseEvent): void {
    if (this.isDragging) return;

    this.updateMouseCoords(e);
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const intersects = this.raycaster.intersectObject(this.veinParticles.points);
    if (intersects.length === 0) {
      this.veinParticles.setHoveredCluster(-1);
      return;
    }

    const hitPoint = intersects[0].point;
    const clusterId = this.veinParticles.getClusterAtPosition(hitPoint, 3.0);

    if (clusterId < 0) return;

    if (this.shiftPressed) {
      this.handleShiftClick(clusterId);
    } else {
      this.veinParticles.triggerBurst(clusterId, this.elapsedTime);
    }
  }

  private handleHover(e: MouseEvent): void {
    this.updateMouseCoords(e);
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const intersects = this.raycaster.intersectObject(this.veinParticles.points);
    if (intersects.length > 0) {
      const hitPoint = intersects[0].point;
      const clusterId = this.veinParticles.getClusterAtPosition(hitPoint, 3.0);
      this.veinParticles.setHoveredCluster(clusterId);
    } else {
      this.veinParticles.setHoveredCluster(-1);
    }
  }

  private handleShiftClick(clusterId: number): void {
    if (this.shiftSelectedCluster < 0) {
      this.shiftSelectedCluster = clusterId;
    } else if (this.shiftSelectedCluster !== clusterId) {
      this.veinParticles.mergeClusters(
        this.shiftSelectedCluster,
        clusterId,
        this.elapsedTime
      );
      this.shiftSelectedCluster = -1;
    }
  }

  private updateMouseCoords(e: MouseEvent): void {
    const rect = this.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  public update(deltaTime: number, elapsedTime: number): void {
    this.elapsedTime = elapsedTime;

    const lerpFactor = 1 - Math.pow(0.001, deltaTime);
    this.rotationX += (this.targetRotationX - this.rotationX) * lerpFactor;
    this.rotationY += (this.targetRotationY - this.rotationY) * lerpFactor;
    this.zoomFactor += (this.targetZoomFactor - this.zoomFactor) * lerpFactor;

    const distance = this.baseDistance * this.zoomFactor;
    const x = distance * Math.sin(this.rotationY) * Math.cos(this.rotationX);
    const y = distance * Math.sin(this.rotationX);
    const z = distance * Math.cos(this.rotationY) * Math.cos(this.rotationX);

    this.camera.position.set(x, y, z);
    this.camera.lookAt(0, 0, 0);
  }
}
