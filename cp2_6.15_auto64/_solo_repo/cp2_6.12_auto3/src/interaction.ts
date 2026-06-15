import * as THREE from 'three';
import { ParticleSystem } from './particleSystem';
import { smoothDamp } from './utils';

export class InteractionManager {
  private camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;
  private particleSystem: ParticleSystem;

  private spherical: THREE.Spherical;
  private target: THREE.Vector3;
  private isDragging: boolean = false;
  private isPanning: boolean = false;
  private previousMouse: { x: number; y: number };
  private rotateSpeed: number = 0.005;
  private panSpeed: number = 0.01;

  private targetZoom: number;
  private minZoom: number = 10;
  private maxZoom: number = 200;
  private zoomSmoothTime: number = 0.15;

  private touchStartDist: number = 0;
  private touchStartZoom: number = 0;
  private isTwoFinger: boolean = false;

  public onParticleHover: ((info: { position: THREE.Vector3; color: THREE.Color; velocity: THREE.Vector3 } | null) => void) | null = null;
  public onRenderStats: ((stats: { renderTime: number }) => void) | null = null;

  private hoverTimeout: number | null = null;
  private lastMoveTime: number = 0;

  constructor(
    camera: THREE.PerspectiveCamera,
    domElement: HTMLElement,
    particleSystem: ParticleSystem
  ) {
    this.camera = camera;
    this.domElement = domElement;
    this.particleSystem = particleSystem;

    const direction = new THREE.Vector3().subVectors(camera.position, new THREE.Vector3(0, 0, 0));
    this.spherical = new THREE.Spherical().setFromVector3(direction);
    this.target = new THREE.Vector3(0, 0, 0);
    this.targetZoom = this.spherical.radius;
    this.previousMouse = { x: 0, y: 0 };

    this.bindEvents();
  }

  private bindEvents(): void {
    const el = this.domElement;

    el.addEventListener('mousedown', this.onMouseDown);
    el.addEventListener('mousemove', this.onMouseMove);
    el.addEventListener('mouseup', this.onMouseUp);
    el.addEventListener('mouseleave', this.onMouseUp);
    el.addEventListener('wheel', this.onWheel, { passive: false });

    el.addEventListener('touchstart', this.onTouchStart, { passive: false });
    el.addEventListener('touchmove', this.onTouchMove, { passive: false });
    el.addEventListener('touchend', this.onTouchEnd);

    el.addEventListener('click', this.onClick);
  }

  private onMouseDown = (e: MouseEvent): void => {
    if (e.button === 0) {
      this.isDragging = true;
    } else if (e.button === 2 || e.button === 1) {
      this.isPanning = true;
    }
    this.previousMouse = { x: e.clientX, y: e.clientY };
  };

  private onMouseMove = (e: MouseEvent): void => {
    const now = performance.now();
    this.lastMoveTime = now;

    if (this.isDragging) {
      const deltaX = e.clientX - this.previousMouse.x;
      const deltaY = e.clientY - this.previousMouse.y;

      this.spherical.theta -= deltaX * this.rotateSpeed;
      this.spherical.phi += deltaY * this.rotateSpeed;
      this.spherical.phi = Math.max(0.01, Math.min(Math.PI - 0.01, this.spherical.phi));

      this.previousMouse = { x: e.clientX, y: e.clientY };
    } else if (this.isPanning) {
      const deltaX = e.clientX - this.previousMouse.x;
      const deltaY = e.clientY - this.previousMouse.y;

      const panOffset = new THREE.Vector3(
        -deltaX * this.panSpeed * (this.spherical.radius / 50),
        deltaY * this.panSpeed * (this.spherical.radius / 50),
        0
      );

      const rotation = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        new THREE.Vector3().subVectors(this.camera.position, this.target).normalize()
      );
      panOffset.applyQuaternion(rotation);
      this.target.add(panOffset);

      this.previousMouse = { x: e.clientX, y: e.clientY };
    }

    if (this.hoverTimeout !== null) {
      window.clearTimeout(this.hoverTimeout);
    }
    this.hoverTimeout = window.setTimeout(() => {
      this.checkHover(e.clientX, e.clientY);
    }, 100);
  };

  private onMouseUp = (): void => {
    this.isDragging = false;
    this.isPanning = false;
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const zoomFactor = Math.exp(e.deltaY * 0.001);
    this.targetZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.targetZoom * zoomFactor));
  };

  private onTouchStart = (e: TouchEvent): void => {
    if (e.touches.length === 1) {
      this.isDragging = true;
      this.isTwoFinger = false;
      this.previousMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2) {
      this.isDragging = false;
      this.isTwoFinger = true;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      this.touchStartDist = Math.sqrt(dx * dx + dy * dy);
      this.touchStartZoom = this.targetZoom;
    }
  };

  private onTouchMove = (e: TouchEvent): void => {
    e.preventDefault();
    if (e.touches.length === 1 && this.isDragging && !this.isTwoFinger) {
      const deltaX = e.touches[0].clientX - this.previousMouse.x;
      const deltaY = e.touches[0].clientY - this.previousMouse.y;

      this.spherical.theta -= deltaX * this.rotateSpeed;
      this.spherical.phi += deltaY * this.rotateSpeed;
      this.spherical.phi = Math.max(0.01, Math.min(Math.PI - 0.01, this.spherical.phi));

      this.previousMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2 && this.isTwoFinger) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const scale = this.touchStartDist / dist;
      this.targetZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.touchStartZoom * scale));
    }
  };

  private onTouchEnd = (): void => {
    this.isDragging = false;
    this.isTwoFinger = false;
  };

  private onClick = (e: MouseEvent): void => {
    if (performance.now() - this.lastMoveTime < 100) return;

    const rect = this.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.camera);

    const planeNormal = new THREE.Vector3(0, 0, -1);
    const planePoint = new THREE.Vector3(0, 0, 0);
    const plane = new THREE.Plane(planeNormal, -planePoint.dot(planeNormal));
    const intersectPoint = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, intersectPoint);

    if (!intersectPoint) {
      const direction = new THREE.Vector3();
      this.camera.getWorldDirection(direction);
      intersectPoint.copy(raycaster.ray.origin).add(direction.multiplyScalar(50));
    }

    this.particleSystem.burst(intersectPoint);
  };

  private checkHover(clientX: number, clientY: number): void {
    if (!this.onParticleHover) return;

    const rect = this.domElement.getBoundingClientRect();
    const info = this.particleSystem.getParticleInfoAt(
      clientX - rect.left,
      clientY - rect.top,
      this.camera,
      rect.width,
      rect.height
    );

    this.onParticleHover(info);
  }

  public update(deltaTime: number): void {
    this.spherical.radius = smoothDamp(
      this.spherical.radius,
      this.targetZoom,
      this.zoomSmoothTime,
      deltaTime
    );

    const offset = new THREE.Vector3().setFromSpherical(this.spherical);
    this.camera.position.copy(this.target).add(offset);
    this.camera.lookAt(this.target);
  }
}
