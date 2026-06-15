import * as THREE from 'three';
import { Crystal } from './Crystal';

export class InteractionManager {
  private camera: THREE.PerspectiveCamera;
  private crystal: Crystal;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private container: HTMLElement;

  private currentTheta: number = 0;
  private currentPhi: number = Math.PI / 3;
  private currentRadius: number = 9;
  private targetTheta: number = 0;
  private targetPhi: number = Math.PI / 3;
  private targetRadius: number = 9;

  private isDragging: boolean = false;
  private hasDragged: boolean = false;
  private dragStart: { x: number; y: number } = { x: 0, y: 0 };
  private dragThetaStart: number = 0;
  private dragPhiStart: number = 0;

  private _autoRotate: boolean = true;
  private autoRotateSpeed: number = 0.08;

  private static readonly MIN_PHI = 0.15;
  private static readonly MAX_PHI = Math.PI - 0.15;
  private static readonly MIN_RADIUS = 4;
  private static readonly MAX_RADIUS = 20;

  private touchStartDist: number = 0;
  private touchStartRadius: number = 0;

  constructor(
    camera: THREE.PerspectiveCamera,
    crystal: Crystal,
    container: HTMLElement
  ) {
    this.camera = camera;
    this.crystal = crystal;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.container = container;

    this.bindEvents();
    this.updateCameraPosition();
  }

  private bindEvents(): void {
    this.container.addEventListener('mousedown', this.onMouseDown.bind(this));
    window.addEventListener('mousemove', this.onMouseMove.bind(this));
    window.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.container.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
    this.container.addEventListener('click', this.onClick.bind(this));

    this.container.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
    window.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
    window.addEventListener('touchend', this.onTouchEnd.bind(this));
  }

  private onMouseDown(e: MouseEvent): void {
    if ((e.target as HTMLElement).closest('#control-panel')) return;
    this.isDragging = true;
    this.hasDragged = false;
    this.dragStart = { x: e.clientX, y: e.clientY };
    this.dragThetaStart = this.targetTheta;
    this.dragPhiStart = this.targetPhi;
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.isDragging) return;
    const dx = e.clientX - this.dragStart.x;
    const dy = e.clientY - this.dragStart.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) this.hasDragged = true;
    this.targetTheta = this.dragThetaStart - dx * 0.005;
    this.targetPhi = this.dragPhiStart + dy * 0.005;
    this.targetPhi = Math.max(InteractionManager.MIN_PHI, Math.min(InteractionManager.MAX_PHI, this.targetPhi));
  }

  private onMouseUp(): void {
    this.isDragging = false;
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    this.targetRadius += e.deltaY * 0.01;
    this.targetRadius = Math.max(InteractionManager.MIN_RADIUS, Math.min(InteractionManager.MAX_RADIUS, this.targetRadius));
  }

  private onClick(e: MouseEvent): void {
    if (this.hasDragged) return;
    if ((e.target as HTMLElement).closest('#control-panel')) return;
    const rect = this.container.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const meshes = this.crystal.getMeshesForRaycast();
    const intersects = this.raycaster.intersectObjects(meshes, false);

    if (intersects.length > 0) {
      this.crystal.pulse(intersects[0].point);
    }
  }

  private onTouchStart(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length === 1) {
      this.isDragging = true;
      this.hasDragged = false;
      this.dragStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      this.dragThetaStart = this.targetTheta;
      this.dragPhiStart = this.targetPhi;
    } else if (e.touches.length === 2) {
      this.isDragging = false;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      this.touchStartDist = Math.sqrt(dx * dx + dy * dy);
      this.touchStartRadius = this.targetRadius;
    }
  }

  private onTouchMove(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length === 1 && this.isDragging) {
      const dx = e.touches[0].clientX - this.dragStart.x;
      const dy = e.touches[0].clientY - this.dragStart.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) this.hasDragged = true;
      this.targetTheta = this.dragThetaStart - dx * 0.005;
      this.targetPhi = this.dragPhiStart + dy * 0.005;
      this.targetPhi = Math.max(InteractionManager.MIN_PHI, Math.min(InteractionManager.MAX_PHI, this.targetPhi));
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const scale = this.touchStartDist / dist;
      this.targetRadius = Math.max(InteractionManager.MIN_RADIUS, Math.min(InteractionManager.MAX_RADIUS, this.touchStartRadius * scale));
    }
  }

  private onTouchEnd(): void {
    this.isDragging = false;
  }

  setAutoRotate(enabled: boolean): void {
    this._autoRotate = enabled;
  }

  resetView(): void {
    this.targetTheta = 0;
    this.targetPhi = Math.PI / 3;
    this.targetRadius = 9;
  }

  update(delta: number): void {
    if (this._autoRotate && !this.isDragging) {
      this.targetTheta += delta * this.autoRotateSpeed;
    }

    const lerpFactor = 1 - Math.pow(0.0001, delta);
    this.currentTheta += (this.targetTheta - this.currentTheta) * lerpFactor;
    this.currentPhi += (this.targetPhi - this.currentPhi) * lerpFactor;
    this.currentRadius += (this.targetRadius - this.currentRadius) * lerpFactor;

    this.updateCameraPosition();
  }

  private updateCameraPosition(): void {
    this.camera.position.x = this.currentRadius * Math.sin(this.currentPhi) * Math.cos(this.currentTheta);
    this.camera.position.y = this.currentRadius * Math.cos(this.currentPhi);
    this.camera.position.z = this.currentRadius * Math.sin(this.currentPhi) * Math.sin(this.currentTheta);
    this.camera.lookAt(0, 0.5, 0);
  }
}
