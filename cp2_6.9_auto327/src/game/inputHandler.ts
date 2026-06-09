import type { GameEngine } from './gameEngine.js';
import type { Renderer } from './renderer.js';

export class InputHandler {
  private canvas: HTMLCanvasElement;
  private engine: GameEngine;
  private renderer: Renderer;
  private isDragging: boolean = false;
  private pointerActive: boolean = false;

  constructor(canvas: HTMLCanvasElement, engine: GameEngine, renderer: Renderer) {
    this.canvas = canvas;
    this.engine = engine;
    this.renderer = renderer;
    this.bind();
  }

  reset(): void {
    this.isDragging = false;
    this.pointerActive = false;
    this.canvas.style.cursor = 'default';
  }

  private getCoords(ev: MouseEvent | Touch): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const cfg = this.engine.getConfig();
    const x = ((ev.clientX - rect.left) / rect.width) * cfg.width;
    const y = ((ev.clientY - rect.top) / rect.height) * cfg.height;
    return { x, y };
  }

  private bind(): void {
    this.canvas.addEventListener('mousedown', this.onMouseDown);
    this.canvas.addEventListener('mousemove', this.onMouseMove);
    this.canvas.addEventListener('mouseup', this.onMouseUp);
    this.canvas.addEventListener('mouseleave', this.onMouseUp);

    this.canvas.addEventListener('touchstart', this.onTouchStart, { passive: false });
    this.canvas.addEventListener('touchmove', this.onTouchMove, { passive: false });
    this.canvas.addEventListener('touchend', this.onTouchEnd, { passive: false });
    this.canvas.addEventListener('touchcancel', this.onTouchEnd, { passive: false });
  }

  private onMouseDown = (ev: MouseEvent): void => {
    if (ev.button !== 0) return;
    const { x, y } = this.getCoords(ev);
    this.tryStart(x, y);
  };

  private onMouseMove = (ev: MouseEvent): void => {
    const { x, y } = this.getCoords(ev);
    this.hoverCursor(x, y);
    if (!this.isDragging) return;
    this.engine.extendRift(x, y);
  };

  private onMouseUp = (): void => {
    if (this.isDragging) {
      this.engine.endRift();
      this.isDragging = false;
      this.canvas.style.cursor = 'default';
    }
  };

  private onTouchStart = (ev: TouchEvent): void => {
    ev.preventDefault();
    if (ev.touches.length === 0) return;
    const touch = ev.touches[0];
    const { x, y } = this.getCoords(touch);
    this.tryStart(x, y);
    this.pointerActive = true;
  };

  private onTouchMove = (ev: TouchEvent): void => {
    ev.preventDefault();
    if (!this.isDragging || ev.touches.length === 0) return;
    const touch = ev.touches[0];
    const { x, y } = this.getCoords(touch);
    this.engine.extendRift(x, y);
  };

  private onTouchEnd = (ev: TouchEvent): void => {
    ev.preventDefault();
    if (this.isDragging) {
      this.engine.endRift();
      this.isDragging = false;
    }
    this.pointerActive = false;
  };

  private hoverCursor(x: number, y: number): void {
    if (this.isDragging) return;
    const core = this.engine.getCorePosition();
    const cfg = this.engine.getConfig();
    const dx = x - core.x;
    const dy = y - core.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    this.canvas.style.cursor = dist <= cfg.coreRadius + 10 ? 'crosshair' : 'default';
  }

  private tryStart(x: number, y: number): void {
    const started = this.engine.startRift(x, y);
    if (started) {
      this.isDragging = true;
      this.canvas.style.cursor = 'crosshair';
    }
  }
}
