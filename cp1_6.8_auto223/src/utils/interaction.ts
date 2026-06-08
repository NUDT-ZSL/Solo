import { Vector3, Raycaster, Vector2, Camera, Scene } from 'three';
import { InteractionState } from '../types';

export class InteractionManager {
  state: InteractionState;
  private raycaster: Raycaster;
  private mouse: Vector2;
  private onEmit: ((position: Vector3) => void) | null = null;
  private onTrailClick: ((position: Vector3) => void) | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private camera: Camera | null = null;

  constructor() {
    this.state = {
      isDragging: false,
      isEmitting: false,
      lastEmitPosition: null,
      mouseDown: false,
      mouseMoved: false,
      mouseDownTime: 0,
    };
    this.raycaster = new Raycaster();
    this.mouse = new Vector2();
  }

  init(canvas: HTMLCanvasElement, camera: Camera): void {
    this.canvas = canvas;
    this.camera = camera;

    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('pointerleave', this.onPointerUp);
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  dispose(): void {
    if (!this.canvas) return;
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('pointerleave', this.onPointerUp);
  }

  setCallbacks(
    onEmit: (position: Vector3) => void,
    onTrailClick: (position: Vector3) => void
  ): void {
    this.onEmit = onEmit;
    this.onTrailClick = onTrailClick;
  }

  getWorldPosition(clientX: number, clientY: number): Vector3 | null {
    if (!this.canvas || !this.camera) return null;

    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const direction = this.raycaster.ray.direction.clone();
    const origin = this.raycaster.ray.origin.clone();
    const planeDistance = -origin.z / direction.z;
    const worldPos = origin.add(direction.multiplyScalar(planeDistance));

    return worldPos;
  }

  private onPointerDown = (e: PointerEvent): void => {
    this.state.mouseDown = true;
    this.state.mouseMoved = false;
    this.state.mouseDownTime = performance.now();
    this.state.lastEmitPosition = null;
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (!this.state.mouseDown) return;

    const dx = e.movementX;
    const dy = e.movementY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 3) {
      this.state.mouseMoved = true;
    }

    if (this.state.mouseMoved && this.onEmit) {
      const pos = this.getWorldPosition(e.clientX, e.clientY);
      if (pos) {
        const lastPos = this.state.lastEmitPosition;
        if (!lastPos || pos.distanceTo(lastPos) > 0.3) {
          this.state.lastEmitPosition = pos.clone();
          this.onEmit(pos);
        }
      }
    }
  };

  private onPointerUp = (e: PointerEvent): void => {
    if (!this.state.mouseDown) return;

    const elapsed = performance.now() - this.state.mouseDownTime;

    if (!this.state.mouseMoved && elapsed < 300) {
      const pos = this.getWorldPosition(e.clientX, e.clientY);
      if (pos) {
        if (this.onTrailClick) {
          this.onTrailClick(pos);
        }
        if (this.onEmit) {
          this.onEmit(pos);
        }
      }
    }

    this.state.mouseDown = false;
    this.state.mouseMoved = false;
    this.state.lastEmitPosition = null;
  };
}
