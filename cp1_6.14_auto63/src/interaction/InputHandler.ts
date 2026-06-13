import * as THREE from 'three';
import { eventBus, AppEvents, ForceFieldData, FluidType } from '../events/EventBus';
import { CameraController } from './CameraController';
import { clamp } from '../utils/MathUtils';

type InteractionMode = 'none' | 'orbit' | 'pan' | 'force';

export class InputHandler {
  private domElement: HTMLElement;
  private cameraController: CameraController;
  private raycaster: THREE.Raycaster;
  private pointer: THREE.Vector2;

  private mode: InteractionMode = 'none';
  private isPointerDown: boolean = false;
  private pointerButton: number = -1;

  private lastPointerX: number = 0;
  private lastPointerY: number = 0;
  private lastPointerTime: number = 0;
  private deltaX: number = 0;
  private deltaY: number = 0;
  private velocityX: number = 0;
  private velocityY: number = 0;

  private last3DPosition: THREE.Vector3 = new THREE.Vector3();
  private forcePlaneNormal: THREE.Vector3 = new THREE.Vector3(0, 0, 1);
  private forcePlane: THREE.Plane = new THREE.Plane();

  private forceFieldRadius: number = 8;
  private lastForceEmitTime: number = 0;
  private forceEmitInterval: number = 16;

  private keys: Set<string> = new Set();

  private currentFluidType: FluidType = 'water';

  constructor(domElement: HTMLElement, cameraController: CameraController) {
    this.domElement = domElement;
    this.cameraController = cameraController;
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    const canvas = this.domElement.querySelector('canvas');
    const target = canvas || this.domElement;

    target.addEventListener('pointerdown', this.onPointerDown.bind(this));
    target.addEventListener('pointermove', this.onPointerMove.bind(this));
    target.addEventListener('pointerup', this.onPointerUp.bind(this));
    target.addEventListener('pointerleave', this.onPointerUp.bind(this));
    target.addEventListener('pointercancel', this.onPointerUp.bind(this));
    target.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
    target.addEventListener('contextmenu', (e) => e.preventDefault());

    window.addEventListener('keydown', this.onKeyDown.bind(this));
    window.addEventListener('keyup', this.onKeyUp.bind(this));

    eventBus.on(AppEvents.FLUID_TYPE_CHANGED, (type: FluidType) => {
      this.currentFluidType = type;
    });
  }

