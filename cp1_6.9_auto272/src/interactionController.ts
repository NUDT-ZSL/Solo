import * as THREE from 'three';
import { StardustNetwork } from './stardustNetwork';
import { CONFIG, clamp } from './utils';

interface DragState {
  isDragging: boolean;
  startTime: number;
  startScreenX: number;
  startScreenY: number;
  lastScreenX: number;
  lastScreenY: number;
  lastTime: number;
  segmentStartWorld: THREE.Vector3 | null;
}

export class InteractionController {
  private canvas: HTMLCanvasElement;
  private network: StardustNetwork;
  private camera: THREE.PerspectiveCamera;

  private dragState: DragState = {
    isDragging: false,
    startTime: 0,
    startScreenX: 0,
    startScreenY: 0,
    lastScreenX: 0,
    lastScreenY: 0,
    lastTime: 0,
    segmentStartWorld: null
  };

  private currentZoom: number = 1;
  private targetZoom: number = 1;
  private zoomVelocity: number = 0;

  private getCurrentTime: () => number;

  constructor(
    canvas: HTMLCanvasElement,
    network: StardustNetwork,
    camera: THREE.PerspectiveCamera,
    getTimeFn: () => number
  ) {
    this.canvas = canvas;
    this.network = network;
    this.camera = camera;
    this.getCurrentTime = getTimeFn;

    this.bindEvents();
  }

  private bindEvents(): void {
    const c = this.canvas;

    c.addEventListener('pointerdown', this.onPointerDown);
    c.addEventListener('pointermove', this.onPointerMove);
    c.addEventListener('pointerup', this.onPointerUp);
    c.addEventListener('pointercancel', this.onPointerUp);
    c.addEventListener('pointerleave', this.onPointerUp);

    c.addEventListener('wheel', this.onWheel, { passive: false });

    c.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private unbindEvents(): void {
    const c = this.canvas;

    c.removeEventListener('pointerdown', this.onPointerDown);
    c.removeEventListener('pointermove', this.onPointerMove);
    c.removeEventListener('pointerup', this.onPointerUp);
    c.removeEventListener('pointercancel', this.onPointerUp);
    c.removeEventListener('pointerleave', this.onPointerUp);

    c.removeEventListener('wheel', this.onWheel);
  }

  private getCanvasSize(): { width: number; height: number } {
    const rect = this.canvas.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  }

  private getLocalCoords(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  }

  private onPointerDown = (e: PointerEvent): void => {
    e.preventDefault();
    this.canvas.setPointerCapture(e.pointerId);

    const local = this.getLocalCoords(e.clientX, e.clientY);
    const { width, height } = this.getCanvasSize();
    const worldPos = this.network.screenToWorld(local.x, local.y, width, height);

    const now = this.getCurrentTime();

    this.dragState = {
      isDragging: true,
      startTime: now,
      startScreenX: local.x,
      startScreenY: local.y,
      lastScreenX: local.x,
      lastScreenY: local.y,
      lastTime: now,
      segmentStartWorld: worldPos
    };
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (!this.dragState.isDragging) return;
    e.preventDefault();

    const local = this.getLocalCoords(e.clientX, e.clientY);
    const now = this.getCurrentTime();

    const dx = local.x - this.dragState.lastScreenX;
    const dy = local.y - this.dragState.lastScreenY;
    const dt = Math.max(0.001, now - this.dragState.lastTime);

    const pixelDist = Math.sqrt(dx * dx + dy * dy);
    const speed = pixelDist / dt;

    if (pixelDist > 8 && this.dragState.segmentStartWorld) {
      const { width, height } = this.getCanvasSize();
      const endWorld = this.network.screenToWorld(local.x, local.y, width, height);

      this.network.createBand(
        this.dragState.segmentStartWorld,
        endWorld,
        speed,
        now
      );

      this.dragState.segmentStartWorld = endWorld;
      this.dragState.lastScreenX = local.x;
      this.dragState.lastScreenY = local.y;
      this.dragState.lastTime = now;
    }
  };

  private onPointerUp = (e: PointerEvent): void => {
    if (!this.dragState.isDragging) return;

    try {
      this.canvas.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    const local = this.getLocalCoords(e.clientX, e.clientY);
    const dx = local.x - this.dragState.startScreenX;
    const dy = local.y - this.dragState.startScreenY;
    const totalDist = Math.sqrt(dx * dx + dy * dy);

    if (totalDist < 15 && this.dragState.segmentStartWorld) {
      const { width, height } = this.getCanvasSize();
      const endWorld = this.network.screenToWorld(
        this.dragState.startScreenX + 10,
        this.dragState.startScreenY + 10,
        width,
        height
      );
      const now = this.getCurrentTime();
      this.network.createBand(
        this.dragState.segmentStartWorld,
        endWorld,
        0,
        now
      );
    }

    this.dragState.isDragging = false;
    this.dragState.segmentStartWorld = null;
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    e.stopPropagation();

    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    this.targetZoom = clamp(this.targetZoom * zoomFactor, CONFIG.ZOOM_MIN, CONFIG.ZOOM_MAX);
  };

  public update(deltaTime: number): void {
    const smoothTime = CONFIG.ZOOM_SMOOTH;
    const omega = 2 / Math.max(0.001, smoothTime);
    const x = omega * deltaTime;
    const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);

    const change = this.currentZoom - this.targetZoom;
    const temp = (this.zoomVelocity + omega * change) * deltaTime;
    this.zoomVelocity = (this.zoomVelocity - omega * temp) * exp;
    this.currentZoom = this.targetZoom + (change + temp) * exp;

    this.applyZoom();
  }

  private applyZoom(): void {
    const baseFov = 60;
    this.camera.fov = baseFov / this.currentZoom;
    this.camera.updateProjectionMatrix();
  }

  public getZoom(): number {
    return this.currentZoom;
  }

  public resize(): void {
    // Zoom is based on FOV so no additional resize needed
  }

  public dispose(): void {
    this.unbindEvents();
  }
}
