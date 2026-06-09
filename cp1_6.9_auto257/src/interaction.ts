import * as THREE from 'three';
import type { SelectionBox } from './waveGenerator';

const ZOOM_MIN = 6;
const ZOOM_MAX = 35;
const ZOOM_SPEED = 0.0012;
const ROTATE_SPEED = 0.005;
const BOX_X_LIMIT = 6;
const BOX_Y_LIMIT = 4;
const SELECTION_ANIM_DURATION = 0.4;

interface InteractionCallbacks {
  onPulse: () => void;
  onSelectionChanged: (box: SelectionBox) => void;
  onResetSelection: () => void;
}

interface InteractionState {
  cameraDistance: number;
  cameraTheta: number;
  cameraPhi: number;
}

export class InteractionSystem {
  private canvas: HTMLCanvasElement;
  private camera: THREE.PerspectiveCamera;
  private callbacks: InteractionCallbacks;
  private state: InteractionState;

  private isDragging = false;
  private isSelecting = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private lastMouseX = 0;
  private lastMouseY = 0;

  private selectionStartWorld = { x: 0, y: 0 };
  private selectionEndWorld = { x: 0, y: 0 };
  public selectionBox: SelectionBox;
  public selectionActive = false;
  public selectionAnimProgress = 0;

  public haloTimer = 0;

  public mouseWorldX = 0;
  public mouseWorldY = 0;

  private raycaster = new THREE.Raycaster();
  private ndc = new THREE.Vector2();

  constructor(
    canvas: HTMLCanvasElement,
    camera: THREE.PerspectiveCamera,
    callbacks: InteractionCallbacks
  ) {
    this.canvas = canvas;
    this.camera = camera;
    this.callbacks = callbacks;
    this.state = {
      cameraDistance: 15,
      cameraTheta: Math.PI * 0.15,
      cameraPhi: Math.PI * 0.5
    };
    this.selectionBox = {
      active: false,
      xMin: 0, xMax: 0, yMin: 0, yMax: 0,
      zoomProgress: 0
    };
    this.bindEvents();
    this.updateCameraFromState();
  }

