export interface Point {
  x: number;
  y: number;
  pressure: number;
  timestamp: number;
}

export interface BrushStroke {
  points: Point[];
  brushSize: number;
  inkDensity: number;
  color: string;
  completed: boolean;
  fadeProgress: number;
}

export class BrushEngine {
  private lastPoint: Point | null = null;
  private currentStroke: BrushStroke | null = null;
  private brushSize: number = 8;
  private inkDensity: number = 0.8;
  private color: string = '#1A1A1A';

  setBrushSize(size: number) {
    this.brushSize = size;
  }

  setInkDensity(density: number) {
    this.inkDensity = density;
  }

  setColor(color: string) {
    this.color = color;
  }

  startStroke(x: number, y: number): BrushStroke {
    this.lastPoint = { x, y, pressure: 1, timestamp: performance.now() };
    this.currentStroke = {
      points: [{ ...this.lastPoint }],
      brushSize: this.brushSize,
      inkDensity: this.inkDensity,
      color: this.color,
      completed: false,
      fadeProgress: 1
    };
    return this.currentStroke;
  }

  continueStroke(x: number, y: number): { stroke: BrushStroke; renderOps: RenderOp[] } | null {
    if (!this.lastPoint || !this.currentStroke) return null;

    const now = performance.now();
    const dx = x - this.lastPoint.x;
    const dy = y - this.lastPoint.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const dt = Math.max(now - this.lastPoint.timestamp, 1);
    const speed = distance / dt;

    const normalizedSpeed = Math.min(speed / 3, 1);
    const pressure = Math.max(0.3, 1 - normalizedSpeed * 0.6);

    const newPoint: Point = {
      x,
      y,
      pressure,
      timestamp: now
    };

    this.currentStroke.points.push(newPoint);

    const renderOps = this.generateRenderOps(this.lastPoint, newPoint);
    this.lastPoint = newPoint;

    return { stroke: this.currentStroke, renderOps };
  }

  endStroke(): BrushStroke | null {
    if (this.currentStroke) {
      this.currentStroke.completed = true;
    }
    const stroke = this.currentStroke;
    this.lastPoint = null;
    this.currentStroke = null;
    return stroke;
  }

  private generateRenderOps(from: Point, to: Point): RenderOp[] {
    const ops: RenderOp[] = [];
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 0.5) {
      ops.push({
        type: 'dot',
        x: to.x,
        y: to.y,
        radius: this.brushSize * to.pressure * 0.5,
        alpha: this.inkDensity,
        color: this.color
      });
      return ops;
    }

    const steps = Math.ceil(distance / 2);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = from.x + dx * t;
      const y = from.y + dy * t;
      const pressure = from.pressure + (to.pressure - from.pressure) * t;
      const radius = this.brushSize * pressure * 0.5;

      ops.push({
        type: 'circle',
        x,
        y,
        radius,
        alpha: this.inkDensity,
        color: this.color
      });

      if (pressure > 0.6 && Math.random() < 0.3) {
        const angle = Math.atan2(dy, dx) + (Math.random() - 0.5) * 0.5;
        const offset = this.brushSize * (0.3 + Math.random() * 0.4);
        ops.push({
          type: 'feibai',
          x: x + Math.cos(angle) * offset,
          y: y + Math.sin(angle) * offset,
          radius: radius * (0.2 + Math.random() * 0.3),
          alpha: this.inkDensity * (0.3 + Math.random() * 0.3),
          color: this.color
        });
      }
    }

    return ops;
  }

  renderStroke(ctx: CanvasRenderingContext2D, stroke: BrushStroke, alpha: number = 1) {
    stroke.points.forEach((point, idx) => {
      if (idx === 0) {
        const radius = stroke.brushSize * point.pressure * 0.5;
        ctx.beginPath();
        ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = this.hexToRgba(stroke.color, stroke.inkDensity * alpha);
        ctx.fill();
        return;
      }

      const prev = stroke.points[idx - 1];
      const dx = point.x - prev.x;
      const dy = point.y - prev.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const steps = Math.ceil(dist / 2);

      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = prev.x + dx * t;
        const y = prev.y + dy * t;
        const pressure = prev.pressure + (point.pressure - prev.pressure) * t;
        const radius = stroke.brushSize * pressure * 0.5;

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = this.hexToRgba(stroke.color, stroke.inkDensity * alpha);
        ctx.fill();
      }
    });
  }

  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}

export interface RenderOp {
  type: 'circle' | 'dot' | 'feibai';
  x: number;
  y: number;
  radius: number;
  alpha: number;
  color: string;
}
