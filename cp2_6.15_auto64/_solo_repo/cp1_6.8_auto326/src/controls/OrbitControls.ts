import * as THREE from 'three';

export class OrbitControls {
  private camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;

  private spherical = new THREE.Spherical();
  private target = new THREE.Vector3();

  private isDragging = false;
  private previousMouse = new THREE.Vector2();

  private rotateSpeed = 0.5;
  private zoomSpeed = 1.0;
  private dampingFactor = 0.08;

  private minDistance = 5;
  private maxDistance = 200;

  private rotateVelocity = new THREE.Vector2();
  private zoomVelocity = 0;

  private autoRotate = true;
  private autoRotateSpeed = 0.05;

  private onPointerDownHandler = this.onPointerDown.bind(this);
  private onPointerMoveHandler = this.onPointerMove.bind(this);
  private onPointerUpHandler = this.onPointerUp.bind(this);
  private onWheelHandler = this.onWheel.bind(this);
  private onContextMenuHandler = (e: Event) => e.preventDefault();

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
    this.camera = camera;
    this.domElement = domElement;

    const offset = camera.position.clone().sub(this.target);
    this.spherical.setFromVector3(offset);

    this.domElement.addEventListener('pointerdown', this.onPointerDownHandler);
    this.domElement.addEventListener('pointermove', this.onPointerMoveHandler);
    this.domElement.addEventListener('pointerup', this.onPointerUpHandler);
    this.domElement.addEventListener('pointerleave', this.onPointerUpHandler);
    this.domElement.addEventListener('wheel', this.onWheelHandler, { passive: false });
    this.domElement.addEventListener('contextmenu', this.onContextMenuHandler);
  }

  private onPointerDown(event: PointerEvent): void {
    if (event.button === 0) {
      this.isDragging = true;
      this.previousMouse.set(event.clientX, event.clientY);
    }
  }

  private onPointerMove(event: PointerEvent): void {
    if (!this.isDragging) return;

    const deltaX = event.clientX - this.previousMouse.x;
    const deltaY = event.clientY - this.previousMouse.y;

    this.rotateVelocity.x += deltaX * this.rotateSpeed * 0.005;
    this.rotateVelocity.y += deltaY * this.rotateSpeed * 0.005;

    this.previousMouse.set(event.clientX, event.clientY);
  }

  private onPointerUp(): void {
    this.isDragging = false;
  }

  private onWheel(event: WheelEvent): void {
    event.preventDefault();
    this.zoomVelocity += event.deltaY * this.zoomSpeed * 0.001;
  }

  update(): void {
    if (this.autoRotate && !this.isDragging) {
      this.spherical.theta -= this.autoRotateSpeed * 0.01;
    }

    this.spherical.theta -= this.rotateVelocity.x;
    this.spherical.phi -= this.rotateVelocity.y;

    this.spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.spherical.phi));

    this.spherical.radius -= this.zoomVelocity * this.spherical.radius;
    this.spherical.radius = Math.max(this.minDistance, Math.min(this.maxDistance, this.spherical.radius));

    this.rotateVelocity.multiplyScalar(1 - this.dampingFactor);
    this.zoomVelocity *= (1 - this.dampingFactor);

    const offset = new THREE.Vector3().setFromSpherical(this.spherical);
    this.camera.position.copy(this.target).add(offset);
    this.camera.lookAt(this.target);
  }

  setAutoRotate(enabled: boolean): void {
    this.autoRotate = enabled;
  }

  dispose(): void {
    this.domElement.removeEventListener('pointerdown', this.onPointerDownHandler);
    this.domElement.removeEventListener('pointermove', this.onPointerMoveHandler);
    this.domElement.removeEventListener('pointerup', this.onPointerUpHandler);
    this.domElement.removeEventListener('pointerleave', this.onPointerUpHandler);
    this.domElement.removeEventListener('wheel', this.onWheelHandler);
    this.domElement.removeEventListener('contextmenu', this.onContextMenuHandler);
  }
}
