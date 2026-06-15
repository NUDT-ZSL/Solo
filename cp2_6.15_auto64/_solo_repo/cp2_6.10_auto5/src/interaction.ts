import type { GridManager } from './grid';
import type { InteractionData } from './types';

export class InteractionHandler {
  private canvas: HTMLCanvasElement;
  private grid: GridManager;
  private lastX: number = 0;
  private lastY: number = 0;
  private lastTime: number = 0;
  private isMouseDown: boolean = false;
  private downTime: number = 0;
  private velocityX: number = 0;
  private velocityY: number = 0;
  private speed: number = 0;
  private moveTimer: number | null = null;
  private moveCount: number = 0;
  private readonly MOVE_THROTTLE_MS = 33;

  constructor(canvas: HTMLCanvasElement, grid: GridManager) {
    this.canvas = canvas;
    this.grid = grid;
    this.bindEvents();
  }

  private bindEvents(): void {
    const canvas = this.canvas;

    canvas.addEventListener('mousedown', this.onMouseDown);
    canvas.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('mouseleave', this.onMouseUp);

    canvas.addEventListener('touchstart', this.onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', this.onTouchMove, { passive: false });
    window.addEventListener('touchend', this.onTouchEnd);
    window.addEventListener('touchcancel', this.onTouchEnd);

    window.addEventListener('resize', this.onResize);
  }

  destroy(): void {
    const canvas = this.canvas;

    canvas.removeEventListener('mousedown', this.onMouseDown);
    canvas.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('mouseleave', this.onMouseUp);

    canvas.removeEventListener('touchstart', this.onTouchStart);
    canvas.removeEventListener('touchmove', this.onTouchMove);
    window.removeEventListener('touchend', this.onTouchEnd);
    window.removeEventListener('touchcancel', this.onTouchEnd);

    window.removeEventListener('resize', this.onResize);

    if (this.moveTimer !== null) {
      clearTimeout(this.moveTimer);
      this.moveTimer = null;
    }
  }

  private onResize = (): void => {
    this.grid.resize();
  };

  private onMouseDown = (e: MouseEvent): void => {
    e.preventDefault();
    const { x, y } = this.getCanvasCoords(e.clientX, e.clientY);
    this.handleDown(x, y);
  };

  private onMouseMove = (e: MouseEvent): void => {
    const { x, y } = this.getCanvasCoords(e.clientX, e.clientY);
    this.handleMove(x, y);
  };

  private onMouseUp = (e: MouseEvent): void => {
    if (!this.isMouseDown) return;
    const { x, y } = this.getCanvasCoords(e.clientX, e.clientY);
    this.handleUp(x, y);
  };

  private onTouchStart = (e: TouchEvent): void => {
    e.preventDefault();
    if (e.touches.length === 0) return;
    const touch = e.touches[0];
    const { x, y } = this.getCanvasCoords(touch.clientX, touch.clientY);
    this.handleDown(x, y);
  };

  private onTouchMove = (e: TouchEvent): void => {
    e.preventDefault();
    if (e.touches.length === 0) return;
    const touch = e.touches[0];
    const { x, y } = this.getCanvasCoords(touch.clientX, touch.clientY);
    this.handleMove(x, y);
  };

  private onTouchEnd = (_e: TouchEvent): void => {
    if (!this.isMouseDown) return;
    this.handleUp(this.lastX, this.lastY);
  };

  private getCanvasCoords(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }

  private handleDown(x: number, y: number): void {
    this.isMouseDown = true;
    this.downTime = performance.now();
    this.lastX = x;
    this.lastY = y;
    this.lastTime = this.downTime;
    this.velocityX = 0;
    this.velocityY = 0;
    this.speed = 0;

    const data: InteractionData = {
      type: 'down',
      x,
      y,
      velocityX: 0,
      velocityY: 0,
      speed: 0,
      timestamp: this.downTime,
    };
    this.grid.handleInteraction(data);
  }

  private handleMove(x: number, y: number): void {
    const now = performance.now();
    const dt = Math.max(now - this.lastTime, 1);

    const rawVelX = (x - this.lastX) / dt * 16.67;
    const rawVelY = (y - this.lastY) / dt * 16.67;
    const rawSpeed = Math.sqrt(rawVelX * rawVelX + rawVelY * rawVelY);

    const smoothing = 0.6;
    this.velocityX = this.velocityX * (1 - smoothing) + rawVelX * smoothing;
    this.velocityY = this.velocityY * (1 - smoothing) + rawVelY * smoothing;
    this.speed = this.speed * (1 - smoothing) + rawSpeed * smoothing;

    this.lastX = x;
    this.lastY = y;
    this.lastTime = now;

    this.moveCount++;
    if (this.moveTimer !== null) return;

    this.moveTimer = window.setTimeout(() => {
      this.moveTimer = null;
      const data: InteractionData = {
        type: 'move',
        x: this.lastX,
        y: this.lastY,
        velocityX: this.velocityX,
        velocityY: this.velocityY,
        speed: this.speed,
        timestamp: performance.now(),
      };
      this.grid.handleInteraction(data);
    }, this.MOVE_THROTTLE_MS);
  }

  private handleUp(x: number, y: number): void {
    if (!this.isMouseDown) return;

    if (this.moveTimer !== null) {
      clearTimeout(this.moveTimer);
      this.moveTimer = null;
    }

    this.isMouseDown = false;
    const now = performance.now();

    const releaseX = (x !== undefined && x !== 0) ? x : this.lastX;
    const releaseY = (y !== undefined && y !== 0) ? y : this.lastY;

    const data: InteractionData = {
      type: 'up',
      x: releaseX,
      y: releaseY,
      velocityX: this.velocityX,
      velocityY: this.velocityY,
      speed: this.speed,
      timestamp: now,
    };
    this.grid.handleInteraction(data);

    setTimeout(() => {
      this.velocityX = 0;
      this.velocityY = 0;
      this.speed = 0;
    }, 100);
  }
}
