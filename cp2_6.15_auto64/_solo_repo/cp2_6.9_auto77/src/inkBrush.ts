export interface BrushParams {
  inkAmount: number;
  waterAmount: number;
  pressure: number;
}

interface Point {
  x: number;
  y: number;
  time: number;
  width: number;
}

export class InkBrush {
  private ctx: CanvasRenderingContext2D;
  private params: BrushParams;
  private lastPoint: Point | null = null;
  private isDrawing = false;

  constructor(ctx: CanvasRenderingContext2D, params: BrushParams) {
    this.ctx = ctx;
    this.params = params;
  }

  public updateParams(params: BrushParams): void {
    this.params = params;
  }

  public start(x: number, y: number): void {
    this.isDrawing = true;
    this.lastPoint = {
      x,
      y,
      time: performance.now(),
      width: this.calculateWidth(0)
    };
    this.drawDot(x, y, this.lastPoint.width);
  }

  public move(x: number, y: number): void {
    if (!this.isDrawing || !this.lastPoint) return;

    const now = performance.now();
    const dt = Math.max(now - this.lastPoint.time, 1);
    const dx = x - this.lastPoint.x;
    const dy = y - this.lastPoint.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const speed = distance / dt;

    const width = this.calculateWidth(speed);
    const currentPoint: Point = { x, y, time: now, width };

    this.drawStroke(this.lastPoint, currentPoint);

    this.lastPoint = currentPoint;
  }

  public end(): void {
    this.isDrawing = false;
    this.lastPoint = null;
  }

  private calculateWidth(speed: number): number {
    const minWidth = 2;
    const maxWidth = Math.max(8, this.params.pressure);
    const normalizedSpeed = Math.min(speed / 2, 1);
    return maxWidth - (maxWidth - minWidth) * normalizedSpeed;
  }

  private drawStroke(from: Point, to: Point): void {
    const distance = Math.sqrt(
      Math.pow(to.x - from.x, 2) + Math.pow(to.y - from.y, 2)
    );
    const steps = Math.max(1, Math.floor(distance / 2));

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = from.x + (to.x - from.x) * t;
      const y = from.y + (to.y - from.y) * t;
      const width = from.width + (to.width - from.width) * t;
      this.drawDot(x, y, width);
    }
  }

  private drawDot(x: number, y: number, width: number): void {
    const waterRadius = this.params.waterAmount;
    const inkAlpha = this.params.inkAmount;

    this.ctx.save();

    if (waterRadius > 0) {
      const gradient = this.ctx.createRadialGradient(
        x, y, 0,
        x, y, width + waterRadius
      );
      gradient.addColorStop(0, `rgba(26, 26, 26, ${inkAlpha})`);
      gradient.addColorStop(0.3, `rgba(26, 26, 26, ${inkAlpha * 0.6})`);
      gradient.addColorStop(0.6, `rgba(26, 26, 26, ${inkAlpha * 0.2})`);
      gradient.addColorStop(1, 'rgba(26, 26, 26, 0)');

      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(x, y, width + waterRadius, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.ctx.globalCompositeOperation = 'source-over';

    const coreRadius = width * 0.5;
    const coreGradient = this.ctx.createRadialGradient(
      x, y, 0,
      x, y, coreRadius
    );
    coreGradient.addColorStop(0, `rgba(26, 26, 26, ${inkAlpha})`);
    coreGradient.addColorStop(1, `rgba(60, 60, 60, ${inkAlpha * 0.7})`);

    this.ctx.fillStyle = coreGradient;
    this.ctx.beginPath();
    this.ctx.arc(x, y, coreRadius, 0, Math.PI * 2);
    this.ctx.fill();

    this.drawFuzzyEdge(x, y, width);

    this.ctx.restore();
  }

  private drawFuzzyEdge(x: number, y: number, width: number): void {
    const particleCount = Math.floor(width * 1.5);
    const maxRadius = width + this.params.waterAmount * 0.5;

    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = width * (0.5 + Math.random() * 0.8);
      if (distance > maxRadius) continue;

      const px = x + Math.cos(angle) * distance;
      const py = y + Math.sin(angle) * distance;
      const size = Math.random() * 1.5 + 0.5;
      const alpha = this.params.inkAmount * (0.15 + Math.random() * 0.25);

      this.ctx.fillStyle = `rgba(26, 26, 26, ${alpha})`;
      this.ctx.beginPath();
      this.ctx.arc(px, py, size, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }
}
