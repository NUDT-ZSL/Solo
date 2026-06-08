import * as THREE from 'three';

const MIN_POLAR = 0.3;
const MAX_POLAR = Math.PI / 2 - 0.1;
const MIN_AZIMUTH = -Math.PI * 0.75;
const MAX_AZIMUTH = Math.PI * 0.75;
const MIN_DISTANCE = 3;
const MAX_DISTANCE = 18;
const EASING_FACTOR = 0.08;
const ROTATION_SENSITIVITY = 0.005;
const ZOOM_SENSITIVITY = 1.0;

export class CameraController {
  private camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;
  private target: THREE.Vector3;

  private polarAngle: number = Math.PI / 4;
  private azimuthAngle: number = Math.PI / 4;
  private distance: number = 10;

  private targetPolar: number = Math.PI / 4;
  private targetAzimuth: number = Math.PI / 4;
  private targetDistance: number = 10;

  private isDragging: boolean = false;
  private lastPointerX: number = 0;
  private lastPointerY: number = 0;
  private isRightDragging: boolean = false;

  private enabled: boolean = true;

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement, target: THREE.Vector3) {
    this.camera = camera;
    this.domElement = domElement;
    this.target = target;

    this.onPointerDown = this.onPointerDown.bind(this);
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);
    this.onWheel = this.onWheel.bind(this);
    this.onContextMenu = this.onContextMenu.bind(this);

    this.domElement.addEventListener('pointerdown', this.onPointerDown);
    this.domElement.addEventListener('pointermove', this.onPointerMove);
    this.domElement.addEventListener('pointerup', this.onPointerUp);
    this.domElement.addEventListener('pointerleave', this.onPointerUp);
    this.domElement.addEventListener('wheel', this.onWheel, { passive: false });
    this.domElement.addEventListener('contextmenu', this.onContextMenu);
  }

  setTarget(target: THREE.Vector3): void {
    this.target.copy(target);
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  setAngles(polar: number, azimuth: number): void {
    this.targetPolar = THREE.MathUtils.clamp(polar, MIN_POLAR, MAX_POLAR);
    this.targetAzimuth = THREE.MathUtils.clamp(azimuth, MIN_AZIMUTH, MAX_AZIMUTH);
  }

  getDistance(): number {
    return this.distance;
  }

  update(): void {
    this.polarAngle += (this.targetPolar - this.polarAngle) * EASING_FACTOR;
    this.azimuthAngle += (this.targetAzimuth - this.azimuthAngle) * EASING_FACTOR;
    this.distance += (this.targetDistance - this.distance) * EASING_FACTOR;

    const x = this.distance * Math.sin(this.polarAngle) * Math.cos(this.azimuthAngle);
    const y = this.distance * Math.cos(this.polarAngle);
    const z = this.distance * Math.sin(this.polarAngle) * Math.sin(this.azimuthAngle);

    this.camera.position.set(
      this.target.x + x,
      this.target.y + y,
      this.target.z + z
    );
    this.camera.lookAt(this.target);
  }

  reset(polar?: number, azimuth?: number, distance?: number): void {
    this.targetPolar = polar ?? Math.PI / 4;
    this.targetAzimuth = azimuth ?? Math.PI / 4;
    this.targetDistance = distance ?? 10;
  }

  dispose(): void {
    this.domElement.removeEventListener('pointerdown', this.onPointerDown);
    this.domElement.removeEventListener('pointermove', this.onPointerMove);
    this.domElement.removeEventListener('pointerup', this.onPointerUp);
    this.domElement.removeEventListener('pointerleave', this.onPointerUp);
    this.domElement.removeEventListener('wheel', this.onWheel);
    this.domElement.removeEventListener('contextmenu', this.onContextMenu);
  }

  private onPointerDown(e: PointerEvent): void {
    if (!this.enabled) return;
    if (e.button === 0 || e.button === 2) {
      this.isDragging = true;
      this.isRightDragging = e.button === 2;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
      this.domElement.setPointerCapture(e.pointerId);
    }
  }

  private onPointerMove(e: PointerEvent): void {
    if (!this.isDragging || !this.enabled) return;

    const deltaX = e.clientX - this.lastPointerX;
    const deltaY = e.clientY - this.lastPointerY;
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;

    this.targetAzimuth -= deltaX * ROTATION_SENSITIVITY;
    this.targetPolar += deltaY * ROTATION_SENSITIVITY;

    this.targetAzimuth = THREE.MathUtils.clamp(this.targetAzimuth, MIN_AZIMUTH, MAX_AZIMUTH);
    this.targetPolar = THREE.MathUtils.clamp(this.targetPolar, MIN_POLAR, MAX_POLAR);
  }

  private onPointerUp(e: PointerEvent): void {
    this.isDragging = false;
    this.isRightDragging = false;
    try {
      this.domElement.releasePointerCapture(e.pointerId);
    } catch (_) { /* ignore */ }
  }

  private onWheel(e: WheelEvent): void {
    if (!this.enabled) return;
    e.preventDefault();

    this.targetDistance += e.deltaY * ZOOM_SENSITIVITY * 0.01;
    this.targetDistance = THREE.MathUtils.clamp(this.targetDistance, MIN_DISTANCE, MAX_DISTANCE);
  }

  private onContextMenu(e: Event): void {
    e.preventDefault();
  }
}
