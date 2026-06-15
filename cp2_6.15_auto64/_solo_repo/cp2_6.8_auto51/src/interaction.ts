import * as THREE from 'three';
import { WaveSystem } from './waveSystem';

export class InteractionManager {
  private camera: THREE.PerspectiveCamera;
  private waveSystem: WaveSystem;
  private container: HTMLElement;

  private isDragging: boolean = false;
  private previousMouseX: number = 0;
  private previousMouseY: number = 0;
  private targetRotationX: number = 0.5;
  private targetRotationY: number = 0;
  private currentRotationX: number = 0.5;
  private currentRotationY: number = 0;

  private autoRotate: boolean = true;
  private readonly ROTATION_SPEED = 0.005;
  private readonly AUTO_ROTATE_SPEED = 0.05;
  private readonly MIN_POLAR = 0.1;
  private readonly MAX_POLAR = Math.PI / 2 - 0.05;
  private readonly MIN_DISTANCE = 8;
  private readonly MAX_DISTANCE = 40;

  private cameraDistance: number = 22;
  private targetDistance: number = 22;
  private readonly ZOOM_SPEED = 0.0015;

  private boundOnMouseDown: (e: MouseEvent) => void;
  private boundOnMouseMove: (e: MouseEvent) => void;
  private boundOnMouseUp: () => void;
  private boundOnMouseLeave: () => void;
  private boundOnWheel: (e: WheelEvent) => void;
  private boundOnKeyDown: (e: KeyboardEvent) => void;

  constructor(camera: THREE.PerspectiveCamera, waveSystem: WaveSystem, container: HTMLElement) {
    this.camera = camera;
    this.waveSystem = waveSystem;
    this.container = container;

    this.boundOnMouseDown = this.onMouseDown.bind(this);
    this.boundOnMouseMove = this.onMouseMove.bind(this);
    this.boundOnMouseUp = this.onMouseUp.bind(this);
    this.boundOnMouseLeave = this.onMouseLeave.bind(this);
    this.boundOnWheel = this.onWheel.bind(this);
    this.boundOnKeyDown = this.onKeyDown.bind(this);

    this.attachEventListeners();
    this.updateCameraPosition();
  }

  private attachEventListeners(): void {
    this.container.addEventListener('mousedown', this.boundOnMouseDown);
    this.container.addEventListener('mousemove', this.boundOnMouseMove);
    window.addEventListener('mouseup', this.boundOnMouseUp);
    this.container.addEventListener('mouseleave', this.boundOnMouseLeave);
    this.container.addEventListener('wheel', this.boundOnWheel, { passive: false });
    window.addEventListener('keydown', this.boundOnKeyDown);
  }

  public detachEventListeners(): void {
    this.container.removeEventListener('mousedown', this.boundOnMouseDown);
    this.container.removeEventListener('mousemove', this.boundOnMouseMove);
    window.removeEventListener('mouseup', this.boundOnMouseUp);
    this.container.removeEventListener('mouseleave', this.boundOnMouseLeave);
    this.container.removeEventListener('wheel', this.boundOnWheel);
    window.removeEventListener('keydown', this.boundOnKeyDown);
  }

  private onMouseDown(e: MouseEvent): void {
    this.isDragging = true;
    this.previousMouseX = e.clientX;
    this.previousMouseY = e.clientY;
    this.autoRotate = false;
    this.container.style.cursor = 'grabbing';
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.isDragging) return;

    const deltaX = e.clientX - this.previousMouseX;
    const deltaY = e.clientY - this.previousMouseY;

    this.targetRotationY += deltaX * this.ROTATION_SPEED;
    this.targetRotationX += deltaY * this.ROTATION_SPEED;

    this.targetRotationX = Math.max(this.MIN_POLAR, Math.min(this.MAX_POLAR, this.targetRotationX));

    this.previousMouseX = e.clientX;
    this.previousMouseY = e.clientY;
  }

  private onMouseUp(): void {
    this.isDragging = false;
    this.container.style.cursor = 'grab';
  }

  private onMouseLeave(): void {
    this.isDragging = false;
    this.container.style.cursor = 'grab';
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    this.targetDistance += e.deltaY * this.ZOOM_SPEED * this.cameraDistance;
    this.targetDistance = Math.max(this.MIN_DISTANCE, Math.min(this.MAX_DISTANCE, this.targetDistance));
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.key >= '1' && e.key <= '9') {
      const sourceId = parseInt(e.key, 10) - 1;
      this.waveSystem.toggleSource(sourceId);
      this.updateUIState(sourceId);
    } else if (e.code === 'Space') {
      e.preventDefault();
      this.autoRotate = !this.autoRotate;
    } else if (e.key.toLowerCase() === 'r') {
      this.resetView();
    }
  }

  private updateUIState(sourceId: number): void {
    const sourceEl = document.getElementById(`wave-source-${sourceId}`);
    const toggleBtn = document.getElementById(`toggle-btn-${sourceId}`);
    if (sourceEl && toggleBtn) {
      const isActive = this.waveSystem.sources[sourceId].active;
      if (isActive) {
        sourceEl.classList.add('active');
        toggleBtn.textContent = '关闭';
      } else {
        sourceEl.classList.remove('active');
        toggleBtn.textContent = '开启';
      }
    }
  }

  public resetView(): void {
    this.targetRotationX = 0.5;
    this.targetRotationY = 0;
    this.currentRotationX = 0.5;
    this.currentRotationY = 0;
    this.targetDistance = 22;
    this.cameraDistance = 22;
    this.autoRotate = true;
  }

  public toggleAutoRotate(): boolean {
    this.autoRotate = !this.autoRotate;
    return this.autoRotate;
  }

  public isAutoRotating(): boolean {
    return this.autoRotate;
  }

  public update(deltaTime: number): void {
    if (this.autoRotate && !this.isDragging) {
      this.targetRotationY += this.AUTO_ROTATE_SPEED * deltaTime;
    }

    const lerpFactor = 0.1;
    this.currentRotationX += (this.targetRotationX - this.currentRotationX) * lerpFactor;
    this.currentRotationY += (this.targetRotationY - this.currentRotationY) * lerpFactor;
    this.cameraDistance += (this.targetDistance - this.cameraDistance) * lerpFactor;

    this.updateCameraPosition();
  }

  private updateCameraPosition(): void {
    const x = this.cameraDistance * Math.sin(this.currentRotationX) * Math.sin(this.currentRotationY);
    const y = this.cameraDistance * Math.cos(this.currentRotationX);
    const z = this.cameraDistance * Math.sin(this.currentRotationX) * Math.cos(this.currentRotationY);

    this.camera.position.set(x, y, z);
    this.camera.lookAt(0, 0, 0);
  }

  public handleWindowResize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }
}
