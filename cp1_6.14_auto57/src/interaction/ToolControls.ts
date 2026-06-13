import * as THREE from 'three';
import { eventBus } from '@/core/EventBus';

export class ToolControls {
  private camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;
  private scene: THREE.Scene;

  private spherical: THREE.Spherical;
  private target: THREE.Vector3;
  private isDragging: boolean = false;
  private previousMouse: { x: number; y: number } = { x: 0, y: 0 };

  private keys: Set<string> = new Set();
  private moveSpeed: number = 80;

  private minDistance: number = 50;
  private maxDistance: number = 500;
  private minPolarAngle: number = THREE.MathUtils.degToRad(15);
  private maxPolarAngle: number = THREE.MathUtils.degToRad(75);

  private autoRotate: boolean = false;
  private autoRotateSpeed: number = 0.3;

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement, scene: THREE.Scene) {
    this.camera = camera;
    this.domElement = domElement;
    this.scene = scene;

    this.target = new THREE.Vector3(0, 30, 0);

    const offset = camera.position.clone().sub(this.target);
    this.spherical = new THREE.Spherical().setFromVector3(offset);

    this.registerEvents();
    this.updateCameraPosition();
  }

  private registerEvents(): void {
    this.domElement.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.domElement.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.domElement.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.domElement.addEventListener('mouseleave', this.onMouseUp.bind(this));
    this.domElement.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
    this.domElement.addEventListener('contextmenu', (e) => e.preventDefault());

    window.addEventListener('keydown', this.onKeyDown.bind(this));
    window.addEventListener('keyup', this.onKeyUp.bind(this));

    this.domElement.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
    this.domElement.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
    this.domElement.addEventListener('touchend', this.onTouchEnd.bind(this));

    eventBus.on('config:autoRotate', (enabled: boolean) => {
      this.autoRotate = enabled;
    });
  }

  private onMouseDown(e: MouseEvent): void {
    this.isDragging = true;
    this.previousMouse = { x: e.clientX, y: e.clientY };
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.isDragging) return;

    const deltaX = e.clientX - this.previousMouse.x;
    const deltaY = e.clientY - this.previousMouse.y;

    this.spherical.theta -= deltaX * 0.005;
    this.spherical.phi -= deltaY * 0.005;

    this.spherical.phi = THREE.MathUtils.clamp(
      this.spherical.phi,
      this.minPolarAngle,
      this.maxPolarAngle
    );

    this.previousMouse = { x: e.clientX, y: e.clientY };
    this.updateCameraPosition();
  }

  private onMouseUp(): void {
    this.isDragging = false;
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();

    this.spherical.radius += e.deltaY * 0.1;

    this.spherical.radius = THREE.MathUtils.clamp(
      this.spherical.radius,
      this.minDistance,
      this.maxDistance
    );

    this.updateCameraPosition();
  }

  private onTouchStart(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length === 1) {
      this.isDragging = true;
      this.previousMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  }

  private onTouchMove(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length === 1 && this.isDragging) {
      const deltaX = e.touches[0].clientX - this.previousMouse.x;
      const deltaY = e.touches[0].clientY - this.previousMouse.y;

      this.spherical.theta -= deltaX * 0.005;
      this.spherical.phi -= deltaY * 0.005;

      this.spherical.phi = THREE.MathUtils.clamp(
        this.spherical.phi,
        this.minPolarAngle,
        this.maxPolarAngle
      );

      this.previousMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      this.updateCameraPosition();
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if ((this as any)._lastPinchDist) {
        const delta = (this as any)._lastPinchDist - dist;
        this.spherical.radius += delta * 0.2;
        this.spherical.radius = THREE.MathUtils.clamp(
          this.spherical.radius,
          this.minDistance,
          this.maxDistance
        );
        this.updateCameraPosition();
      }
      (this as any)._lastPinchDist = dist;
    }
  }

  private onTouchEnd(e: TouchEvent): void {
    this.isDragging = false;
    (this as any)._lastPinchDist = null;
  }

  private onKeyDown(e: KeyboardEvent): void {
    this.keys.add(e.key.toLowerCase());
  }

  private onKeyUp(e: KeyboardEvent): void {
    this.keys.delete(e.key.toLowerCase());
  }

  private updateCameraPosition(): void {
    const offset = new THREE.Vector3().setFromSpherical(this.spherical);
    this.camera.position.copy(this.target).add(offset);
    this.camera.lookAt(this.target);
  }

  public update(delta: number): void {
    if (this.autoRotate && !this.isDragging) {
      this.spherical.theta += this.autoRotateSpeed * delta;
      this.updateCameraPosition();
    }

    const moveVec = new THREE.Vector3();
    const forward = new THREE.Vector3();
    forward.subVectors(this.target, this.camera.position);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3();
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    if (this.keys.has('w')) moveVec.add(forward);
    if (this.keys.has('s')) moveVec.sub(forward);
    if (this.keys.has('a')) moveVec.sub(right);
    if (this.keys.has('d')) moveVec.add(right);

    if (moveVec.lengthSq() > 0) {
      moveVec.normalize().multiplyScalar(this.moveSpeed * delta);
      this.target.add(moveVec);
      this.updateCameraPosition();
    }
  }
}