  private onPointerDown(event: PointerEvent): void {
    this.isPointerDown = true;
    this.pointerButton = event.button;

    this.lastPointerX = event.clientX;
    this.lastPointerY = event.clientY;
    this.lastPointerTime = performance.now();
    this.deltaX = 0;
    this.deltaY = 0;
    this.velocityX = 0;
    this.velocityY = 0;

    this.updatePointer(event);
    this.updateRaycaster();
    this.computeForcePlane();

    const hitPoint = this.intersectForcePlane();
    if (hitPoint) {
      this.last3DPosition.copy(hitPoint);
    }

    if (this.keys.has('Shift') || event.button === 1) {
      this.mode = 'pan';
    } else if (event.button === 2) {
      this.mode = 'orbit';
    } else if (event.button === 0) {
      this.mode = 'force';
      this.lastForceEmitTime = 0;
    }

    (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
  }

  private onPointerMove(event: PointerEvent): void {
    const currentTime = performance.now();
    const dt = Math.max(1, currentTime - this.lastPointerTime) / 1000;

    this.deltaX = event.clientX - this.lastPointerX;
    this.deltaY = event.clientY - this.lastPointerY;

    this.velocityX = this.deltaX / dt;
    this.velocityY = this.deltaY / dt;

    this.lastPointerX = event.clientX;
    this.lastPointerY = event.clientY;
    this.lastPointerTime = currentTime;

    if (!this.isPointerDown) return;

    this.updatePointer(event);

    switch (this.mode) {
      case 'orbit':
        eventBus.emit(AppEvents.CAMERA_ORBIT, this.deltaX, this.deltaY);
        break;
      case 'pan':
        eventBus.emit(AppEvents.CAMERA_PAN, this.deltaX, this.deltaY);
        break;
      case 'force':
        this.handleForceInteraction(currentTime);
        break;
    }
  }

  private onPointerUp(event: PointerEvent): void {
    if (!this.isPointerDown) return;

    this.isPointerDown = false;

    if (this.mode === 'force') {
      eventBus.emit(AppEvents.FORCE_FIELD_RELEASED);
    }

    this.mode = 'none';
    this.pointerButton = -1;

    try {
      (event.target as HTMLElement).releasePointerCapture?.(event.pointerId);
    } catch (e) {}
  }

  private onWheel(event: WheelEvent): void {
    event.preventDefault();
    event.stopPropagation();
    eventBus.emit(AppEvents.CAMERA_ZOOM, event.deltaY);
  }

  private onKeyDown(event: KeyboardEvent): void {
    this.keys.add(event.key);

    switch (event.key.toLowerCase()) {
      case '1':
        eventBus.emit(AppEvents.FLUID_TYPE_CHANGED, 'water' as FluidType);
        break;
      case '2':
        eventBus.emit(AppEvents.FLUID_TYPE_CHANGED, 'smoke' as FluidType);
        break;
      case '3':
        eventBus.emit(AppEvents.FLUID_TYPE_CHANGED, 'fire' as FluidType);
        break;
      case 'r':
        this.cameraController.reset();
        break;
      case 'g':
        this.toggleGuiPanel();
        break;
    }
  }

  private onKeyUp(event: KeyboardEvent): void {
    this.keys.delete(event.key);
  }

  private toggleGuiPanel(): void {
    const dgMain = document.querySelector('.dg.ac') as HTMLElement;
    if (dgMain) {
      const closeBtn = dgMain.querySelector('.close-button') as HTMLElement;
      if (closeBtn) {
        closeBtn.click();
      }
    }
  }

  private updatePointer(event: PointerEvent): void {
    const rect = this.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private updateRaycaster(): void {
    const camera = this.cameraController.getCamera();
    this.raycaster.setFromCamera(this.pointer, camera);
  }

  private computeForcePlane(): void {
    const camera = this.cameraController.getCamera();
    this.forcePlaneNormal.set(0, 0, 1);
    this.forcePlaneNormal.applyQuaternion(camera.quaternion);
    this.forcePlaneNormal.normalize();

    const target = this.cameraController.getTarget();
    this.forcePlane.setFromNormalAndCoplanarPoint(this.forcePlaneNormal, target);
  }

  private intersectForcePlane(): THREE.Vector3 | null {
    this.updateRaycaster();
    const intersection = new THREE.Vector3();
    const result = this.raycaster.ray.intersectPlane(this.forcePlane, intersection);
    return result;
  }

  private handleForceInteraction(currentTime: number): void {
    if (currentTime - this.lastForceEmitTime < this.forceEmitInterval) return;
    this.lastForceEmitTime = currentTime;

    const hitPoint = this.intersectForcePlane();
    if (!hitPoint) return;

    const direction = new THREE.Vector3()
      .subVectors(hitPoint, this.last3DPosition)
      .normalize();

    if (direction.lengthSq() < 0.0001) {
      const camera = this.cameraController.getCamera();
      camera.getWorldDirection(direction);
      direction.negate();
    }

    const speed2D = Math.sqrt(this.velocityX * this.velocityX + this.velocityY * this.velocityY);
    const normalizedSpeed = clamp(speed2D / 500, 0, 1);
    const strength = normalizedSpeed * 50;

    const camera = this.cameraController.getCamera();
    const worldDeltaX = (this.deltaX / window.innerWidth) * 2 * camera.aspect;
    const worldDeltaY = (this.deltaY / window.innerHeight) * 2;

    const right = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    const camDir = new THREE.Vector3();
    camera.getWorldDirection(camDir);
    right.crossVectors(camDir, up).normalize();

    direction.set(0, 0, 0);
    direction.addScaledVector(right, worldDeltaX * 10);
    direction.addScaledVector(up, -worldDeltaY * 10);
    if (direction.lengthSq() > 0.0001) {
      direction.normalize();
    } else {
      camera.getWorldDirection(direction);
      direction.negate();
    }

    const forceData: ForceFieldData = {
      position: {
        x: hitPoint.x,
        y: hitPoint.y,
        z: hitPoint.z,
      },
      direction: {
        x: direction.x,
        y: direction.y,
        z: direction.z,
      },
      strength: strength,
      radius: this.forceFieldRadius,
    };

    eventBus.emit(AppEvents.FORCE_FIELD_APPLIED, forceData);
    this.last3DPosition.copy(hitPoint);
  }

  public setForceFieldRadius(radius: number): void {
    this.forceFieldRadius = radius;
  }

  public dispose(): void {
    const canvas = this.domElement.querySelector('canvas');
    const target = canvas || this.domElement;

    target.removeEventListener('pointerdown', this.onPointerDown.bind(this));
    target.removeEventListener('pointermove', this.onPointerMove.bind(this));
    target.removeEventListener('pointerup', this.onPointerUp.bind(this));
    target.removeEventListener('pointerleave', this.onPointerUp.bind(this));
    target.removeEventListener('pointercancel', this.onPointerUp.bind(this));
    target.removeEventListener('wheel', this.onWheel.bind(this));

    window.removeEventListener('keydown', this.onKeyDown.bind(this));
    window.removeEventListener('keyup', this.onKeyUp.bind(this));
  }
}
