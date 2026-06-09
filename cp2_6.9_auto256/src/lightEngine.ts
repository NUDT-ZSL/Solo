import { CONFIG, LightPoint } from './config';

export class LightEngine {
  private points: LightPoint[] = [];
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
  }

  public addPoint(x: number, y: number, color: string): void {
    if (this.points.length >= CONFIG.MAX_STROKE_POINTS) {
      this.points.shift();
    }

    const offsetX = (Math.random() - 0.5) * 2 * CONFIG.RANDOM_OFFSET;
    const offsetY = (Math.random() - 0.5) * 2 * CONFIG.RANDOM_OFFSET;

    this.points.push({
      x: x + offsetX,
      y: y + offsetY,
      color,
      alpha: 1.0,
      width: CONFIG.INITIAL_STROKE_WIDTH
    });
  }

  public update(): void {
    for (let i = this.points.length - 1; i >= 0; i--) {
      this.points[i].alpha -= CONFIG.DECAY_RATE;
      if (this.points[i].alpha <= 0) {
        this.points.splice(i, 1);
      }
    }
  }

  public render(): void {
    this.ctx.fillStyle = CONFIG.BACKGROUND_COLOR;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    for (let i = 1; i < this.points.length; i++) {
      const prev = this.points[i - 1];
      const curr = this.points[i];

      if (prev.alpha <= 0 || curr.alpha <= 0) continue;

      const avgAlpha = (prev.alpha + curr.alpha) / 2;

      this.ctx.beginPath();
      this.ctx.moveTo(prev.x, prev.y);
      this.ctx.lineTo(curr.x, curr.y);
      this.ctx.strokeStyle = this.hexToRgba(curr.color, avgAlpha);
      this.ctx.lineWidth = CONFIG.LINE_WIDTH;
      this.ctx.shadowColor = curr.color;
      this.ctx.shadowBlur = CONFIG.SHADOW_BLUR;
      this.ctx.stroke();
    }

    this.ctx.shadowBlur = 0;
  }

  public clear(): void {
    this.points.length = 0;
  }

  public getPointCount(): number {
    return this.points.length;
  }

  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}
