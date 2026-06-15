import * as THREE from 'three';
import { MAJOR_RADIUS, getPathPoint, getPathTangent } from './corridor';

export interface ControlsState {
  pathAngle: number;
  viewAzimuth: number;
  viewElevation: number;
  flightSpeed: number;
  idleTime: number;
}

export class Controls {
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private state: ControlsState;
  private isDragging: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;
  private lastInteractionTime: number = 0;
  private shockwaveCallbacks: Array<(point: THREE.Vector3) => void> = [];
  private dampingAzimuth: number = 0;
  private dampingElevation: number = 0;
  private touchStartDist: number = 0;
  private isTouchDragging: boolean = false;
  private lastTouchX: number = 0;
  private lastTouchY: number = 0;

  constructor(
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer
  ) {
    this.camera = camera;
    this.renderer = renderer;
    this.state = {
      pathAngle: 0,
      viewAzimuth: 0,
      viewElevation: 0,
      flightSpeed: 1.0,
      idleTime: 0,
    };
    this.lastInteractionTime = performance.now() / 1000;
    this.bindEvents();
  }

  private bindEvents(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    window.addEventListener('mousemove', (e) => this.onMouseMove(e));
    window.addEventListener('mouseup', () => this.onMouseUp());
    canvas.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
    canvas.addEventListener('click', (e) => this.onClick(e));
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    canvas.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
    canvas.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
    canvas.addEventListener('touchend', (e) => this.onTouchEnd(e));
  }

  private onMouseDown(e: MouseEvent): void {
    this.isDragging = true;
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
    this.recordInteraction();
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.isDragging) return;
    const dx = e.clientX - this.lastMouseX;
    const dy = e.clientY - this.lastMouseY;
    this.dampingAzimuth -= dx * 0.003;
    this.dampingElevation -= dy * 0.003;
    this.dampingElevation = Math.max(
      -Math.PI / 3,
      Math.min(Math.PI / 3, this.dampingElevation)
    );
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
    this.recordInteraction();
  }

  private onMouseUp(): void {
    this.isDragging = false;
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    this.state.pathAngle += e.deltaY * 0.0008 * this.state.flightSpeed;
    this.recordInteraction();
  }

  private onClick(e: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);

    const point = raycaster.ray.origin
      .clone()
      .add(raycaster.ray.direction.clone().multiplyScalar(MAJOR_RADIUS * 0.3));

    this.shockwaveCallbacks.forEach((cb) => cb(point));
    this.recordInteraction();
  }

  private onTouchStart(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length === 1) {
      this.isTouchDragging = true;
      this.lastTouchX = e.touches[0].clientX;
      this.lastTouchY = e.touches[0].clientY;
    } else if (e.touches.length === 2) {
      this.touchStartDist = this.getTouchDistance(e.touches);
    }
    this.recordInteraction();
  }

  private onTouchMove(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length === 1 && this.isTouchDragging) {
      const dx = e.touches[0].clientX - this.lastTouchX;
      const dy = e.touches[0].clientY - this.lastTouchY;
      this.dampingAzimuth -= dx * 0.004;
      this.dampingElevation -= dy * 0.004;
      this.dampingElevation = Math.max(
        -Math.PI / 3,
        Math.min(Math.PI / 3, this.dampingElevation)
      );
      this.lastTouchX = e.touches[0].clientX;
      this.lastTouchY = e.touches[0].clientY;
    } else if (e.touches.length === 2) {
      const dist = this.getTouchDistance(e.touches);
      const delta = (dist - this.touchStartDist) * 0.003 * this.state.flightSpeed;
      this.state.pathAngle -= delta;
      this.touchStartDist = dist;
    }
    this.recordInteraction();
  }

  private onTouchEnd(e: TouchEvent): void {
    if (e.touches.length === 0) {
      if (this.isTouchDragging) {
        this.isTouchDragging = false;
        const touch = e.changedTouches[0];
        if (touch) {
          const rect = this.renderer.domElement.getBoundingClientRect();
          const ndcX = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
          const ndcY = -((touch.clientY - rect.top) / rect.height) * 2 + 1;
          const raycaster = new THREE.Raycaster();
          raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);
          const point = raycaster.ray.origin
            .clone()
            .add(raycaster.ray.direction.clone().multiplyScalar(MAJOR_RADIUS * 0.3));
          this.shockwaveCallbacks.forEach((cb) => cb(point));
        }
      }
    }
  }

  private getTouchDistance(touches: TouchList): number {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private recordInteraction(): void {
    this.lastInteractionTime = performance.now() / 1000;
  }

  onShockwave(callback: (point: THREE.Vector3) => void): void {
    this.shockwaveCallbacks.push(callback);
  }

  setFlightSpeed(speed: number): void {
    this.state.flightSpeed = speed;
  }

  resetView(): void {
    this.state.pathAngle = 0;
    this.state.viewAzimuth = 0;
    this.state.viewElevation = 0;
    this.dampingAzimuth = 0;
    this.dampingElevation = 0;
    this.recordInteraction();
  }

  getIdleTime(): number {
    return performance.now() / 1000 - this.lastInteractionTime;
  }

  getPathAngle(): number {
    return this.state.pathAngle;
  }

  update(deltaTime: number): void {
    const now = performance.now() / 1000;
    this.state.idleTime = now - this.lastInteractionTime;

    const dampingFactor = 1 - Math.pow(0.001, deltaTime);
    this.state.viewAzimuth += (this.dampingAzimuth - this.state.viewAzimuth) * dampingFactor;
    this.state.viewElevation += (this.dampingElevation - this.state.viewElevation) * dampingFactor;

    this.dampingAzimuth *= Math.pow(0.92, deltaTime * 60);
    this.dampingElevation *= Math.pow(0.92, deltaTime * 60);

    const [cx, cy, cz] = getPathPoint(this.state.pathAngle);
    this.camera.position.set(cx, cy, cz);

    const [tx, ty, tz] = getPathTangent(this.state.pathAngle);
    const tangent = new THREE.Vector3(tx, ty, tz);
    const right = new THREE.Vector3(
      Math.cos(this.state.pathAngle),
      0,
      Math.sin(this.state.pathAngle)
    );
    const up = new THREE.Vector3(0, 1, 0);

    const azimuthQuat = new THREE.Quaternion().setFromAxisAngle(
      up,
      this.state.viewAzimuth
    );
    const lookDir = tangent.clone().applyQuaternion(azimuthQuat);

    const rightAfterAzimuth = right.clone().applyQuaternion(azimuthQuat);
    const elevationQuat = new THREE.Quaternion().setFromAxisAngle(
      rightAfterAzimuth,
      this.state.viewElevation
    );
    lookDir.applyQuaternion(elevationQuat);

    const target = this.camera.position.clone().add(lookDir);
    this.camera.lookAt(target);
  }
}
