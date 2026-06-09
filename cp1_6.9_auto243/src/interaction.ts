import * as THREE from 'three';

export interface InteractionCallbacks {
  onDisturb: () => void;
  onReset: () => void;
}

export class Interaction {
  private dom: HTMLElement;
  private camera: THREE.PerspectiveCamera;
  private callbacks: InteractionCallbacks;

  public spherical: {
    radius: number;
    theta: number;
    phi: number;
  } = {
    radius: 12,
    theta: Math.PI * 0.25,
    phi: Math.PI * 0.4,
  };

  private target: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private minRadius = 2;
  private maxRadius = 20;
  private minPhi = Math.PI * 0.25;
  private maxPhi = Math.PI * 0.75;

  private isDragging = false;
  private lastX = 0;
  private lastY = 0;
  private dragStartX = 0;
  private dragStartY = 0;

  public normalizedMouse: THREE.Vector2 = new THREE.Vector2(-10, -10);

  private rotateSpeed = 0.005;
  private zoomSpeed = 0.001;
  private damping = 0.08;
  private targetSpherical = {
    radius: 12,
    theta: Math.PI * 0.25,
    phi: Math.PI * 0.4,
  };

  constructor(
    dom: HTMLElement,
    camera: THREE.PerspectiveCamera,
    callbacks: InteractionCallbacks
  ) {
    this.dom = dom;
    this.camera = camera;
    this.callbacks = callbacks;

    this.targetSpherical = { ...this.spherical };
    this.applyCamera();

    this.dom.addEventListener('mousedown', this.onMouseDown);
    this.dom.addEventListener('mousemove', this.onMouseMove);
    this.dom.addEventListener('mouseup', this.onMouseUp);
    this.dom.addEventListener('mouseleave', this.onMouseLeave);
    this.dom.addEventListener('wheel', this.onWheel, { passive: false });
    this.dom.addEventListener('touchstart', this.onTouchStart, { passive: false });
    this.dom.addEventListener('touchmove', this.onTouchMove, { passive: false });
    this.dom.addEventListener('touchend', this.onTouchEnd);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('resize', this.onResize);
  }

  private onMouseDown = (e: MouseEvent) => {
    if (e.button !== 0) return;
    this.isDragging = true;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    this.dragStartX = e.clientX;
    this.dragStartY = e.clientY;
    this.dom.style.cursor = 'grabbing';
  };

  private onMouseMove = (e: MouseEvent) => {
    const rect = this.dom.getBoundingClientRect();
    this.normalizedMouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.normalizedMouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    if (!this.isDragging) return;

    const dx = e.clientX - this.lastX;
    const dy = e.clientY - this.lastY;
    this.lastX = e.clientX;
    this.lastY = e.clientY;

    this.targetSpherical.theta -= dx * this.rotateSpeed;
    this.targetSpherical.phi += dy * this.rotateSpeed;
    this.targetSpherical.phi = Math.max(this.minPhi, Math.min(this.maxPhi, this.targetSpherical.phi));
  };

  private onMouseUp = (e: MouseEvent) => {
    if (e.button !== 0) return;
    this.isDragging = false;
    this.dom.style.cursor = 'default';
  };

  private onMouseLeave = () => {
    this.isDragging = false;
    this.dom.style.cursor = 'default';
    this.normalizedMouse.set(-10, -10);
  };

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY;
    const factor = Math.exp(delta * this.zoomSpeed);
    this.targetSpherical.radius *= factor;
    this.targetSpherical.radius = Math.max(
      this.minRadius,
      Math.min(this.maxRadius, this.targetSpherical.radius)
    );
  };

  private onTouchStart = (e: TouchEvent) => {
    if (e.touches.length === 1) {
      e.preventDefault();
      this.isDragging = true;
      this.lastX = e.touches[0].clientX;
      this.lastY = e.touches[0].clientY;
    } else if (e.touches.length === 2) {
      e.preventDefault();
    }
  };

  private onTouchMove = (e: TouchEvent) => {
    if (e.touches.length === 1 && this.isDragging) {
      e.preventDefault();
      const t = e.touches[0];
      const rect = this.dom.getBoundingClientRect();
      this.normalizedMouse.x = ((t.clientX - rect.left) / rect.width) * 2 - 1;
      this.normalizedMouse.y = -((t.clientY - rect.top) / rect.height) * 2 + 1;

      const dx = t.clientX - this.lastX;
      const dy = t.clientY - this.lastY;
      this.lastX = t.clientX;
      this.lastY = t.clientY;

      this.targetSpherical.theta -= dx * this.rotateSpeed;
      this.targetSpherical.phi += dy * this.rotateSpeed;
      this.targetSpherical.phi = Math.max(this.minPhi, Math.min(this.maxPhi, this.targetSpherical.phi));
    } else if (e.touches.length === 2) {
      e.preventDefault();
    }
  };

  private onTouchEnd = (e: TouchEvent) => {
    this.isDragging = false;
    if (e.touches.length === 0) {
      this.normalizedMouse.set(-10, -10);
    }
  };

  private onKeyDown = (e: KeyboardEvent) => {
    if (e.code === 'Space') {
      e.preventDefault();
      this.callbacks.onDisturb();
    } else if (e.code === 'KeyR') {
      e.preventDefault();
      this.callbacks.onReset();
    }
  };

  private onResize = () => {
  };

  private applyCamera() {
    const sinPhi = Math.sin(this.spherical.phi);
    this.camera.position.x = this.target.x + this.spherical.radius * sinPhi * Math.cos(this.spherical.theta);
    this.camera.position.y = this.target.y + this.spherical.radius * Math.cos(this.spherical.phi);
    this.camera.position.z = this.target.z + this.spherical.radius * sinPhi * Math.sin(this.spherical.theta);
    this.camera.lookAt(this.target);
  }

  public update() {
    this.spherical.radius += (this.targetSpherical.radius - this.spherical.radius) * this.damping;
    this.spherical.theta += (this.targetSpherical.theta - this.spherical.theta) * this.damping;
    this.spherical.phi += (this.targetSpherical.phi - this.spherical.phi) * this.damping;
    this.applyCamera();
  }

  public dispose() {
    this.dom.removeEventListener('mousedown', this.onMouseDown);
    this.dom.removeEventListener('mousemove', this.onMouseMove);
    this.dom.removeEventListener('mouseup', this.onMouseUp);
    this.dom.removeEventListener('mouseleave', this.onMouseLeave);
    this.dom.removeEventListener('wheel', this.onWheel);
    this.dom.removeEventListener('touchstart', this.onTouchStart);
    this.dom.removeEventListener('touchmove', this.onTouchMove);
    this.dom.removeEventListener('touchend', this.onTouchEnd);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('resize', this.onResize);
  }
}
