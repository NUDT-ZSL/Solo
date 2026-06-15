import * as THREE from 'three';
import { KaleidoscopeCore } from './kaleidoscopeCore';

export class InteractionManager {
  private domElement: HTMLElement;
  private camera: THREE.PerspectiveCamera;
  private kaleidoscope: KaleidoscopeCore;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;

  private isDragging: boolean = false;
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;
  private lastMouseMoveTime: number = 0;

  private cameraTargetTheta: number = 0;
  private cameraTargetPhi: number = Math.PI / 2;
  private cameraTheta: number = 0;
  private cameraPhi: number = Math.PI / 2;

  private cameraTargetDistance: number = 10;
  private cameraDistance: number = 10;
  private minDistance: number = 3;
  private maxDistance: number = 20;

  private dampingFactor: number = 0.08;

  private onDragEndCallbacks: Array<() => void> = [];

  constructor(
    domElement: HTMLElement,
    camera: THREE.PerspectiveCamera,
    kaleidoscope: KaleidoscopeCore
  ) {
    this.domElement = domElement;
    this.camera = camera;
    this.kaleidoscope = kaleidoscope;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.setupEventListeners();
    this.updateCameraPosition();
  }

  private setupEventListeners(): void {
    this.domElement.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('mousemove', this.onMouseMove);
    this.domElement.addEventListener('wheel', this.onWheel, { passive: false });
    this.domElement.addEventListener('contextmenu', this.onContextMenu);

    this.domElement.addEventListener('touchstart', this.onTouchStart, { passive: false });
    window.addEventListener('touchend', this.onTouchEnd);
    window.addEventListener('touchmove', this.onTouchMove, { passive: false });
  }

  private onContextMenu = (e: Event): void => {
    e.preventDefault();
  };

  private onMouseDown = (e: MouseEvent): void => {
    if (e.button !== 0 && e.button !== 2) return;
    this.isDragging = true;
    this.dragStartX = e.clientX;
    this.dragStartY = e.clientY;
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
    this.lastMouseMoveTime = performance.now();
  };

  private onMouseUp = (e: MouseEvent): void => {
    if (!this.isDragging) return;
    const deltaX = e.clientX - this.dragStartX;
    const deltaY = e.clientY - this.dragStartY;
    const moved = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    this.isDragging = false;
    this.onDragEndCallbacks.forEach(cb => cb());
    if (moved < 5) {
      this.handleClick(e.clientX, e.clientY);
    }
  };

  private onMouseMove = (e: MouseEvent): void => {
    if (this.isDragging) {
      const now = performance.now();
      const dt = Math.max(1, now - this.lastMouseMoveTime) / 1000;

      const deltaX = e.clientX - this.lastMouseX;
      const deltaY = e.clientY - this.lastMouseY;

      this.cameraTargetTheta -= deltaX * 0.005;
      this.cameraTargetPhi -= deltaY * 0.005;
      this.cameraTargetPhi = Math.max(0.1, Math.min(Math.PI - 0.1, this.cameraTargetPhi));

      const dragScale = 0.008 / this.cameraDistance;
      this.kaleidoscope.applyDrag(-deltaX * dragScale, deltaY * dragScale);

      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
      this.lastMouseMoveTime = now;
    }
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 1.12 : 0.89;
    this.cameraTargetDistance *= zoomFactor;
    this.cameraTargetDistance = Math.max(
      this.minDistance,
      Math.min(this.maxDistance, this.cameraTargetDistance)
    );
  };

  private onTouchStart = (e: TouchEvent): void => {
    if (e.touches.length === 1) {
      e.preventDefault();
      const touch = e.touches[0];
      this.isDragging = true;
      this.dragStartX = touch.clientX;
      this.dragStartY = touch.clientY;
      this.lastMouseX = touch.clientX;
      this.lastMouseY = touch.clientY;
      this.lastMouseMoveTime = performance.now();
    }
  };

  private onTouchEnd = (e: TouchEvent): void => {
    if (!this.isDragging) return;
    const touch = e.changedTouches[0];
    if (touch) {
      const deltaX = touch.clientX - this.dragStartX;
      const deltaY = touch.clientY - this.dragStartY;
      const moved = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      this.isDragging = false;
      this.onDragEndCallbacks.forEach(cb => cb());
      if (moved < 10) {
        this.handleClick(touch.clientX, touch.clientY);
      }
    } else {
      this.isDragging = false;
      this.onDragEndCallbacks.forEach(cb => cb());
    }
  };

  private onTouchMove = (e: TouchEvent): void => {
    if (!this.isDragging || e.touches.length !== 1) return;
    e.preventDefault();
    const touch = e.touches[0];
    const now = performance.now();

    const deltaX = touch.clientX - this.lastMouseX;
    const deltaY = touch.clientY - this.lastMouseY;

    this.cameraTargetTheta -= deltaX * 0.005;
    this.cameraTargetPhi -= deltaY * 0.005;
    this.cameraTargetPhi = Math.max(0.1, Math.min(Math.PI - 0.1, this.cameraTargetPhi));

    const dragScale = 0.008 / this.cameraDistance;
    this.kaleidoscope.applyDrag(-deltaX * dragScale, deltaY * dragScale);

    this.lastMouseX = touch.clientX;
    this.lastMouseY = touch.clientY;
    this.lastMouseMoveTime = now;
  };

  private handleClick(clientX: number, clientY: number): void {
    const rect = this.domElement.getBoundingClientRect();
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const intersection = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(plane, intersection);

    this.kaleidoscope.triggerRipple(intersection);
  }

  private updateCameraPosition(): void {
    const r = this.cameraDistance;
    const theta = this.cameraTheta;
    const phi = this.cameraPhi;

    this.camera.position.x = r * Math.sin(phi) * Math.cos(theta);
    this.camera.position.y = r * Math.sin(phi) * Math.sin(theta);
    this.camera.position.z = r * Math.cos(phi);
    this.camera.lookAt(0, 0, 0);
  }

  public update(deltaTime: number): void {
    const damp = 1 - Math.pow(1 - this.dampingFactor, deltaTime * 60);

    this.cameraTheta += (this.cameraTargetTheta - this.cameraTheta) * damp;
    this.cameraPhi += (this.cameraTargetPhi - this.cameraPhi) * damp;
    this.cameraDistance += (this.cameraTargetDistance - this.cameraDistance) * damp;

    this.updateCameraPosition();
  }

  public onDragEnd(callback: () => void): void {
    this.onDragEndCallbacks.push(callback);
  }

  public dispose(): void {
    this.domElement.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('mousemove', this.onMouseMove);
    this.domElement.removeEventListener('wheel', this.onWheel);
    this.domElement.removeEventListener('contextmenu', this.onContextMenu);
    this.domElement.removeEventListener('touchstart', this.onTouchStart);
    window.removeEventListener('touchend', this.onTouchEnd);
    window.removeEventListener('touchmove', this.onTouchMove);
  }
}
