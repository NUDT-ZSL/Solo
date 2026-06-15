import * as THREE from 'three';
import { ParticleSystem } from './particles';

export class InteractionHandler {
  private camera: THREE.PerspectiveCamera;
  private scene: THREE.Scene;
  private renderer: THREE.WebGLRenderer;
  private particleSystem: ParticleSystem;

  private isDragging: boolean = false;
  private previousMouse: { x: number; y: number } = { x: 0, y: 0 };

  private spherical: THREE.Spherical;
  private target: THREE.Vector3;
  private dampingFactor: number = 0.08;

  private targetSpherical: THREE.Spherical;
  private isAnimating: boolean = false;

  private raycaster: THREE.Raycaster;
  private mouseNDC: THREE.Vector2;

  private clickTimeout: number | null = null;
  private mouseDownPos: { x: number; y: number } = { x: 0, y: 0 };
  private isClick: boolean = false;

  constructor(
    camera: THREE.PerspectiveCamera,
    scene: THREE.Scene,
    renderer: THREE.WebGLRenderer,
    particleSystem: ParticleSystem
  ) {
    this.camera = camera;
    this.scene = scene;
    this.renderer = renderer;
    this.particleSystem = particleSystem;

    const offset = camera.position.clone().sub(new THREE.Vector3(0, 0, 0));
    this.spherical = new THREE.Spherical().setFromVector3(offset);
    this.targetSpherical = this.spherical.clone();
    this.target = new THREE.Vector3(0, 0, 0);

    this.raycaster = new THREE.Raycaster();
    this.mouseNDC = new THREE.Vector2();

    this.bindEvents();
  }

  private bindEvents() {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    canvas.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    canvas.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
    canvas.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
    canvas.addEventListener('touchend', this.onTouchEnd.bind(this));
  }

  private onMouseDown(e: MouseEvent) {
    this.isDragging = true;
    this.previousMouse.x = e.clientX;
    this.previousMouse.y = e.clientY;
    this.mouseDownPos.x = e.clientX;
    this.mouseDownPos.y = e.clientY;
    this.isClick = true;
  }

  private onMouseMove(e: MouseEvent) {
    if (!this.isDragging) return;

    const dx = e.clientX - this.previousMouse.x;
    const dy = e.clientY - this.previousMouse.y;

    const moveDist = Math.sqrt(
      (e.clientX - this.mouseDownPos.x) ** 2 +
      (e.clientY - this.mouseDownPos.y) ** 2
    );
    if (moveDist > 5) this.isClick = false;

    this.targetSpherical.theta -= dx * 0.005;
    this.targetSpherical.phi -= dy * 0.005;
    this.targetSpherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.targetSpherical.phi));

    this.previousMouse.x = e.clientX;
    this.previousMouse.y = e.clientY;
  }

  private onMouseUp(e: MouseEvent) {
    this.isDragging = false;

    if (this.isClick) {
      this.handleClick(e.clientX, e.clientY);
    }
  }

  private onWheel(e: WheelEvent) {
    e.preventDefault();
    this.targetSpherical.radius += e.deltaY * 0.01;
    this.targetSpherical.radius = Math.max(5, Math.min(80, this.targetSpherical.radius));
  }

  private onTouchStart(e: TouchEvent) {
    e.preventDefault();
    if (e.touches.length === 1) {
      this.isDragging = true;
      this.previousMouse.x = e.touches[0].clientX;
      this.previousMouse.y = e.touches[0].clientY;
      this.mouseDownPos.x = e.touches[0].clientX;
      this.mouseDownPos.y = e.touches[0].clientY;
      this.isClick = true;
    }
  }

  private onTouchMove(e: TouchEvent) {
    e.preventDefault();
    if (e.touches.length === 1 && this.isDragging) {
      const dx = e.touches[0].clientX - this.previousMouse.x;
      const dy = e.touches[0].clientY - this.previousMouse.y;

      const moveDist = Math.sqrt(
        (e.touches[0].clientX - this.mouseDownPos.x) ** 2 +
        (e.touches[0].clientY - this.mouseDownPos.y) ** 2
      );
      if (moveDist > 5) this.isClick = false;

      this.targetSpherical.theta -= dx * 0.005;
      this.targetSpherical.phi -= dy * 0.005;
      this.targetSpherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.targetSpherical.phi));

      this.previousMouse.x = e.touches[0].clientX;
      this.previousMouse.y = e.touches[0].clientY;
    }
  }

  private onTouchEnd() {
    this.isDragging = false;
    if (this.isClick) {
      this.handleClick(this.previousMouse.x, this.previousMouse.y);
    }
  }

  private handleClick(clientX: number, clientY: number) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouseNDC.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouseNDC.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouseNDC, this.camera);

    const plane = new THREE.Plane(
      new THREE.Vector3(0, 0, 1).applyQuaternion(this.camera.quaternion),
      0
    );
    const intersection = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(plane, intersection);

    if (intersection) {
      this.particleSystem.triggerVortex(intersection);
    }
  }

  resetView() {
    this.targetSpherical.theta = 0;
    this.targetSpherical.phi = Math.PI * 0.5;
    this.targetSpherical.radius = 30;
    this.isAnimating = true;
  }

  update() {
    this.spherical.theta += (this.targetSpherical.theta - this.spherical.theta) * this.dampingFactor;
    this.spherical.phi += (this.targetSpherical.phi - this.spherical.phi) * this.dampingFactor;
    this.spherical.radius += (this.targetSpherical.radius - this.spherical.radius) * this.dampingFactor;

    const position = new THREE.Vector3().setFromSpherical(this.spherical).add(this.target);
    this.camera.position.copy(position);
    this.camera.lookAt(this.target);
  }

  getCameraForward(): THREE.Vector3 {
    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    return forward;
  }
}
