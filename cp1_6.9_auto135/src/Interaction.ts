import type { GameEngine } from './GameEngine';
import type { Vector2 } from './types';

export class Interaction {
  private canvas: HTMLCanvasElement;
  private engine: GameEngine;
  private isMouseDown: boolean = false;
  private activePointerId: number | null = null;
  private listeners: Array<() => void> = [];

  constructor(canvas: HTMLCanvasElement, engine: GameEngine) {
    this.canvas = canvas;
    this.engine = engine;
  }

  public bind(): void {
    this.unbind();

    const onPointerDown = (e: PointerEvent): void => {
      e.preventDefault();
      if (this.activePointerId !== null) return;
      const pos = this.getCanvasPosition(e);
      this.isMouseDown = true;
      this.activePointerId = e.pointerId;
      this.canvas.setPointerCapture?.(e.pointerId);
      this.engine.setAimStart(pos);
    };

    const onPointerMove = (e: PointerEvent): void => {
      if (this.activePointerId !== e.pointerId) return;
      const pos = this.getCanvasPosition(e);
      this.engine.setAimMove(pos);
    };

    const onPointerUp = (e: PointerEvent): void => {
      if (this.activePointerId !== e.pointerId) return;
      e.preventDefault();
      this.isMouseDown = false;
      this.activePointerId = null;
      try {
        this.canvas.releasePointerCapture?.(e.pointerId);
      } catch (_) {
        /* ignore */
      }
      this.engine.setAimEnd();
    };

    const onPointerCancel = (e: PointerEvent): void => {
      if (this.activePointerId !== e.pointerId) return;
      this.isMouseDown = false;
      this.activePointerId = null;
      this.engine.setAimEnd();
    };

    this.canvas.addEventListener('pointerdown', onPointerDown);
    this.canvas.addEventListener('pointermove', onPointerMove);
    this.canvas.addEventListener('pointerup', onPointerUp);
    this.canvas.addEventListener('pointercancel', onPointerCancel);
    this.canvas.addEventListener('pointerleave', onPointerUp);

    this.listeners.push(() => {
      this.canvas.removeEventListener('pointerdown', onPointerDown);
      this.canvas.removeEventListener('pointermove', onPointerMove);
      this.canvas.removeEventListener('pointerup', onPointerUp);
      this.canvas.removeEventListener('pointercancel', onPointerCancel);
      this.canvas.removeEventListener('pointerleave', onPointerUp);
    });
  }

  public unbind(): void {
    this.listeners.forEach((fn) => fn());
    this.listeners = [];
    this.isMouseDown = false;
    this.activePointerId = null;
  }

  private getCanvasPosition(e: PointerEvent): Vector2 {
    const rect = this.canvas.getBoundingClientRect();
    const cssW = rect.width;
    const cssH = rect.height;
    const scale = Math.min(cssW, cssH) / 720;
    const s = scale * (this.engine.config.boardRadius / 300);

    const offsetX = (e.clientX - rect.left) - cssW / 2;
    const offsetY = (e.clientY - rect.top) - cssH / 2;

    const worldX = offsetX / s + this.engine.config.boardCenter.x;
    const worldY = offsetY / s + this.engine.config.boardCenter.y;

    return { x: worldX, y: worldY };
  }
}
