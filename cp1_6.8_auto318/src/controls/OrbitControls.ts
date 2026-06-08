import * as THREE from 'three';

export class OrbitControls {
  private camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;

  private spherical = new THREE.Spherical(50, Math.PI / 3, 0);
  private target = new THREE.Vector3();

  private isDragging = false;

  private rotateSpeed = 0.5;
  private minDistance = 10;
  private maxDistance = 150;

  private dampingFactor = 0.08;
  private sphericalDelta = new THREE.Spherical();

  private rotateStart = new THREE.Vector2();
  private rotateEnd = new THREE.Vector2();

  enabled = true;

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
    this.camera = camera;
    this.domElement = domElement;

    this.domElement.addEventListener('mousedown', this.onMouseDown);
    this.domElement.addEventListener('mousemove', this.onMouseMove);
    this.domElement.addEventListener('mouseup', this.onMouseUp);
    this.domElement.addEventListener('wheel', this.onWheel, { passive: false });
    this.domElement.addEventListener('contextmenu', this.onContextMenu);

    this.updateCamera();
  }

  private onMouseDown = (e: MouseEvent) => {
    if (!this.enabled || e.button !== 0) return;
    this.isDragging = true;
    this.rotateStart.set(e.clientX, e.clientY);
    this.rotateEnd.copy(this.rotateStart);
  };

  private onMouseMove = (e: MouseEvent) => {
    if (!this.isDragging || !this.enabled) return;
    this.rotateEnd.set(e.clientX, e.clientY);

    const dx = this.rotateEnd.x - this.rotateStart.x;
    const dy = this.rotateEnd.y - this.rotateStart.y;

    this.sphericalDelta.theta -= dx * this.rotateSpeed * 0.01;
    this.sphericalDelta.phi -= dy * this.rotateSpeed * 0.01;

    this.rotateStart.copy(this.rotateEnd);
  };

  private onMouseUp = () => {
    this.isDragging = false;
  };

  private onWheel = (e: WheelEvent) => {
    if (!this.enabled) return;
    e.preventDefault();

    const factor = e.deltaY > 0 ? 1.1 : 0.9;
    this.spherical.radius = Math.max(
      this.minDistance,
      Math.min(this.maxDistance, this.spherical.radius * factor),
    );
  };

  private onContextMenu = (e: Event) => {
    e.preventDefault();
  };

  update() {
    this.spherical.theta += this.sphericalDelta.theta;
    this.spherical.phi += this.sphericalDelta.phi;

    this.spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.spherical.phi));

    this.sphericalDelta.theta *= (1 - this.dampingFactor);
    this.sphericalDelta.phi *= (1 - this.dampingFactor);

    if (Math.abs(this.sphericalDelta.theta) < 0.0001) this.sphericalDelta.theta = 0;
    if (Math.abs(this.sphericalDelta.phi) < 0.0001) this.sphericalDelta.phi = 0;

    this.updateCamera();
  }

  private updateCamera() {
    const pos = new THREE.Vector3().setFromSpherical(this.spherical).add(this.target);
    this.camera.position.copy(pos);
    this.camera.lookAt(this.target);
  }

  getNDC(clientX: number, clientY: number): THREE.Vector2 {
    const rect = this.domElement.getBoundingClientRect();
    return new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
  }

  dispose() {
    this.domElement.removeEventListener('mousedown', this.onMouseDown);
    this.domElement.removeEventListener('mousemove', this.onMouseMove);
    this.domElement.removeEventListener('mouseup', this.onMouseUp);
    this.domElement.removeEventListener('wheel', this.onWheel);
    this.domElement.removeEventListener('contextmenu', this.onContextMenu);
  }
}
