import * as THREE from 'three';
import { Galaxy } from './galaxy';

export class InteractionManager {
  private camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;
  private galaxy: Galaxy;
  private raycaster: THREE.Raycaster;
  private pointer: THREE.Vector2;

  private isDragging: boolean = false;
  private previousMouse: { x: number; y: number } = { x: 0, y: 0 };
  private dragVelocity: { x: number; y: number } = { x: 0, y: 0 };

  private sphericalTarget: { theta: number; phi: number; radius: number };
  private sphericalCurrent: { theta: number; phi: number; radius: number };

  private readonly MIN_DISTANCE = 5;
  private readonly MAX_DISTANCE = 30;
  private readonly MIN_PHI = 0.15;
  private readonly MAX_PHI = Math.PI - 0.15;
  private readonly DAMPING_DURATION = 0.5;
  private readonly CENTER = new THREE.Vector3(0, 0, 0);

  private clickStart: { x: number; y: number; time: number } | null = null;
  private readonly CLICK_THRESHOLD = 5;
  private readonly CLICK_TIME_THRESHOLD = 250;

  private galaxyGroup: THREE.Group;
  private galaxyPlane: THREE.Plane;

  constructor(
    camera: THREE.PerspectiveCamera,
    domElement: HTMLElement,
    galaxy: Galaxy
  ) {
    this.camera = camera;
    this.domElement = domElement;
    this.galaxy = galaxy;
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();

    this.galaxyGroup = (galaxy as any).group as THREE.Group;
    this.galaxyPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    const initialPos = camera.position.clone();
    const spherical = new THREE.Spherical().setFromVector3(initialPos);

    this.sphericalTarget = {
      theta: spherical.theta,
      phi: spherical.phi,
      radius: spherical.radius
    };
    this.sphericalCurrent = { ...this.sphericalTarget };

    this.updateCameraPosition();
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.domElement.addEventListener('pointerdown', this.onPointerDown.bind(this));
    this.domElement.addEventListener('pointermove', this.onPointerMove.bind(this));
    this.domElement.addEventListener('pointerup', this.onPointerUp.bind(this));
    this.domElement.addEventListener('pointercancel', this.onPointerUp.bind(this));
    this.domElement.addEventListener('pointerleave', this.onPointerUp.bind(this));
    this.domElement.addEventListener('wheel', this.onWheel.bind(this), { passive: false });

    this.domElement.style.touchAction = 'none';
    this.domElement.style.cursor = 'grab';
  }

  private onPointerDown(event: PointerEvent): void {
    this.domElement.setPointerCapture(event.pointerId);
    this.isDragging = true;
    this.previousMouse = { x: event.clientX, y: event.clientY };
    this.dragVelocity = { x: 0, y: 0 };
    this.domElement.style.cursor = 'grabbing';

    this.clickStart = {
      x: event.clientX,
      y: event.clientY,
      time: performance.now()
    };
  }

  private onPointerMove(event: PointerEvent): void {
    if (!this.isDragging) return;

    const dx = event.clientX - this.previousMouse.x;
    const dy = event.clientY - this.previousMouse.y;

    this.dragVelocity = {
      x: dx / this.domElement.clientWidth,
      y: dy / this.domElement.clientHeight
    };

    const rotationSpeed = Math.PI * 0.8;
    this.sphericalTarget.theta -= this.dragVelocity.x * rotationSpeed;
    this.sphericalTarget.phi -= this.dragVelocity.y * rotationSpeed;
    this.sphericalTarget.phi = Math.max(this.MIN_PHI, Math.min(this.MAX_PHI, this.sphericalTarget.phi));

    this.previousMouse = { x: event.clientX, y: event.clientY };
  }

  private onPointerUp(event: PointerEvent): void {
    if (this.isDragging) {
      this.domElement.releasePointerCapture(event.pointerId);
      this.isDragging = false;
      this.domElement.style.cursor = 'grab';
    }

    if (this.clickStart) {
      const dx = event.clientX - this.clickStart.x;
      const dy = event.clientY - this.clickStart.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const elapsed = performance.now() - this.clickStart.time;

      if (dist < this.CLICK_THRESHOLD && elapsed < this.CLICK_TIME_THRESHOLD) {
        this.handleClick(event.clientX, event.clientY);
      }

      this.clickStart = null;
    }
  }

  private onWheel(event: WheelEvent): void {
    event.preventDefault();

    const zoomSpeed = 0.0015;
    const delta = event.deltaY * zoomSpeed;
    const logRadius = Math.log(this.sphericalTarget.radius);
    const newLogRadius = logRadius + delta;
    const newRadius = Math.exp(newLogRadius);
    this.sphericalTarget.radius = Math.max(this.MIN_DISTANCE, Math.min(this.MAX_DISTANCE, newRadius));
  }

  private handleClick(clientX: number, clientY: number): void {
    this.pointer.x = (clientX / this.domElement.clientWidth) * 2 - 1;
    this.pointer.y = -(clientY / this.domElement.clientHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.camera);

    const intersection = new THREE.Vector3();
    const hit = this.raycaster.ray.intersectPlane(this.galaxyPlane, intersection);

    if (hit) {
      const localHit = this.galaxyGroup.worldToLocal(intersection.clone());
      const distFromCenter = localHit.length();

      if (distFromCenter < 18) {
        this.galaxy.triggerShockWave(intersection);
      }
    }
  }

  public resetView(): void {
    this.sphericalTarget = {
      theta: 0,
      phi: Math.PI / 3.5,
      radius: 18
    };
    this.dragVelocity = { x: 0, y: 0 };
  }

  private updateCameraPosition(): void {
    const s = this.sphericalCurrent;
    const position = new THREE.Vector3().setFromSphericalCoords(
      s.radius,
      s.phi,
      s.theta
    );

    this.camera.position.copy(position);
    this.camera.lookAt(this.CENTER);
  }

  private lerpSpherical(delta: number): void {
    const lambda = 1 - Math.exp(-delta / (this.DAMPING_DURATION / 5));

    this.sphericalCurrent.theta += (this.sphericalTarget.theta - this.sphericalCurrent.theta) * lambda;
    this.sphericalCurrent.phi += (this.sphericalTarget.phi - this.sphericalCurrent.phi) * lambda;
    this.sphericalCurrent.radius += (this.sphericalTarget.radius - this.sphericalCurrent.radius) * lambda;
  }

  public update(delta: number): void {
    if (!this.isDragging) {
      const inertiaDecay = Math.exp(-delta * 4);
      const rotationSpeed = Math.PI * 0.8;

      this.sphericalTarget.theta -= this.dragVelocity.x * rotationSpeed * delta * 60;
      this.sphericalTarget.phi -= this.dragVelocity.y * rotationSpeed * delta * 60;
      this.sphericalTarget.phi = Math.max(this.MIN_PHI, Math.min(this.MAX_PHI, this.sphericalTarget.phi));

      this.dragVelocity.x *= inertiaDecay;
      this.dragVelocity.y *= inertiaDecay;
    }

    this.lerpSpherical(delta);
    this.updateCameraPosition();
  }

  public dispose(): void {
    this.domElement.removeEventListener('pointerdown', this.onPointerDown.bind(this));
    this.domElement.removeEventListener('pointermove', this.onPointerMove.bind(this));
    this.domElement.removeEventListener('pointerup', this.onPointerUp.bind(this));
    this.domElement.removeEventListener('pointercancel', this.onPointerUp.bind(this));
    this.domElement.removeEventListener('pointerleave', this.onPointerUp.bind(this));
    this.domElement.removeEventListener('wheel', this.onWheel.bind(this));
  }
}
