import * as THREE from 'three';
import { Crystal } from './Crystal';

export class InteractionManager {
  private isDragging: boolean = false;
  private previousMouse: { x: number; y: number } = { x: 0, y: 0 };
  private targetRotationX: number = 0;
  private targetRotationY: number = 0;
  private currentRotationX: number = 0;
  private currentRotationY: number = 0;
  private targetDistance: number = 8;
  private currentDistance: number = 8;
  private autoRotationSpeed: number = 0.12;
  private isAutoRotating: boolean = true;
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private mouse: THREE.Vector2 = new THREE.Vector2();
  private dampingFactor: number = 0.08;
  private minDistance: number = 4;
  private maxDistance: number = 16;
  private resetViewRequested: boolean = false;
  private defaultRotationX: number = 0.3;
  private defaultRotationY: number = 0;
  private defaultDistance: number = 8;

  constructor(
    private camera: THREE.PerspectiveCamera,
    private crystal: Crystal,
    private domElement: HTMLElement
  ) {
    this._bindEvents();
  }

  get rotationX(): number {
    return this.currentRotationX;
  }

  get rotationY(): number {
    return this.currentRotationY;
  }

  get distance(): number {
    return this.currentDistance;
  }

  set autoRotate(v: boolean) {
    this.isAutoRotating = v;
  }

  get autoRotate(): boolean {
    return this.isAutoRotating;
  }

  requestResetView(): void {
    this.resetViewRequested = true;
  }

  update(delta: number): void {
    if (this.isAutoRotating && !this.isDragging) {
      this.targetRotationY += delta * this.autoRotationSpeed;
    }

    if (this.resetViewRequested) {
      this.targetRotationX = this.defaultRotationX;
      this.targetRotationY = this.defaultRotationY;
      this.targetDistance = this.defaultDistance;
      this.resetViewRequested = false;
    }

    this.currentRotationX += (this.targetRotationX - this.currentRotationX) * this.dampingFactor;
    this.currentRotationY += (this.targetRotationY - this.currentRotationY) * this.dampingFactor;
    this.currentDistance += (this.targetDistance - this.currentDistance) * this.dampingFactor;

    const x = Math.sin(this.currentRotationY) * Math.cos(this.currentRotationX) * this.currentDistance;
    const y = Math.sin(this.currentRotationX) * this.currentDistance;
    const z = Math.cos(this.currentRotationY) * Math.cos(this.currentRotationX) * this.currentDistance;

    this.camera.position.set(x, y, z);
    this.camera.lookAt(0, 1.5, 0);
  }

  private _bindEvents(): void {
    this.domElement.addEventListener('mousedown', this._onMouseDown.bind(this));
    this.domElement.addEventListener('mousemove', this._onMouseMove.bind(this));
    this.domElement.addEventListener('mouseup', this._onMouseUp.bind(this));
    this.domElement.addEventListener('wheel', this._onWheel.bind(this), { passive: false });
    this.domElement.addEventListener('click', this._onClick.bind(this));
    this.domElement.addEventListener('contextmenu', (e) => e.preventDefault());

    this.domElement.addEventListener('touchstart', this._onTouchStart.bind(this), { passive: false });
    this.domElement.addEventListener('touchmove', this._onTouchMove.bind(this), { passive: false });
    this.domElement.addEventListener('touchend', this._onTouchEnd.bind(this));
  }

  private _onMouseDown(e: MouseEvent): void {
    this.isDragging = true;
    this.previousMouse.x = e.clientX;
    this.previousMouse.y = e.clientY;
  }

  private _onMouseMove(e: MouseEvent): void {
    if (!this.isDragging) return;
    const dx = e.clientX - this.previousMouse.x;
    const dy = e.clientY - this.previousMouse.y;
    this.targetRotationY += dx * 0.005;
    this.targetRotationX += dy * 0.005;
    this.targetRotationX = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, this.targetRotationX));
    this.previousMouse.x = e.clientX;
    this.previousMouse.y = e.clientY;
  }

  private _onMouseUp(): void {
    this.isDragging = false;
  }

  private _onWheel(e: WheelEvent): void {
    e.preventDefault();
    this.targetDistance += e.deltaY * 0.01;
    this.targetDistance = Math.max(this.minDistance, Math.min(this.maxDistance, this.targetDistance));
  }

  private _onClick(e: MouseEvent): void {
    if (this.isDragging) return;
    const rect = this.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.crystal.group, true);

    if (intersects.length > 0) {
      const hitPoint = intersects[0].point;
      this.crystal.triggerPulse(hitPoint);
    }
  }

  private _onTouchStart(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length === 1) {
      this.isDragging = true;
      this.previousMouse.x = e.touches[0].clientX;
      this.previousMouse.y = e.touches[0].clientY;
    }
  }

  private _onTouchMove(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length === 1 && this.isDragging) {
      const dx = e.touches[0].clientX - this.previousMouse.x;
      const dy = e.touches[0].clientY - this.previousMouse.y;
      this.targetRotationY += dx * 0.005;
      this.targetRotationX += dy * 0.005;
      this.targetRotationX = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, this.targetRotationX));
      this.previousMouse.x = e.touches[0].clientX;
      this.previousMouse.y = e.touches[0].clientY;
    } else if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      if ((this as unknown as Record<string, number>)._lastPinchDist) {
        const delta = (this as unknown as Record<string, number>)._lastPinchDist - dist;
        this.targetDistance += delta * 0.02;
        this.targetDistance = Math.max(this.minDistance, Math.min(this.maxDistance, this.targetDistance));
      }
      (this as unknown as Record<string, number>)._lastPinchDist = dist;
    }
  }

  private _onTouchEnd(): void {
    this.isDragging = false;
    delete (this as unknown as Record<string, number | undefined>)._lastPinchDist;
  }
}
