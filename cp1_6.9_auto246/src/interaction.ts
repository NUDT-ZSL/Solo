import * as THREE from 'three';
import { MagneticField } from './field';

export interface CameraState {
  azimuth: number;
  elevation: number;
  distance: number;
  target: THREE.Vector3;
}

interface InertialValue {
  current: number;
  target: number;
  velocity: number;
}

export class InteractionManager {
  camera: THREE.PerspectiveCamera;
  domElement: HTMLElement;
  magneticField: MagneticField;

  private azimuth: InertialValue;
  private elevation: InertialValue;
  private distance: InertialValue;
  private targetX: InertialValue;
  private targetY: InertialValue;
  private targetZ: InertialValue;

  minElevation: number = -Math.PI / 4;
  maxElevation: number = Math.PI / 4;
  minDistance: number = 3;
  maxDistance: number = 30;

  isDragging: boolean = false;
  isPanning: boolean = false;
  isShiftDown: boolean = false;

  lastMouseX: number = 0;
  lastMouseY: number = 0;
  lastMoveTime: number = 0;
  lastDeltaX: number = 0;
  lastDeltaY: number = 0;

  raycaster: THREE.Raycaster;
  mouseNDC: THREE.Vector2;
  hoverThreshold: number = 2;

  inertiaDuration: number = 0.3;
  dampingFactor: number = 0.92;

  rotateSpeed: number = 0.005;
  zoomSpeed: number = 0.001;
  panSpeed: number = 0.01;

  onHighlight?: (point: THREE.Vector3) => void;

  constructor(
    camera: THREE.PerspectiveCamera,
    domElement: HTMLElement,
    magneticField: MagneticField
  ) {
    this.camera = camera;
    this.domElement = domElement;
    this.magneticField = magneticField;

    this.azimuth = { current: 0, target: 0, velocity: 0 };
    this.elevation = { current: 0, target: 0, velocity: 0 };
    this.distance = { current: 10, target: 10, velocity: 0 };
    this.targetX = { current: 0, target: 0, velocity: 0 };
    this.targetY = { current: 0, target: 0, velocity: 0 };
    this.targetZ = { current: 0, target: 0, velocity: 0 };

    this.raycaster = new THREE.Raycaster();
    this.mouseNDC = new THREE.Vector2();

    this.initCameraPosition();
    this.bindEvents();
  }

  private initCameraPosition(): void {
    this.azimuth.current = Math.PI / 4;
    this.azimuth.target = this.azimuth.current;
    this.elevation.current = 0;
    this.elevation.target = 0;
    this.distance.current = 10;
    this.distance.target = 10;
    this.updateCamera();
  }

  private bindEvents(): void {
    const el = this.domElement;

    el.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('mousemove', this.onMouseMove);
    el.addEventListener('wheel', this.onWheel, { passive: false });
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    el.addEventListener('contextmenu', this.onContextMenu);
  }

  private onContextMenu = (e: MouseEvent): void => {
    e.preventDefault();
  };

  private onMouseDown = (e: MouseEvent): void => {
    if (e.button === 0 || e.button === 2) {
      this.isDragging = true;
      this.isPanning = this.isShiftDown || e.button === 2;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
      this.lastDeltaX = 0;
      this.lastDeltaY = 0;
      this.lastMoveTime = performance.now();

      this.azimuth.velocity = 0;
      this.elevation.velocity = 0;
      this.distance.velocity = 0;
      this.targetX.velocity = 0;
      this.targetY.velocity = 0;
      this.targetZ.velocity = 0;
    }
  };

  private onMouseUp = (e: MouseEvent): void => {
    if (e.button === 0 || e.button === 2) {
      this.isDragging = false;
      this.isPanning = false;
    }
  };

  private onMouseMove = (e: MouseEvent): void => {
    const deltaX = e.clientX - this.lastMouseX;
    const deltaY = e.clientY - this.lastMouseY;
    const now = performance.now();
    const timeDiff = Math.max(1, now - this.lastMoveTime);

    if (this.isDragging) {
      if (this.isPanning) {
        this.handlePan(deltaX, deltaY);
      } else {
        this.handleRotate(deltaX, deltaY);
      }
      this.lastDeltaX = deltaX;
      this.lastDeltaY = deltaY;
    }

    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
    this.lastMoveTime = now;

    this.handleHover(e.clientX, e.clientY);
  };

  private handleRotate(deltaX: number, deltaY: number): void {
    const inertiaMultiplier = 2;

    this.azimuth.target -= deltaX * this.rotateSpeed;
    this.azimuth.velocity = -deltaX * this.rotateSpeed * inertiaMultiplier;

    this.elevation.target -= deltaY * this.rotateSpeed;
    this.elevation.target = Math.max(
      this.minElevation,
      Math.min(this.maxElevation, this.elevation.target)
    );
    this.elevation.velocity = -deltaY * this.rotateSpeed * inertiaMultiplier;
  }

