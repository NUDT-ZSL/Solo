import * as THREE from 'three';
import { ParticleSystem } from './particleSystem';

const MIN_ZOOM = 150;
const MAX_ZOOM = 500;
const SPHERE_RADIUS = 200;
const DRAG_THRESHOLD = 5;

interface InteractionCallbacks {
  onRotationChange: (deltaY: number) => void;
  onFlowSpeedChange: (speed: number) => void;
  onClickSphere: (worldPoint: THREE.Vector3) => void;
  onZoomChange: (zoom: number) => void;
}

export class InteractionManager {
  private container: HTMLElement;
  private camera: THREE.Camera;
  private particleSystem: ParticleSystem;
  private callbacks: InteractionCallbacks;
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private isDragging = false;
  private lastMouseX = 0;
  private lastMouseY = 0;
  private dragDistance = 0;
  private currentZoom = 400;
  private smoothTargetZoom = 400;
  private virtualSphere: THREE.Mesh;

  constructor(
    container: HTMLElement,
    camera: THREE.Camera,
    particleSystem: ParticleSystem,
    callbacks: InteractionCallbacks
  ) {
    this.container = container;
    this.camera = camera;
    this.particleSystem = particleSystem;
    this.callbacks = callbacks;

    const sphereGeom = new THREE.SphereGeometry(SPHERE_RADIUS, 32, 32);
    const sphereMat = new THREE.MeshBasicMaterial({ visible: false });
    this.virtualSphere = new THREE.Mesh(sphereGeom, sphereMat);
    this.particleSystem.group.add(this.virtualSphere);

    this.currentZoom = (MIN_ZOOM + MAX_ZOOM) / 2 + 50;
    this.smoothTargetZoom = this.currentZoom;
    this.updateCameraZoom();

    this.bindEvents();
  }

  private bindEvents() {
    const el = this.container;

    el.addEventListener('mousedown', this.onMouseDown);
    el.addEventListener('mousemove', this.onMouseMove);
    el.addEventListener('mouseup', this.onMouseUp);
    el.addEventListener('mouseleave', this.onMouseUp);
    el.addEventListener('wheel', this.onWheel, { passive: false });
    el.addEventListener('click', this.onClick);
  }

  private updateCameraZoom() {
    const dir = new THREE.Vector3(0, 0, 1);
    const up = new THREE.Vector3(0, 1, 0);
    this.camera.position.copy(dir.multiplyScalar(this.currentZoom));
    this.camera.lookAt(0, 0, 0);
    this.camera.up.copy(up);
  }

  private onMouseDown = (e: MouseEvent) => {
    this.isDragging = true;
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
    this.dragDistance = 0;
  };

  private onMouseMove = (e: MouseEvent) => {
    const rect = this.container.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    if (this.isDragging) {
      const deltaX = e.clientX - this.lastMouseX;
      const deltaY = e.clientY - this.lastMouseY;
      this.dragDistance += Math.abs(deltaX) + Math.abs(deltaY);

      const deltaYRot = deltaX * 0.005;
      this.callbacks.onRotationChange(deltaYRot);

      const flowSpeed = Math.max(-80, Math.min(80, deltaX * 2));
      this.callbacks.onFlowSpeedChange(flowSpeed);

      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    }
  };

  private onMouseUp = () => {
    this.isDragging = false;
    this.callbacks.onFlowSpeedChange(0);
  };

  private onClick = (e: MouseEvent) => {
    if (this.dragDistance > DRAG_THRESHOLD) return;

    const rect = this.container.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.virtualSphere);

    if (intersects.length > 0) {
      const hitPoint = intersects[0].point.clone();
      const localPoint = this.particleSystem.group.worldToLocal(hitPoint.clone());
      this.callbacks.onClickSphere(localPoint);
      this.showClickHalo(e.clientX, e.clientY);
    }
  };

  private showClickHalo(x: number, y: number) {
    const halo = document.createElement('div');
    halo.className = 'click-halo';
    halo.style.left = `${x}px`;
    halo.style.top = `${y}px`;
    document.body.appendChild(halo);
    setTimeout(() => halo.remove(), 300);
  }

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY * 0.3;
    this.smoothTargetZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, this.smoothTargetZoom + delta));
  };

  public update(dt: number) {
    const zoomDiff = this.smoothTargetZoom - this.currentZoom;
    if (Math.abs(zoomDiff) > 0.1) {
      this.currentZoom += zoomDiff * Math.min(1, dt * 10);
      this.updateCameraZoom();
      this.callbacks.onZoomChange(this.currentZoom);
    }
  }

  public dispose() {
    const el = this.container;
    el.removeEventListener('mousedown', this.onMouseDown);
    el.removeEventListener('mousemove', this.onMouseMove);
    el.removeEventListener('mouseup', this.onMouseUp);
    el.removeEventListener('mouseleave', this.onMouseUp);
    el.removeEventListener('wheel', this.onWheel);
    el.removeEventListener('click', this.onClick);

    this.virtualSphere.geometry.dispose();
    (this.virtualSphere.material as THREE.Material).dispose();
  }
}
