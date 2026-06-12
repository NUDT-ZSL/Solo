import * as THREE from 'three';
import type { CameraConfig } from '../types';

export class CameraController {
  private camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;
  private config: CameraConfig;

  private isDragging: boolean = false;
  private previousMouseX: number = 0;
  private previousMouseY: number = 0;
  private mouseX: number = 0;
  private mouseY: number = 0;

  private spherical: {
    radius: number;
    theta: number;
    phi: number;
  } = { radius: 0, theta: 0, phi: 0 };

  private target: THREE.Vector3;
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private mouseNdc: THREE.Vector2 = new THREE.Vector2();

  constructor(
    camera: THREE.PerspectiveCamera,
    domElement: HTMLElement,
    config: CameraConfig
  ) {
    this.camera = camera;
    this.domElement = domElement;
    this.config = config;
    this.target = new THREE.Vector3(
      config.target.x,
      config.target.y,
      config.target.z
    );

    this.initSpherical();
    this.bindEvents();
  }

  private initSpherical(): void {
    const pos = new THREE.Vector3(
      this.config.initialPosition.x,
      this.config.initialPosition.y,
      this.config.initialPosition.z
    );

    const offset = pos.clone().sub(this.target);
    this.spherical.radius = offset.length();
    this.spherical.theta = Math.atan2(offset.x, offset.z);
    this.spherical.phi = Math.acos(
      Math.max(-1, Math.min(1, offset.y / this.spherical.radius))
    );

    this.updateCameraPosition();
  }

  private updateCameraPosition(): void {
    const sinPhiRadius =
      Math.sin(this.spherical.phi) * this.spherical.radius;

    const x = sinPhiRadius * Math.sin(this.spherical.theta);
    const y = Math.cos(this.spherical.phi) * this.spherical.radius;
    const z = sinPhiRadius * Math.cos(this.spherical.theta);

    this.camera.position.set(
      this.target.x + x,
      this.target.y + y,
      this.target.z + z
    );
    this.camera.lookAt(this.target);
  }

  private bindEvents(): void {
    this.domElement.addEventListener('mousedown', this.onMouseDown);
    this.domElement.addEventListener('mousemove', this.onMouseMove);
    this.domElement.addEventListener('mouseup', this.onMouseUp);
    this.domElement.addEventListener('mouseleave', this.onMouseUp);
    this.domElement.addEventListener('wheel', this.onWheel, { passive: false });
  }

  private onMouseDown = (e: MouseEvent): void => {
    if (e.button !== 0) return;
    this.isDragging = true;
    this.previousMouseX = e.clientX;
    this.previousMouseY = e.clientY;
  };

  private onMouseMove = (e: MouseEvent): void => {
    this.mouseX = e.clientX;
    this.mouseY = e.clientY;

    if (!this.isDragging) return;

    const deltaX = e.clientX - this.previousMouseX;
    const deltaY = e.clientY - this.previousMouseY;

    const rotateSpeed = this.config.rotateSpeed * (Math.PI / 180);

    this.spherical.theta -= deltaX * rotateSpeed;
    this.spherical.phi -= deltaY * rotateSpeed;

    const minPhi = 0.1;
    const maxPhi = Math.PI - 0.1;
    this.spherical.phi = Math.max(minPhi, Math.min(maxPhi, this.spherical.phi));

    this.updateCameraPosition();

    this.previousMouseX = e.clientX;
    this.previousMouseY = e.clientY;
  };

  private onMouseUp = (): void => {
    this.isDragging = false;
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();

    const zoomCenter = this.getZoomCenterWorld();

    const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
    const newRadius = this.spherical.radius * zoomFactor;

    const minRadius = this.config.minZoom * 20;
    const maxRadius = this.config.maxZoom * 20;
    const clampedRadius = Math.max(minRadius, Math.min(maxRadius, newRadius));
    const actualFactor = clampedRadius / this.spherical.radius;

    if (actualFactor === 1) return;

    this.spherical.radius = clampedRadius;

    if (zoomCenter) {
      const dirToTarget = this.target.clone().sub(zoomCenter);
      const newTargetOffset = dirToTarget.multiplyScalar(actualFactor);
      this.target.copy(zoomCenter).add(newTargetOffset);
    }

    this.updateCameraPosition();
  };

  private getZoomCenterWorld(): THREE.Vector3 | null {
    const rect = this.domElement.getBoundingClientRect();
    this.mouseNdc.x = ((this.mouseX - rect.left) / rect.width) * 2 - 1;
    this.mouseNdc.y = -((this.mouseY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouseNdc, this.camera);

    const planeNormal = new THREE.Vector3()
      .subVectors(this.camera.position, this.target)
      .normalize();
    const plane = new THREE.Plane(planeNormal, -planeNormal.dot(this.target));

    const intersectPoint = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(plane, intersectPoint);

    return intersectPoint;
  }

  reset(): void {
    this.target.set(
      this.config.target.x,
      this.config.target.y,
      this.config.target.z
    );
    this.initSpherical();
  }

  updateAspect(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  dispose(): void {
    this.domElement.removeEventListener('mousedown', this.onMouseDown);
    this.domElement.removeEventListener('mousemove', this.onMouseMove);
    this.domElement.removeEventListener('mouseup', this.onMouseUp);
    this.domElement.removeEventListener('mouseleave', this.onMouseUp);
    this.domElement.removeEventListener('wheel', this.onWheel);
  }
}
