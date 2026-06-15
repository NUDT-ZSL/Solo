import { Grid } from './grid';
import { Config, INFLUENCE_RADIUS } from './utils';

export interface InteractionState {
  dragging: boolean;
  mouseX: number;
  mouseY: number;
  prevMouseX: number;
  prevMouseY: number;
  dragStartX: number;
  dragStartY: number;
}

export class Interaction {
  private state: InteractionState = {
    dragging: false,
    mouseX: 0,
    mouseY: 0,
    prevMouseX: 0,
    prevMouseY: 0,
    dragStartX: 0,
    dragStartY: 0,
  };

  private grid: Grid;
  private config: Config;
  private canvas: HTMLCanvasElement;
  private onClickCallback: ((x: number, y: number) => void) | null = null;

  constructor(canvas: HTMLCanvasElement, grid: Grid, config: Config) {
    this.canvas = canvas;
    this.grid = grid;
    this.config = config;
    this.bindEvents();
  }

  setConfig(config: Config): void {
    this.config = config;
  }

  setGrid(grid: Grid): void {
    this.grid = grid;
  }

  setOnClick(cb: (x: number, y: number) => void): void {
    this.onClickCallback = cb;
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.canvas.addEventListener('mouseleave', this.onMouseUp.bind(this));

    this.canvas.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
    this.canvas.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
    this.canvas.addEventListener('touchend', this.onTouchEnd.bind(this));
  }

  private getCanvasPos(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }

  private onMouseDown(e: MouseEvent): void {
    const pos = this.getCanvasPos(e.clientX, e.clientY);
    this.state.dragging = true;
    this.state.dragStartX = pos.x;
    this.state.dragStartY = pos.y;
    this.state.mouseX = pos.x;
    this.state.mouseY = pos.y;
    this.state.prevMouseX = pos.x;
    this.state.prevMouseY = pos.y;
  }

  private onMouseMove(e: MouseEvent): void {
    const pos = this.getCanvasPos(e.clientX, e.clientY);
    this.state.prevMouseX = this.state.mouseX;
    this.state.prevMouseY = this.state.mouseY;
    this.state.mouseX = pos.x;
    this.state.mouseY = pos.y;

    if (this.state.dragging) {
      const dx = this.state.mouseX - this.state.prevMouseX;
      const dy = this.state.mouseY - this.state.prevMouseY;
      this.grid.applyForce(
        dx * this.config.distortionStrength * 0.8,
        dy * this.config.distortionStrength * 0.8,
        this.state.mouseX,
        this.state.mouseY,
        INFLUENCE_RADIUS,
        this.config.distortionStrength,
      );
      this.grid.spawnDragParticles(this.state.mouseX, this.state.mouseY, dx, dy);
    }
  }

  private onMouseUp(_e: MouseEvent): void {
    if (!this.state.dragging) return;
    this.state.dragging = false;

    const dx = this.state.mouseX - this.state.dragStartX;
    const dy = this.state.mouseY - this.state.dragStartY;
    const moved = Math.sqrt(dx * dx + dy * dy);

    if (moved < 5) {
      if (this.onClickCallback) {
        this.onClickCallback(this.state.mouseX, this.state.mouseY);
      }
    }
  }

  private onTouchStart(e: TouchEvent): void {
    e.preventDefault();
    const touch = e.touches[0];
    const pos = this.getCanvasPos(touch.clientX, touch.clientY);
    this.state.dragging = true;
    this.state.dragStartX = pos.x;
    this.state.dragStartY = pos.y;
    this.state.mouseX = pos.x;
    this.state.mouseY = pos.y;
    this.state.prevMouseX = pos.x;
    this.state.prevMouseY = pos.y;
  }

  private onTouchMove(e: TouchEvent): void {
    e.preventDefault();
    const touch = e.touches[0];
    const pos = this.getCanvasPos(touch.clientX, touch.clientY);
    this.state.prevMouseX = this.state.mouseX;
    this.state.prevMouseY = this.state.mouseY;
    this.state.mouseX = pos.x;
    this.state.mouseY = pos.y;

    if (this.state.dragging) {
      const dx = this.state.mouseX - this.state.prevMouseX;
      const dy = this.state.mouseY - this.state.prevMouseY;
      this.grid.applyForce(
        dx * this.config.distortionStrength * 0.8,
        dy * this.config.distortionStrength * 0.8,
        this.state.mouseX,
        this.state.mouseY,
        INFLUENCE_RADIUS,
        this.config.distortionStrength,
      );
      this.grid.spawnDragParticles(this.state.mouseX, this.state.mouseY, dx, dy);
    }
  }

  private onTouchEnd(_e: TouchEvent): void {
    if (!this.state.dragging) return;
    this.state.dragging = false;

    const dx = this.state.mouseX - this.state.dragStartX;
    const dy = this.state.mouseY - this.state.dragStartY;
    const moved = Math.sqrt(dx * dx + dy * dy);

    if (moved < 10) {
      if (this.onClickCallback) {
        this.onClickCallback(this.state.mouseX, this.state.mouseY);
      }
    }
  }
}