  private bindEvents(): void {
    const c = this.canvas;
    c.addEventListener('pointerdown', this.onPointerDown);
    c.addEventListener('pointermove', this.onPointerMove);
    c.addEventListener('pointerup', this.onPointerUp);
    c.addEventListener('pointerleave', this.onPointerUp);
    c.addEventListener('wheel', this.onWheel, { passive: false });

    const btn = document.getElementById('pulse-btn');
    if (btn) {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.callbacks.onPulse();
      });
    }
  }

  public unbindEvents(): void {
    const c = this.canvas;
    c.removeEventListener('pointerdown', this.onPointerDown);
    c.removeEventListener('pointermove', this.onPointerMove);
    c.removeEventListener('pointerup', this.onPointerUp);
    c.removeEventListener('pointerleave', this.onPointerUp);
    c.removeEventListener('wheel', this.onWheel);
  }

  private getScreenToWorld(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.ndc.set(x, y);
    this.raycaster.setFromCamera(this.ndc, this.camera);
    const dir = this.raycaster.ray.direction;
    const origin = this.raycaster.ray.origin;
    if (Math.abs(dir.z) < 1e-6) {
      return { x: 0, y: 0 };
    }
    const t = -origin.z / dir.z;
    const wx = origin.x + dir.x * t;
    const wy = origin.y + dir.y * t;
    return { x: wx, y: wy };
  }

  private onPointerDown = (e: PointerEvent): void => {
    if (e.button !== 0) return;
    const shiftHeld = e.shiftKey;
    this.isDragging = true;
    this.dragStartX = e.clientX;
    this.dragStartY = e.clientY;
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;

    if (shiftHeld) {
      this.isSelecting = true;
      const world = this.getScreenToWorld(e.clientX, e.clientY);
      this.selectionStartWorld = world;
      this.selectionEndWorld = world;
    } else if (this.selectionActive) {
      this.resetSelection();
    }
    this.canvas.setPointerCapture(e.pointerId);
  };

  private onPointerMove = (e: PointerEvent): void => {
    const world = this.getScreenToWorld(e.clientX, e.clientY);
    this.mouseWorldX = world.x;
    this.mouseWorldY = world.y;

    if (!this.isDragging) return;

    if (this.isSelecting) {
      this.selectionEndWorld = world;
    } else {
      const dx = e.clientX - this.lastMouseX;
      const dy = e.clientY - this.lastMouseY;
      this.state.cameraPhi -= dx * ROTATE_SPEED;
      this.state.cameraTheta = Math.max(
        0.08 * Math.PI,
        Math.min(0.45 * Math.PI, this.state.cameraTheta + dy * ROTATE_SPEED)
      );
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
      this.updateCameraFromState();
    }
  };

  private onPointerUp = (e: PointerEvent): void => {
    if (!this.isDragging) return;
    const dx = e.clientX - this.dragStartX;
    const dy = e.clientY - this.dragStartY;

    if (this.isSelecting) {
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 8) {
        this.commitSelection();
      }
      this.isSelecting = false;
    }
    this.isDragging = false;
    try { this.canvas.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const factor = Math.exp(-e.deltaY * ZOOM_SPEED);
    this.state.cameraDistance = Math.max(
      ZOOM_MIN,
      Math.min(ZOOM_MAX, this.state.cameraDistance * factor)
    );
    this.updateCameraFromState();
  };

  private commitSelection(): void {
    let x1 = this.selectionStartWorld.x;
    let x2 = this.selectionEndWorld.x;
    let y1 = this.selectionStartWorld.y;
    let y2 = this.selectionEndWorld.y;
    if (x1 > x2) [x1, x2] = [x2, x1];
    if (y1 > y2) [y1, y2] = [y2, y1];
    x1 = Math.max(-BOX_X_LIMIT, x1);
    x2 = Math.min(BOX_X_LIMIT, x2);
    y1 = Math.max(-BOX_Y_LIMIT, y1);
    y2 = Math.min(BOX_Y_LIMIT, y2);
    if (x2 - x1 < 0.3 || y2 - y1 < 0.3) return;
    this.selectionBox = {
      active: true,
      xMin: x1, xMax: x2, yMin: y1, yMax: y2,
      zoomProgress: 0
    };
    this.selectionActive = true;
    this.selectionAnimProgress = 0;
    this.haloTimer = 0.3;
    this.callbacks.onSelectionChanged(this.selectionBox);
  }

  public resetSelection(): void {
    this.selectionBox.active = false;
    this.selectionActive = false;
    this.selectionAnimProgress = 0;
    this.callbacks.onResetSelection();
  }

  private updateCameraFromState(): void {
    const r = this.state.cameraDistance;
    const theta = this.state.cameraTheta;
    const phi = this.state.cameraPhi;
    const sinT = Math.sin(theta);
    const cx = r * sinT * Math.cos(phi);
    const cy = r * Math.cos(theta);
    const cz = r * sinT * Math.sin(phi);
    this.camera.position.set(cx, cy, cz);
    this.camera.lookAt(0, 0, 0);
    this.camera.updateMatrixWorld(true);
  }

  public update(deltaTime: number): void {
    if (this.selectionActive && this.selectionBox.active) {
      this.selectionAnimProgress = Math.min(
        SELECTION_ANIM_DURATION,
        this.selectionAnimProgress + deltaTime
      );
      this.selectionBox.zoomProgress = this.selectionAnimProgress;
    }
    if (this.haloTimer > 0) {
      this.haloTimer = Math.max(0, this.haloTimer - deltaTime);
    }
  }

  public getCameraDistance(): number {
    return this.state.cameraDistance;
  }

  public isCurrentlySelecting(): boolean {
    return this.isSelecting;
  }

  public getLiveSelection(): { xMin: number; xMax: number; yMin: number; yMax: number } | null {
    if (!this.isSelecting) return null;
    let x1 = this.selectionStartWorld.x;
    let x2 = this.selectionEndWorld.x;
    let y1 = this.selectionStartWorld.y;
    let y2 = this.selectionEndWorld.y;
    if (x1 > x2) [x1, x2] = [x2, x1];
    if (y1 > y2) [y1, y2] = [y2, y1];
    return { xMin: x1, xMax: x2, yMin: y1, yMax: y2 };
  }
}
