import * as THREE from 'three';
import { eventBus, AppEvents } from '../events/EventBus';
import { clamp } from '../utils/MathUtils';

export class CameraController {
  private camera: THREE.PerspectiveCamera;
  private target: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

  private spherical = {
    radius: 28,
    phi: Math.PI / 3,
    theta: 0,
  };

  private targetSpherical = {
    radius: 28,
    phi: Math.PI / 3,
    theta: 0,
  };

  private targetPan = new THREE.Vector3(0, 0, 0);
  private currentPan = new THREE.Vector3(0, 0, 0);

  private dampingFactor: number = 0.85;
  private minPhi: number = (60 * Math.PI) / 180;
  private maxPhi: number = (120 * Math.PI) / 180;
  private minRadius: number = 0.5;
  private maxRadius: number = 3.0;
  private baseRadius: number = 28;

  private orbitSpeed: number = 0.005;
  private zoomSpeed: number = 0.001;
  private panSpeed: number = 0.01;

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
    this.setupEventListeners();
    this.updateCamera();
  }

  private setupEventListeners(): void {
    eventBus.on(AppEvents.CAMERA_ORBIT, this.handleOrbit.bind(this));
    eventBus.on(AppEvents.CAMERA_ZOOM, this.handleZoom.bind(this));
    eventBus.on(AppEvents.CAMERA_PAN, this.handlePan.bind(this));
  }

  private handleOrbit(deltaX: number, deltaY: number): void {
    this.targetSpherical.theta -= deltaX * this.orbitSpeed;
    this.targetSpherical.phi -= deltaY * this.orbitSpeed;
    this.targetSpherical.phi = clamp(
      this.targetSpherical.phi,
      this.minPhi,
      this.maxPhi
    );
  }

  private handleZoom(delta: number): void {
    const scaleFactor = 1 - delta * this.zoomSpeed;
    const normalizedRadius = this.targetSpherical.radius / this.baseRadius;
    let newNormalized = normalizedRadius * scaleFactor;
    newNormalized = clamp(newNormalized, this.minRadius, this.maxRadius);
    this.targetSpherical.radius = newNormalized * this.baseRadius;
  }

  private handlePan(deltaX: number, deltaY: number): void {
    const right = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    const forward = new THREE.Vector3();

    this.camera.getWorldDirection(forward);
    right.crossVectors(forward, up).normalize();

    const panVector = new THREE.Vector3();
    panVector.addScaledVector(right, -deltaX * this.panSpeed);
    panVector.addScaledVector(up, deltaY * this.panSpeed);

    this.targetPan.add(panVector);
  }

  private updateSpherical(): void {
    this.spherical.radius += (this.targetSpherical.radius - this.spherical.radius) * (1 - this.dampingFactor);
    this.spherical.theta += (this.targetSpherical.theta - this.spherical.theta) * (1 - this.dampingFactor);
    this.spherical.phi += (this.targetSpherical.phi - this.spherical.phi) * (1 - this.dampingFactor);
  }

  private updatePan(): void {
    this.currentPan.lerp(this.targetPan, 1 - this.dampingFactor);
  }

  private updateCamera(): void {
    const sinPhiRadius = this.spherical.radius * Math.sin(this.spherical.phi);
    const x = sinPhiRadius * Math.sin(this.spherical.theta);
    const y = this.spherical.radius * Math.cos(this.spherical.phi);
    const z = sinPhiRadius * Math.cos(this.spherical.theta);

    const cameraPosition = new THREE.Vector3(x, y, z);
    const actualTarget = this.target.clone().add(this.currentPan);
    cameraPosition.add(actualTarget);

    this.camera.position.copy(cameraPosition);
    this.camera.lookAt(actualTarget);
  }

  public update(deltaTime: number): void {
    this.updateSpherical();
    this.updatePan();
    this.updateCamera();
  }

  public setTarget(target: THREE.Vector3): void {
    this.target.copy(target);
    this.targetPan.set(0, 0, 0);
    this.currentPan.set(0, 0, 0);
  }

  public reset(): void {
    this.targetSpherical = {
      radius: this.baseRadius,
      phi: Math.PI / 3,
      theta: 0,
    };
    this.targetPan.set(0, 0, 0);
    this.target.set(0, 0, 0);
  }

  public getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  public getTarget(): THREE.Vector3 {
    return this.target.clone().add(this.currentPan);
  }
}
