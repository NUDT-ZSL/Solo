import { RenderCell, CellColor } from './grid';

const BG_COLOR = '#1a1a2e';
const LINE_COLOR = 'rgba(255, 255, 255, 0.3)';

export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private dpr: number;
  private width: number = 0;
  private height: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D rendering context');
    }
    this.ctx = ctx;
    this.dpr = window.devicePixelRatio || 1;
  }

  public resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.canvas.width = Math.round(width * this.dpr);
    this.canvas.height = Math.round(height * this.dpr);
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  private clear(): void {
    this.ctx.fillStyle = BG_COLOR;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  private rgbaString(c: CellColor): string {
    return `rgba(${c.r}, ${c.g}, ${c.b}, ${c.a})`;
  }

  public render(cells: RenderCell[]): void {
    this.clear();
    const ctx = this.ctx;
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      const pts = cell.points;
      if (pts.length < 3) continue;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let p = 1; p < pts.length; p++) {
        ctx.lineTo(pts[p].x, pts[p].y);
      }
      ctx.closePath();
      ctx.fillStyle = this.rgbaString(cell.color);
      ctx.fill();
    }
    ctx.strokeStyle = LINE_COLOR;
    ctx.lineWidth = 1;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      const pts = cell.points;
      if (pts.length < 3) continue;
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let p = 1; p < pts.length; p++) {
        ctx.lineTo(pts[p].x, pts[p].y);
      }
      ctx.closePath();
    }
    ctx.stroke();
  }

  public exportPNG(): void {
    const link = document.createElement('a');
    const date = new Date();
    const ts =
      date.getFullYear() +
      String(date.getMonth() + 1).padStart(2, '0') +
      String(date.getDate()).padStart(2, '0') +
      '-' +
      String(date.getHours()).padStart(2, '0') +
      String(date.getMinutes()).padStart(2, '0') +
      String(date.getSeconds()).padStart(2, '0');
    link.download = `fluid-geometry-${ts}.png`;
    link.href = this.canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  public getWidth(): number {
    return this.width;
  }

  public getHeight(): number {
    return this.height;
  }
}
