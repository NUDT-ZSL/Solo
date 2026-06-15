import * as THREE from 'three';

export interface ControlsCallbacks {
  onLayerSwitch?: (layerIndex: number) => void;
  onSpeedChange?: (delta: number) => void;
}

export class OrbitControls {
  private camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;
  private target = new THREE.Vector3(0, 0, 0);
  private spherical = new THREE.Spherical();
  private isDragging = false;
  private previousMouse = { x: 0, y: 0 };
  private rotateSpeed = 0.005;
  private zoomSpeed = 0.1;
  private minDistance = 50;
  private maxDistance = 500;
  private callbacks: ControlsCallbacks;

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement, callbacks: ControlsCallbacks = {}) {
    this.camera = camera;
    this.domElement = domElement;
    this.callbacks = callbacks;

    const offset = new THREE.Vector3().subVectors(camera.position, this.target);
    this.spherical.setFromVector3(offset);
    this.spherical.radius = Math.max(this.minDistance, Math.min(this.maxDistance, this.spherical.radius));

    this.addEventListeners();
  }

  private addEventListeners(): void {
    this.domElement.addEventListener('mousedown', this.onMouseDown);
    this.domElement.addEventListener('mousemove', this.onMouseMove);
    this.domElement.addEventListener('mouseup', this.onMouseUp);
    this.domElement.addEventListener('mouseleave', this.onMouseUp);
    this.domElement.addEventListener('wheel', this.onWheel, { passive: false });
    document.addEventListener('keydown', this.onKeyDown);
  }

  private onMouseDown = (event: MouseEvent): void => {
    if (event.button !== 0) return;
    this.isDragging = true;
    this.previousMouse.x = event.clientX;
    this.previousMouse.y = event.clientY;
  };

  private onMouseMove = (event: MouseEvent): void => {
    if (!this.isDragging) return;

    const deltaX = event.clientX - this.previousMouse.x;
    const deltaY = event.clientY - this.previousMouse.y;

    this.spherical.theta -= deltaX * this.rotateSpeed;
    this.spherical.phi -= deltaY * this.rotateSpeed;

    const EPS = 0.0001;
    this.spherical.phi = Math.max(EPS, Math.min(Math.PI - EPS, this.spherical.phi));

    this.updateCamera();

    this.previousMouse.x = event.clientX;
    this.previousMouse.y = event.clientY;
  };

  private onMouseUp = (): void => {
    this.isDragging = false;
  };

  private onWheel = (event: WheelEvent): void => {
    event.preventDefault();

    const zoomFactor = Math.exp(-event.deltaY * this.zoomSpeed * 0.001);
    this.spherical.radius *= zoomFactor;
    this.spherical.radius = Math.max(this.minDistance, Math.min(this.maxDistance, this.spherical.radius));

    this.updateCamera();
  };

  private onKeyDown = (event: KeyboardEvent): void => {
    switch (event.key) {
      case '1':
        this.callbacks.onLayerSwitch?.(0);
        break;
      case '2':
        this.callbacks.onLayerSwitch?.(1);
        break;
      case '3':
        this.callbacks.onLayerSwitch?.(2);
        break;
      case 'ArrowUp':
        this.callbacks.onSpeedChange?.(0.1);
        break;
      case 'ArrowDown':
        this.callbacks.onSpeedChange?.(-0.1);
        break;
    }
  };

  private updateCamera(): void {
    const offset = new THREE.Vector3().setFromSpherical(this.spherical);
    this.camera.position.copy(this.target).add(offset);
    this.camera.lookAt(this.target);
  }

  public dispose(): void {
    this.domElement.removeEventListener('mousedown', this.onMouseDown);
    this.domElement.removeEventListener('mousemove', this.onMouseMove);
    this.domElement.removeEventListener('mouseup', this.onMouseUp);
    this.domElement.removeEventListener('mouseleave', this.onMouseUp);
    this.domElement.removeEventListener('wheel', this.onWheel);
    document.removeEventListener('keydown', this.onKeyDown);
  }
}
