import * as THREE from 'three';
import { CONFIG } from './config';

export interface InteractionState {
  cameraZ: number;
  idleFactor: number;
}

export class InteractionController {
  private camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;
  private onShock: (origin: THREE.Vector3) => void;

  private isDragging = false;
  private prevMouse = { x: 0, y: 0 };
  private yaw = 0;
  private pitch = 0;
  private targetYaw = 0;
  private targetPitch = 0;
  private cameraZ = 0;
  private targetCameraZ = 0;

  private lastInteractionTime = performance.now() / 1000;
  private idleFactor = 0;

  private touchStartDist = 0;
  private touchStartZ = 0;
  private isTouchDragging = false;
  private prevTouch = { x: 0, y: 0 };

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement, onShock: (origin: THREE.Vector3) => void) {
    this.camera = camera;
    this.domElement = domElement;
    this.onShock = onShock;

    this.bindMouseEvents();
    this.bindTouchEvents();
    this.bindWheelEvents();
    this.updateCameraLook();
  }

  private bindMouseEvents(): void {
    const el = this.domElement;

    el.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.isDragging = true;
        this.prevMouse.x = e.clientX;
        this.prevMouse.y = e.clientY;
        this.markInteraction();
      }
    });

    el.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.prevMouse.x;
      const dy = e.clientY - this.prevMouse.y;
      this.targetYaw += dx * 0.003;
      this.targetPitch -= dy * 0.003;
      this.targetPitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.targetPitch));
      this.prevMouse.x = e.clientX;
      this.prevMouse.y = e.clientY;
      this.markInteraction();
    });

    el.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    el.addEventListener('mouseleave', () => {
      this.isDragging = false;
    });

    el.addEventListener('click', (e) => {
      const shockOrigin = this.getShockOrigin(e.clientX, e.clientY);
      this.onShock(shockOrigin);
      this.markInteraction();
    });
  }

  private bindTouchEvents(): void {
    const el = this.domElement;

    el.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        this.isTouchDragging = true;
        this.prevTouch.x = e.touches[0].clientX;
        this.prevTouch.y = e.touches[0].clientY;
      } else if (e.touches.length === 2) {
        this.isTouchDragging = false;
        this.touchStartDist = this.getTouchDistance(e.touches);
        this.touchStartZ = this.targetCameraZ;
      }
      this.markInteraction();
    }, { passive: true });

    el.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (e.touches.length === 1 && this.isTouchDragging) {
        const dx = e.touches[0].clientX - this.prevTouch.x;
        const dy = e.touches[0].clientY - this.prevTouch.y;
        this.targetYaw += dx * 0.004;
        this.targetPitch -= dy * 0.004;
        this.targetPitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.targetPitch));
        this.prevTouch.x = e.touches[0].clientX;
        this.prevTouch.y = e.touches[0].clientY;
      } else if (e.touches.length === 2) {
        const dist = this.getTouchDistance(e.touches);
        const scale = this.touchStartDist / dist;
        this.targetCameraZ = this.touchStartZ + (scale - 1) * 20;
      }
      this.markInteraction();
    }, { passive: false });

    el.addEventListener('touchend', (e) => {
      if (e.touches.length === 0) {
        if (this.isTouchDragging) {
          this.isTouchDragging = false;
        }
      }
      this.markInteraction();
    });

    el.addEventListener('tap', (e: TouchEvent) => {
      if (e.touches.length === 1) {
        const shockOrigin = this.getShockOrigin(e.touches[0].clientX, e.touches[0].clientY);
        this.onShock(shockOrigin);
      }
      this.markInteraction();
    });
  }

  private bindWheelEvents(): void {
    this.domElement.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.targetCameraZ += e.deltaY * 0.02 * CONFIG.moveSpeed;
      this.markInteraction();
    }, { passive: false });
  }

  private getTouchDistance(touches: TouchList): number {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private getShockOrigin(clientX: number, clientY: number): THREE.Vector3 {
    const rect = this.domElement.getBoundingClientRect();
    const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);

    const direction = raycaster.ray.direction.clone();
    const origin = this.camera.position.clone().add(direction.multiplyScalar(12));

    return origin;
  }

  private markInteraction(): void {
    this.lastInteractionTime = performance.now() / 1000;
  }

  update(delta: number): InteractionState {
    this.yaw += (this.targetYaw - this.yaw) * CONFIG.rotationEasing;
    this.pitch += (this.targetPitch - this.pitch) * CONFIG.rotationEasing;
    this.cameraZ += (this.targetCameraZ - this.cameraZ) * CONFIG.moveEasing;

    this.camera.position.set(0, 0, this.cameraZ);
    this.updateCameraLook();

    const now = performance.now() / 1000;
    const idleTime = now - this.lastInteractionTime;

    if (idleTime > CONFIG.idleThreshold) {
      const excess = idleTime - CONFIG.idleThreshold;
      this.idleFactor = Math.min(1.0, excess * CONFIG.idleAccelRate);
    } else {
      this.idleFactor *= 0.95;
      if (this.idleFactor < 0.001) this.idleFactor = 0;
    }

    return {
      cameraZ: this.cameraZ,
      idleFactor: this.idleFactor,
    };
  }

  private updateCameraLook(): void {
    const lookDir = new THREE.Vector3(
      Math.sin(this.yaw) * Math.cos(this.pitch),
      Math.sin(this.pitch),
      Math.cos(this.yaw) * Math.cos(this.pitch)
    );
    this.camera.lookAt(this.camera.position.clone().add(lookDir));
  }

  resetView(): void {
    this.yaw = 0;
    this.pitch = 0;
    this.targetYaw = 0;
    this.targetPitch = 0;
    this.cameraZ = 0;
    this.targetCameraZ = 0;
    this.idleFactor = 0;
    this.updateCameraLook();
  }

  getCameraZ(): number {
    return this.cameraZ;
  }
}