  private handlePan(deltaX: number, deltaY: number): void {
    const panFactor = this.distance.current * this.panSpeed;

    const right = new THREE.Vector3();
    const up = new THREE.Vector3();
    this.camera.matrixWorld.extractBasis(right, up, new THREE.Vector3());

    const panOffset = right.multiplyScalar(-deltaX * panFactor)
      .add(up.multiplyScalar(deltaY * panFactor));

    this.targetX.target += panOffset.x;
    this.targetY.target += panOffset.y;
    this.targetZ.target += panOffset.z;

    this.targetX.velocity = panOffset.x * 2;
    this.targetY.velocity = panOffset.y * 2;
    this.targetZ.velocity = panOffset.z * 2;
  }

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();

    const zoomAmount = e.deltaY * this.zoomSpeed;
    this.distance.target += zoomAmount * this.distance.target;
    this.distance.target = Math.max(
      this.minDistance,
      Math.min(this.maxDistance, this.distance.target)
    );

    this.distance.velocity = -e.deltaY * this.zoomSpeed * this.distance.current * 2;
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Shift') {
      this.isShiftDown = true;
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    if (e.key === 'Shift') {
      this.isShiftDown = false;
    }
  };

  private handleHover(clientX: number, clientY: number): void {
    const rect = this.domElement.getBoundingClientRect();
    this.mouseNDC.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouseNDC.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouseNDC, this.camera);

    const origin = this.raycaster.ray.origin;
    const direction = this.raycaster.ray.direction;

    const targetPos = new THREE.Vector3(
      this.targetX.current,
      this.targetY.current,
      this.targetZ.current
    );

    const toTarget = new THREE.Vector3().subVectors(targetPos, origin);
    const t = toTarget.dot(direction);
    const closestPoint = origin.clone().add(direction.clone().multiplyScalar(Math.max(0, t)));

    this.magneticField.clearHighlights();
    this.magneticField.highlightNearPoint(closestPoint, this.hoverThreshold);

    if (this.onHighlight) {
      this.onHighlight(closestPoint);
    }
  }

  private updateInertialValue(val: InertialValue, delta: number): void {
    if (!this.isDragging) {
      val.target += val.velocity;
      val.velocity *= this.dampingFactor;
      if (Math.abs(val.velocity) < 0.0001) {
        val.velocity = 0;
      }
    }

    const diff = val.target - val.current;
    const smoothing = Math.min(1, delta / this.inertiaDuration);
    val.current += diff * smoothing;
  }

  private updateCamera(): void {
    const target = new THREE.Vector3(
      this.targetX.current,
      this.targetY.current,
      this.targetZ.current
    );

    const cosElev = Math.cos(this.elevation.current);
    const sinElev = Math.sin(this.elevation.current);
    const cosAzi = Math.cos(this.azimuth.current);
    const sinAzi = Math.sin(this.azimuth.current);

    const offset = new THREE.Vector3(
      this.distance.current * cosElev * sinAzi,
      this.distance.current * sinElev,
      this.distance.current * cosElev * cosAzi
    );

    this.camera.position.copy(target).add(offset);
    this.camera.lookAt(target);
  }

  getHoverPoint(): THREE.Vector3 {
    const origin = this.raycaster.ray.origin;
    const direction = this.raycaster.ray.direction;
    const targetPos = new THREE.Vector3(
      this.targetX.current,
      this.targetY.current,
      this.targetZ.current
    );
    const toTarget = new THREE.Vector3().subVectors(targetPos, origin);
    const t = toTarget.dot(direction);
    return origin.clone().add(direction.clone().multiplyScalar(Math.max(0, t)));
  }

  update(delta: number): void {
    this.updateInertialValue(this.azimuth, delta);
    this.updateInertialValue(this.elevation, delta);
    this.updateInertialValue(this.distance, delta);
    this.updateInertialValue(this.targetX, delta);
    this.updateInertialValue(this.targetY, delta);
    this.updateInertialValue(this.targetZ, delta);

    this.elevation.current = Math.max(
      this.minElevation,
      Math.min(this.maxElevation, this.elevation.current)
    );
    this.distance.current = Math.max(
      this.minDistance,
      Math.min(this.maxDistance, this.distance.current)
    );

    this.updateCamera();
  }

  dispose(): void {
    const el = this.domElement;
    el.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('mousemove', this.onMouseMove);
    el.removeEventListener('wheel', this.onWheel);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    el.removeEventListener('contextmenu', this.onContextMenu);
  }
}
