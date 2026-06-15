import * as THREE from 'three';

export class CameraControls {
  camera: THREE.Camera;
  domElement: HTMLElement;

  target = new THREE.Vector3(0, 0, 0);
  spherical = new THREE.Spherical();

  minDistance = 30;
  maxDistance = 200;
  minPolar = Math.PI / 2 - THREE.MathUtils.degToRad(60);
  maxPolar = Math.PI / 2 + THREE.MathUtils.degToRad(60);

  rotateSpeed = 0.005;
  zoomSpeed = 0.1;

  isDragging = false;
  lastX = 0;
  lastY = 0;

  constructor(camera: THREE.Camera, domElement: HTMLElement) {
    this.camera = camera;
    this.domElement = domElement;

    const offset = new THREE.Vector3().subVectors(camera.position, this.target);
    this.spherical.setFromVector3(offset);
    this.clampSpherical();

    this.attachEvents();
  }

  private clampSpherical() {
    this.spherical.radius = Math.max(this.minDistance, Math.min(this.maxDistance, this.spherical.radius));
    this.spherical.phi = Math.max(this.minPolar, Math.min(this.maxPolar, this.spherical.phi));
    this.spherical.theta = this.spherical.theta;
  }

  private updatePosition() {
    const offset = new THREE.Vector3().setFromSpherical(this.spherical);
    this.camera.position.copy(this.target).add(offset);
    this.camera.lookAt(this.target);
  }

  private attachEvents() {
    this.domElement.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 && e.button !== 2) return;
      this.isDragging = true;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
      this.domElement.setPointerCapture(e.pointerId);
      this.domElement.style.cursor = 'grabbing';
    });

    this.domElement.addEventListener('pointermove', (e) => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.lastX;
      const dy = e.clientY - this.lastY;
      this.lastX = e.clientX;
      this.lastY = e.clientY;

      this.spherical.theta -= dx * this.rotateSpeed;
      this.spherical.phi -= dy * this.rotateSpeed;
      this.clampSpherical();
    });

    const endDrag = (e: PointerEvent) => {
      if (!this.isDragging) return;
      this.isDragging = false;
      try { this.domElement.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
      this.domElement.style.cursor = 'grab';
    };
    this.domElement.addEventListener('pointerup', endDrag);
    this.domElement.addEventListener('pointercancel', endDrag);
    this.domElement.addEventListener('pointerleave', endDrag);

    this.domElement.addEventListener('wheel', (e) => {
      e.preventDefault();
      const factor = Math.exp(-e.deltaY * 0.001 * this.zoomSpeed * 10);
      this.spherical.radius *= factor;
      this.clampSpherical();
    }, { passive: false });

    this.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
    this.domElement.style.cursor = 'grab';
    this.domElement.style.touchAction = 'none';
  }

  update() {
    this.updatePosition();
  }
}
