import type { Stroke, Point } from './StrokeManager';

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private offscreenCanvas: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D;
  private pendingPoints: Point[] = [];
  private lastFrameTime: number = 0;
  private maxPointsPerFrame: number = 16;
  private cachedStrokesHash: string = '';

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }
    this.ctx = ctx;

    this.offscreenCanvas = document.createElement('canvas');
    const offscreenCtx = this.offscreenCanvas.getContext('2d');
    if (!offscreenCtx) {
      throw new Error('Failed to get offscreen canvas context');
    }
    this.offscreenCtx = offscreenCtx;
  }

  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.offscreenCanvas.width = width;
    this.offscreenCanvas.height = height;
    this.cachedStrokesHash = '';
  }

  getWidth(): number {
    return this.canvas.width;
  }

  getHeight(): number {
    return this.canvas.height;
  }

  clear(): void {
    this.ctx.fillStyle = '#ece8df';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.offscreenCtx.fillStyle = '#ece8df';
    this.offscreenCtx.fillRect(0, 0, this.offscreenCanvas.width, this.offscreenCanvas.height);
    this.cachedStrokesHash = '';
  }

  drawStroke(stroke: Stroke, animated: boolean = false): Promise<void> {
    return new Promise((resolve) => {
      if (animated && stroke.points.length > 1) {
        this.animateStroke(stroke, resolve);
      } else {
        this.renderStrokeToContext(this.offscreenCtx, stroke);
        this.renderStrokeToContext(this.ctx, stroke);
        resolve();
      }
    });
  }

  private animateStroke(stroke: Stroke, onComplete: () => void): void {
    const duration = 150;
    const startTime = performance.now();
    const totalPoints = stroke.points.length;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const pointsToRender = Math.ceil(totalPoints * progress);

      const partialStroke: Stroke = {
        ...stroke,
        points: stroke.points.slice(0, pointsToRender)
      };

      this.ctx.fillStyle = '#ece8df';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.drawImage(this.offscreenCanvas, 0, 0);
      this.renderStrokeToContext(this.ctx, partialStroke);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        this.renderStrokeToContext(this.offscreenCtx, stroke);
        onComplete();
      }
    };

    requestAnimationFrame(animate);
  }

  async redrawAll(strokes: Stroke[], animateLast: boolean = false): Promise<void> {
    const strokesHash = strokes.map(s => s.id).join(',');
    
    if (strokesHash !== this.cachedStrokesHash) {
      this.offscreenCtx.fillStyle = '#ece8df';
      this.offscreenCtx.fillRect(0, 0, this.offscreenCanvas.width, this.offscreenCanvas.height);
      
      for (let i = 0; i < strokes.length; i++) {
        this.renderStrokeToContext(this.offscreenCtx, strokes[i]);
      }
      this.cachedStrokesHash = strokesHash;
    }

    this.ctx.fillStyle = '#ece8df';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.drawImage(this.offscreenCanvas, 0, 0);
  }

  private renderStroke(stroke: Stroke): void {
    this.renderStrokeToContext(this.ctx, stroke);
  }

  private renderStrokeToContext(ctx: CanvasRenderingContext2D, stroke: Stroke): void {
    const { type, color, thickness, points } = stroke;
    if (points.length < 2) return;

    ctx.save();

    switch (type) {
      case 'pen':
        this.renderPen(ctx, points, color, thickness);
        break;
      case 'brush':
        this.renderBrush(ctx, points, color, thickness);
        break;
      case 'highlighter':
        this.renderHighlighter(ctx, points, color, thickness);
        break;
    }

    ctx.restore();
  }

  private renderPen(ctx: CanvasRenderingContext2D, points: Point[], color: string, thickness: number): void {
    ctx.strokeStyle = color;
    ctx.lineWidth = thickness;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length; i++) {
      const p0 = points[i - 1];
      const p1 = points[i];
      const midX = (p0.x + p1.x) / 2;
      const midY = (p0.y + p1.y) / 2;
      ctx.quadraticCurveTo(p0.x, p0.y, midX, midY);
    }

    ctx.stroke();
  }

  private renderBrush(ctx: CanvasRenderingContext2D, points: Point[], color: string, baseThickness: number): void {
    if (points.length < 2) return;

    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const totalDuration = points[points.length - 1].timestamp - points[0].timestamp;
    let maxSpeed = 0;
    const speeds: number[] = [];

    for (let i = 1; i < points.length; i++) {
      const dx = points[i].x - points[i - 1].x;
      const dy = points[i].y - points[i - 1].y;
      const dt = points[i].timestamp - points[i - 1].timestamp;
      const speed = dt > 0 ? Math.sqrt(dx * dx + dy * dy) / dt : 0;
      speeds.push(speed);
      if (speed > maxSpeed) maxSpeed = speed;
    }

    const widths: number[] = [];
    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      const progress = totalDuration > 0 
        ? (point.timestamp - points[0].timestamp) / totalDuration 
        : 0;
      
      const baseSpeedFactor = i > 0 && maxSpeed > 0 ? speeds[i - 1] / maxSpeed : 0;
      const progressFactor = 1 - progress * 0.2;
      const speedFactor = 1 - baseSpeedFactor * 0.2;
      const widthFactor = progressFactor * speedFactor;
      const currentWidth = baseThickness * widthFactor;
      widths.push(currentWidth);
    }

    const pathPoints: { x: number; y: number; w: number }[] = [];
    
    pathPoints.push({ x: points[0].x, y: points[0].y, w: widths[0] });
    
    for (let i = 1; i < points.length; i++) {
      const p0 = points[i - 1];
      const p1 = points[i];
      const w0 = widths[i - 1];
      const w1 = widths[i];
      
      const steps = Math.max(2, Math.min(8, Math.ceil(Math.abs(w1 - w0) / 0.5) + 2));
      for (let s = 1; s <= steps; s++) {
        const t = s / steps;
        const x = p0.x + (p1.x - p0.x) * t;
        const y = p0.y + (p1.y - p0.y) * t;
        const w = w0 + (w1 - w0) * t;
        pathPoints.push({ x, y, w });
      }
    }

    if (pathPoints.length < 2) return;

    ctx.beginPath();
    
    const first = pathPoints[0];
    ctx.arc(first.x, first.y, first.w / 2, 0, Math.PI * 2);
    ctx.fill();

    for (let i = 1; i < pathPoints.length; i++) {
      const prev = pathPoints[i - 1];
      const curr = pathPoints[i];
      
      const dx = curr.x - prev.x;
      const dy = curr.y - prev.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      
      if (len === 0) continue;
      
      const nx = -dy / len;
      const ny = dx / len;
      
      const w0 = prev.w / 2;
      const w1 = curr.w / 2;
      
      ctx.beginPath();
      ctx.moveTo(prev.x + nx * w0, prev.y + ny * w0);
      ctx.lineTo(curr.x + nx * w1, curr.y + ny * w1);
      ctx.lineTo(curr.x - nx * w1, curr.y - ny * w1);
      ctx.lineTo(prev.x - nx * w0, prev.y - ny * w0);
      ctx.closePath();
      ctx.fill();
      
      ctx.beginPath();
      ctx.arc(curr.x, curr.y, w1, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private renderHighlighter(ctx: CanvasRenderingContext2D, points: Point[], color: string, thickness: number): void {
    ctx.strokeStyle = color;
    ctx.lineWidth = thickness * 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = 0.3;

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length; i++) {
      const p0 = points[i - 1];
      const p1 = points[i];
      const midX = (p0.x + p1.x) / 2;
      const midY = (p0.y + p1.y) / 2;
      ctx.quadraticCurveTo(p0.x, p0.y, midX, midY);
    }

    ctx.stroke();
  }

  queuePoint(point: Point): void {
    this.pendingPoints.push(point);
  }

  flushPoints(
    type: string,
    color: string,
    thickness: number,
    onFlush: (points: Point[]) => void
  ): void {
    if (this.pendingPoints.length === 0) return;

    const now = performance.now();
    const elapsed = now - this.lastFrameTime;

    if (elapsed >= 16) {
      const pointsToRender = this.pendingPoints.splice(0, this.maxPointsPerFrame);
      onFlush(pointsToRender);
      this.lastFrameTime = now;
    }
  }

  getPendingPoints(): Point[] {
    return [...this.pendingPoints];
  }

  clearPendingPoints(): void {
    this.pendingPoints = [];
  }

  getMainContext(): CanvasRenderingContext2D {
    return this.ctx;
  }

  getOffscreenCanvas(): HTMLCanvasElement {
    return this.offscreenCanvas;
  }

  renderPartialStroke(
    points: Point[],
    type: string,
    color: string,
    thickness: number,
    allPoints: Point[]
  ): void {
    if (points.length === 0) return;

    this.renderStrokeToContext(this.ctx, {
      id: 0,
      type: type as 'pen' | 'brush' | 'highlighter',
      color,
      thickness,
      points: allPoints
    });
  }

  drawPreview(
    currentPoints: Point[],
    type: string,
    color: string,
    thickness: number,
    strokes: Stroke[]
  ): void {
    const strokesHash = strokes.map(s => s.id).join(',');
    
    if (strokesHash !== this.cachedStrokesHash) {
      this.offscreenCtx.fillStyle = '#ece8df';
      this.offscreenCtx.fillRect(0, 0, this.offscreenCanvas.width, this.offscreenCanvas.height);
      
      for (const stroke of strokes) {
        this.renderStrokeToContext(this.offscreenCtx, stroke);
      }
      this.cachedStrokesHash = strokesHash;
    }

    this.ctx.fillStyle = '#ece8df';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.drawImage(this.offscreenCanvas, 0, 0);

    if (currentPoints.length > 1) {
      this.renderStrokeToContext(this.ctx, {
        id: 0,
        type: type as 'pen' | 'brush' | 'highlighter',
        color,
        thickness,
        points: currentPoints
      });
    }
  }
}
