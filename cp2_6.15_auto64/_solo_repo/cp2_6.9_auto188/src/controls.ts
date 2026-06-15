import * as THREE from 'three';
import { Nebula } from './nebula';
import { SupernovaManager, SupernovaInstance } from './supernova';
import { clamp } from './utils';

export class CameraControls {
  private camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;
  private scene: THREE.Scene;
  private nebula: Nebula;
  private supernovaManager: SupernovaManager;

  private isDragging: boolean = false;
  private previousMousePosition: { x: number; y: number } = { x: 0, y: 0 };

  public spherical: THREE.Spherical = new THREE.Spherical();
  public target: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

  private readonly MIN_DISTANCE = 5;
  private readonly MAX_DISTANCE = 25;
  private readonly ROTATION_SPEED = 0.005;
  private readonly ZOOM_SPEED = 0.001;

  private smoothedSpherical: THREE.Spherical = new THREE.Spherical();
  private readonly SMOOTHING_FACTOR = 0.1;

  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private mouse: THREE.Vector2 = new THREE.Vector2();

  private onSupernovaCallback: ((instance: SupernovaInstance) => void) | null = null;

  constructor(
    camera: THREE.PerspectiveCamera,
    domElement: HTMLElement,
    scene: THREE.Scene,
    nebula: Nebula,
    supernovaManager: SupernovaManager
  ) {
    this.camera = camera;
    this.domElement = domElement;
    this.scene = scene;
    this.nebula = nebula;
    this.supernovaManager = supernovaManager;

    this.spherical.setFromVector3(camera.position.clone().sub(this.target));
    this.smoothedSpherical.copy(this.spherical);

    this.addEventListeners();
  }

  public onSupernova(callback: (instance: SupernovaInstance) => void): void {
    this.onSupernovaCallback = callback;
  }

  private addEventListeners(): void {
    this.domElement.addEventListener('mousedown', this.onMouseDown);
    this.domElement.addEventListener('mousemove', this.onMouseMove);
    this.domElement.addEventListener('mouseup', this.onMouseUp);
    this.domElement.addEventListener('mouseleave', this.onMouseUp);
    this.domElement.addEventListener('wheel', this.onWheel);
    this.domElement.addEventListener('click', this.onClick);

    this.domElement.addEventListener('touchstart', this.onTouchStart);
    this.domElement.addEventListener('touchmove', this.onTouchMove);
    this.domElement.addEventListener('touchend', this.onTouchEnd);
  }

  private onMouseDown = (e: MouseEvent): void => {
    this.isDragging = true;
    this.previousMousePosition = { x: e.clientX, y: e.clientY };
  };

  private onMouseMove = (e: MouseEvent): void => {
    if (!this.isDragging) return;

    const deltaX = e.clientX - this.previousMousePosition.x;
    const deltaY = e.clientY - this.previousMousePosition.y;

    this.spherical.theta -= deltaX * this.ROTATION_SPEED;
    this.spherical.phi = clamp(
      this.spherical.phi - deltaY * this.ROTATION_SPEED,
      0.1,
      Math.PI - 0.1
    );

    this.previousMousePosition = { x: e.clientX, y: e.clientY };
  };

  private onMouseUp = (): void => {
    this.isDragging = false;
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const zoomAmount = e.deltaY * this.ZOOM_SPEED;
    this.spherical.radius = clamp(
      this.spherical.radius + zoomAmount * this.spherical.radius,
      this.MIN_DISTANCE,
      this.MAX_DISTANCE
    );
  };

  private onClick = (e: MouseEvent): void => {
    const rect = this.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    if (this.nebula.interactivePoint && this.nebula.interactivePointVisible) {
      const intersects = this.raycaster.intersectObject(this.nebula.interactivePoint);
      if (intersects.length > 0) {
        const worldPos = new THREE.Vector3();
        this.nebula.interactivePoint.getWorldPosition(worldPos);
        const instance = this.supernovaManager.trigger(worldPos, this.scene);
        this.nebula.hideInteractivePoint();
        this.nebula.applySupernovaPush(worldPos, 2, 0.5);
        if (this.onSupernovaCallback) {
          this.onSupernovaCallback(instance);
        }
        return;
      }
    }
  };

  private onTouchStart = (e: TouchEvent): void => {
    if (e.touches.length === 1) {
      this.isDragging = true;
      this.previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  };

  private onTouchMove = (e: TouchEvent): void => {
    if (!this.isDragging || e.touches.length !== 1) return;
    e.preventDefault();

    const deltaX = e.touches[0].clientX - this.previousMousePosition.x;
    const deltaY = e.touches[0].clientY - this.previousMousePosition.y;

    this.spherical.theta -= deltaX * this.ROTATION_SPEED;
    this.spherical.phi = clamp(
      this.spherical.phi - deltaY * this.ROTATION_SPEED,
      0.1,
      Math.PI - 0.1
    );

    this.previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  private onTouchEnd = (e: TouchEvent): void => {
    if (e.touches.length === 0) {
      this.isDragging = false;
    }
  };

  public update(): void {
    this.smoothedSpherical.theta += (this.spherical.theta - this.smoothedSpherical.theta) * this.SMOOTHING_FACTOR;
    this.smoothedSpherical.phi += (this.spherical.phi - this.smoothedSpherical.phi) * this.SMOOTHING_FACTOR;
    this.smoothedSpherical.radius += (this.spherical.radius - this.smoothedSpherical.radius) * this.SMOOTHING_FACTOR;

    const offset = new THREE.Vector3().setFromSpherical(this.smoothedSpherical);
    this.camera.position.copy(this.target).add(offset);
    this.camera.lookAt(this.target);

    this.nebula.applyParallax(this.smoothedSpherical.radius);
  }

  public getCameraDistance(): number {
    return this.smoothedSpherical.radius;
  }

  public dispose(): void {
    this.domElement.removeEventListener('mousedown', this.onMouseDown);
    this.domElement.removeEventListener('mousemove', this.onMouseMove);
    this.domElement.removeEventListener('mouseup', this.onMouseUp);
    this.domElement.removeEventListener('mouseleave', this.onMouseUp);
    this.domElement.removeEventListener('wheel', this.onWheel);
    this.domElement.removeEventListener('click', this.onClick);
    this.domElement.removeEventListener('touchstart', this.onTouchStart);
    this.domElement.removeEventListener('touchmove', this.onTouchMove);
    this.domElement.removeEventListener('touchend', this.onTouchEnd);
  }
}
