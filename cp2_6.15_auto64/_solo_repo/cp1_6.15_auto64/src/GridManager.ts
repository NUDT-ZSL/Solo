const GRID_COLOR = '#E8F5E9';
const GRID_LINE_COLOR = '#C8E6C9';
const GRID_SPACING = 20;
const BASE_WIDTH = 600;
const BASE_HEIGHT = 400;

export class GridManager {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private scaleX = 1;
  private scaleY = 1;
  private fadeAlpha = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get 2D context');
    this.ctx = ctx;
    this.handleResize();
    window.addEventListener('resize', () => this.handleResize());
  }

  handleResize(): void {
    const container = this.canvas.parentElement;
    if (!container) return;

    const maxW = window.innerWidth * 0.9;
    const maxH = window.innerHeight * 0.85;
    const scale = Math.min(maxW / BASE_WIDTH, maxH / BASE_HEIGHT, 1.5);

    this.scaleX = scale;
    this.scaleY = scale;
    this.canvas.width = Math.round(BASE_WIDTH * scale);
    this.canvas.height = Math.round(BASE_HEIGHT * scale);
  }

  getScale(): { x: number; y: number } {
    return { x: this.scaleX, y: this.scaleY };
  }

  toCanvasCoord(logicalX: number, logicalY: number): { x: number; y: number } {
    return {
      x: logicalX * this.scaleX,
      y: logicalY * this.scaleY,
    };
  }

  toLogicalCoord(canvasX: number, canvasY: number): { x: number; y: number } {
    return {
      x: canvasX / this.scaleX,
      y: canvasY / this.scaleY,
    };
  }

  triggerFadeIn(): void {
    this.fadeAlpha = 0;
  }

  drawBackground(dt: number): void {
    if (this.fadeAlpha < 1) {
      this.fadeAlpha = Math.min(1, this.fadeAlpha + dt * 2);
    }

    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.globalAlpha = this.fadeAlpha;

    ctx.fillStyle = GRID_COLOR;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = GRID_LINE_COLOR;
    ctx.lineWidth = 1;
    const sp = GRID_SPACING * this.scaleX;

    for (let x = sp; x < w; x += sp) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    for (let y = GRID_SPACING * this.scaleY; y < h; y += GRID_SPACING * this.scaleY) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
  }
}
