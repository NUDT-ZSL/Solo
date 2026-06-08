interface BrushPoint {
  x: number;
  y: number;
  timestamp: number;
}

interface BrushStroke {
  points: BrushPoint[];
  startTime: number;
  endTime: number;
  isActive: boolean;
}

export class BrushManager {
  private canvas: HTMLCanvasElement;

  private strokes: BrushStroke[] = [];
  private currentStroke: BrushStroke | null = null;
  private isDrawing: boolean = false;

  public brushSize: number = 30;
  public brushOpacity: number = 0.6;

  private readonly FADE_DURATION: number = 2000;
  private readonly STROKE_COLOR: string = '#F5DEB3';
  private readonly GLOW_COLOR: string = '#E8D5B7';
  private readonly GLOW_BLUR: number = 10;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.bindEvents();
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('mouseleave', this.handleMouseUp.bind(this));

    this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
  }

  private getCanvasPosition(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }

  private handleMouseDown(e: MouseEvent): void {
    if (e.button !== 0) return;
    this.startStroke(this.getCanvasPosition(e.clientX, e.clientY));
  }

  private handleMouseMove(e: MouseEvent): void {
    if (!this.isDrawing || !this.currentStroke) return;
    this.addStrokePoint(this.getCanvasPosition(e.clientX, e.clientY));
  }

  private handleMouseUp(): void {
    this.endStroke();
  }

  private handleTouchStart(e: TouchEvent): void {
    e.preventDefault();
    const touch = e.touches[0];
    this.startStroke(this.getCanvasPosition(touch.clientX, touch.clientY));
  }

  private handleTouchMove(e: TouchEvent): void {
    e.preventDefault();
    if (!this.isDrawing || !this.currentStroke) return;
    const touch = e.touches[0];
    this.addStrokePoint(this.getCanvasPosition(touch.clientX, touch.clientY));
  }

  private handleTouchEnd(): void {
    this.endStroke();
  }

  private startStroke(pos: { x: number; y: number }): void {
    this.isDrawing = true;
    const now = performance.now();
    this.currentStroke = {
      points: [{ x: pos.x, y: pos.y, timestamp: now }],
      startTime: now,
      endTime: now,
      isActive: true
    };
    this.strokes.push(this.currentStroke);
  }

  private addStrokePoint(pos: { x: number; y: number }): void {
    if (!this.currentStroke) return;
    this.currentStroke.points.push({
      x: pos.x,
      y: pos.y,
      timestamp: performance.now()
    });
  }

  private endStroke(): void {
    if (!this.isDrawing || !this.currentStroke) return;
    this.isDrawing = false;
    this.currentStroke.isActive = false;
    this.currentStroke.endTime = performance.now();
    this.currentStroke = null;
  }

  public setBrushSize(size: number): void {
    this.brushSize = size;
  }

  public setBrushOpacity(opacity: number): void {
    this.brushOpacity = opacity;
  }

  public getBrushSize(): number {
    return this.brushSize;
  }

  private getStrokeOpacity(stroke: BrushStroke, now: number): number {
    if (stroke.isActive) {
      return this.brushOpacity;
    }
    const elapsed = now - stroke.endTime;
    if (elapsed >= this.FADE_DURATION) {
      return 0;
    }
    return this.brushOpacity * (1 - elapsed / this.FADE_DURATION);
  }

  private drawStrokePoint(
    ctx: CanvasRenderingContext2D,
    point: BrushPoint,
    prevPoint: BrushPoint | null,
    opacity: number
  ): void {
    const radius = this.brushSize / 2;

    if (prevPoint) {
      const dx = point.x - prevPoint.x;
      const dy = point.y - prevPoint.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const steps = Math.max(1, Math.ceil(distance / (radius * 0.3)));

      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const ix = prevPoint.x + dx * t;
        const iy = prevPoint.y + dy * t;
        this.drawRadialBrush(ctx, ix, iy, radius, opacity);
      }
    } else {
      this.drawRadialBrush(ctx, point.x, point.y, radius, opacity);
    }
  }

  private drawRadialBrush(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    opacity: number
  ): void {
    ctx.save();

    const glowRadius = radius + this.GLOW_BLUR;
    const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, glowRadius);
    glowGradient.addColorStop(0, this.hexToRgba(this.GLOW_COLOR, opacity * 0.3));
    glowGradient.addColorStop(0.6, this.hexToRgba(this.GLOW_COLOR, opacity * 0.1));
    glowGradient.addColorStop(1, this.hexToRgba(this.GLOW_COLOR, 0));

    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(x, y, glowRadius, 0, Math.PI * 2);
    ctx.fill();

    const mainGradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    mainGradient.addColorStop(0, this.hexToRgba(this.STROKE_COLOR, opacity * 0.8));
    mainGradient.addColorStop(0.5, this.hexToRgba(this.STROKE_COLOR, opacity * 0.4));
    mainGradient.addColorStop(1, this.hexToRgba(this.STROKE_COLOR, 0));

    ctx.fillStyle = mainGradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  public render(ctx: CanvasRenderingContext2D): void {
    const now = performance.now();
    const activeStrokes: BrushStroke[] = [];

    for (const stroke of this.strokes) {
      const opacity = this.getStrokeOpacity(stroke, now);
      if (opacity <= 0 && !stroke.isActive) {
        continue;
      }
      activeStrokes.push(stroke);

      let prevPoint: BrushPoint | null = null;
      for (const point of stroke.points) {
        this.drawStrokePoint(ctx, point, prevPoint, opacity);
        prevPoint = point;
      }
    }

    this.strokes = activeStrokes;
  }

  public clear(): void {
    this.strokes = [];
    this.currentStroke = null;
    this.isDrawing = false;
  }
}
