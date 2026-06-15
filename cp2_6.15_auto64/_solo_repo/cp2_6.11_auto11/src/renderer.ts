import type {
  BrushPoint,
  StrokePath,
  DryStrokeParticle,
  DiffusionPoint,
  RenderData
} from './brush';
import { BrushEngine } from './brush';

export type PaperTexture = 'plain' | 'gold' | 'cloud';

interface PendingDiffusion {
  diffusion: DiffusionPoint;
  color: string;
}

export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private textureCanvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private textureCtx: CanvasRenderingContext2D;
  private offscreenCanvas: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;
  private currentTexture: PaperTexture = 'plain';
  private pendingDiffusions: PendingDiffusion[] = [];
  private animationFrameId: number | null = null;

  constructor(canvas: HTMLCanvasElement, textureCanvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.textureCanvas = textureCanvas;

    const ctx = canvas.getContext('2d');
    const textureCtx = textureCanvas.getContext('2d');

    if (!ctx || !textureCtx) {
      throw new Error('无法获取Canvas 2D上下文');
    }

    this.ctx = ctx;
    this.textureCtx = textureCtx;

    this.offscreenCanvas = document.createElement('canvas');
    const offscreenCtx = this.offscreenCanvas.getContext('2d');
    if (!offscreenCtx) {
      throw new Error('无法创建离屏Canvas上下文');
    }
    this.offscreenCtx = offscreenCtx;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;

    this.canvas.width = width;
    this.canvas.height = height;
    this.textureCanvas.width = width;
    this.textureCanvas.height = height;
    this.offscreenCanvas.width = width;
    this.offscreenCanvas.height = height;

    this.clear();
    this.drawTexture();
  }

  setTexture(texture: PaperTexture): void {
    this.currentTexture = texture;
    this.drawTexture();
  }

  getTexture(): PaperTexture {
    return this.currentTexture;
  }

  clear(): void {
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.offscreenCtx.clearRect(0, 0, this.width, this.height);
  }

  redrawAllStrokes(strokes: StrokePath[]): void {
    this.clear();

    for (const stroke of strokes) {
      this.drawStroke(stroke);
    }

    this.drawTexture();
  }

  handleRenderData(data: RenderData): void {
    if (data.dryParticles.length > 0) {
      this.drawDryParticles(data.dryParticles, data.stroke.color);
    }

    if (data.diffusions.length > 0) {
      for (const d of data.diffusions) {
        this.pendingDiffusions.push({ diffusion: d, color: data.stroke.color });
      }
      this.startDiffusionAnimation();
    }

    if (data.stroke.points.length >= 2) {
      this.drawStrokeSegment(data.stroke);
    } else if (data.stroke.points.length === 1) {
      this.drawDot(data.stroke.points[0], data.stroke.color);
    }
  }

  private drawStrokeSegment(stroke: StrokePath): void {
    const points = stroke.points;
    if (points.length < 2) return;

    const startIdx = Math.max(0, points.length - 3);
    this.ctx.save();

    const rgb = BrushEngine.hexToRgb(stroke.color);

    for (let i = startIdx; i < points.length - 1; i++) {
      const p0 = points[i - 1] || points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] || p2;

      this.drawBezierSegment(p0, p1, p2, p3, rgb);
    }

    this.ctx.restore();
  }

  private drawBezierSegment(
    p0: BrushPoint,
    p1: BrushPoint,
    p2: BrushPoint,
    p3: BrushPoint,
    rgb: { r: number; g: number; b: number }
  ): void {
    const steps = 8;

    for (let i = 0; i < steps; i++) {
      const t1 = i / steps;
      const t2 = (i + 1) / steps;

      const x1 = this.cubicBezier(p0.x, p1.x, p2.x, p3.x, t1);
      const y1 = this.cubicBezier(p0.y, p1.y, p2.y, p3.y, t1);
      const x2 = this.cubicBezier(p0.x, p1.x, p2.x, p3.x, t2);
      const y2 = this.cubicBezier(p0.y, p1.y, p2.y, p3.y, t2);

      const w1 = this.lerp(p1.width, p2.width, t1);
      const w2 = this.lerp(p1.width, p2.width, t2);
      const o1 = this.lerp(p1.opacity, p2.opacity, t1);
      const o2 = this.lerp(p1.opacity, p2.opacity, t2);

      const gradient = this.ctx.createLinearGradient(x1, y1, x2, y2);
      gradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${o1})`);
      gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${o2})`);

      this.ctx.beginPath();
      this.ctx.strokeStyle = gradient;
      this.ctx.lineWidth = (w1 + w2) / 2;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      this.ctx.moveTo(x1, y1);
      this.ctx.lineTo(x2, y2);
      this.ctx.stroke();
    }
  }

  private drawStroke(stroke: StrokePath): void {
    const points = stroke.points;
    if (points.length === 0) return;
    if (points.length === 1) {
      this.drawDot(points[0], stroke.color);
      return;
    }

    const rgb = BrushEngine.hexToRgb(stroke.color);
    this.ctx.save();

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i - 1] || points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] || p2;

      this.drawBezierSegment(p0, p1, p2, p3, rgb);
    }

    this.ctx.restore();
  }

  private drawDot(point: BrushPoint, color: string): void {
    const rgb = BrushEngine.hexToRgb(color);
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${point.opacity})`;
    this.ctx.arc(point.x, point.y, point.width / 2, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();
  }

  private drawDryParticles(particles: DryStrokeParticle[], color: string): void {
    if (particles.length === 0) return;

    const rgb = BrushEngine.hexToRgb(color);
    this.ctx.save();

    for (const p of particles) {
      this.ctx.beginPath();
      this.ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${p.opacity})`;
      this.ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.ctx.restore();
  }

  private startDiffusionAnimation(): void {
    if (this.animationFrameId !== null) return;

    const animate = () => {
      const now = performance.now();
      const remaining: PendingDiffusion[] = [];

      this.ctx.save();

      for (const item of this.pendingDiffusions) {
        const d = item.diffusion;

        if (now < d.startTime) {
          remaining.push(item);
          continue;
        }

        const elapsed = now - d.startTime;
        if (elapsed >= d.duration) {
          continue;
        }

        const progress = elapsed / d.duration;
        const currentRadius = d.radius * (0.5 + progress * 0.5);
        const currentOpacity = d.opacity * (1 - progress);

        const rgb = BrushEngine.hexToRgb(item.color);
        const gradient = this.ctx.createRadialGradient(
          d.x, d.y, 0,
          d.x, d.y, currentRadius
        );
        gradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${currentOpacity})`);
        gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);

        this.ctx.beginPath();
        this.ctx.fillStyle = gradient;
        this.ctx.arc(d.x, d.y, currentRadius, 0, Math.PI * 2);
        this.ctx.fill();

        remaining.push(item);
      }

      this.ctx.restore();

      this.pendingDiffusions = remaining;

      if (this.pendingDiffusions.length > 0) {
        this.animationFrameId = requestAnimationFrame(animate);
      } else {
        this.animationFrameId = null;
      }
    };

    this.animationFrameId = requestAnimationFrame(animate);
  }

  private drawTexture(): void {
    const ctx = this.textureCtx;
    ctx.clearRect(0, 0, this.width, this.height);

    switch (this.currentTexture) {
      case 'plain':
        this.drawPlainTexture(ctx);
        break;
      case 'gold':
        this.drawGoldTexture(ctx);
        break;
      case 'cloud':
        this.drawCloudTexture(ctx);
        break;
    }
  }

  private drawPlainTexture(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = 'rgba(250, 240, 220, 0.3)';
    ctx.fillRect(0, 0, this.width, this.height);

    for (let i = 0; i < 200; i++) {
      const x = Math.random() * this.width;
      const y = Math.random() * this.height;
      const size = Math.random() * 1.5 + 0.5;
      ctx.fillStyle = `rgba(180, 160, 120, ${Math.random() * 0.04})`;
      ctx.fillRect(x, y, size, size);
    }
  }

  private drawGoldTexture(ctx: CanvasRenderingContext2D): void {
    this.drawPlainTexture(ctx);

    const goldCount = Math.floor((this.width * this.height) / 15000);
    for (let i = 0; i < goldCount; i++) {
      const x = Math.random() * this.width;
      const y = Math.random() * this.height;
      const size = Math.random() * 3 + 1;

      const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
      gradient.addColorStop(0, `rgba(255, 215, 100, ${0.3 + Math.random() * 0.3})`);
      gradient.addColorStop(1, 'rgba(255, 215, 100, 0)');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawCloudTexture(ctx: CanvasRenderingContext2D): void {
    this.drawPlainTexture(ctx);

    ctx.save();
    ctx.globalAlpha = 0.06;

    for (let i = 0; i < 8; i++) {
      const x = Math.random() * this.width;
      const y = Math.random() * this.height;
      const w = 80 + Math.random() * 150;
      const h = 40 + Math.random() * 60;

      const gradient = ctx.createRadialGradient(x, y, 0, x, y, Math.max(w, h) / 2);
      gradient.addColorStop(0, 'rgba(100, 100, 120, 1)');
      gradient.addColorStop(1, 'rgba(100, 100, 120, 0)');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.ellipse(x, y, w / 2, h / 2, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  getSize(): { width: number; height: number } {
    return { width: this.width, height: this.height };
  }

  captureToOffscreen(scale: number = 1): HTMLCanvasElement {
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = this.width * scale;
    exportCanvas.height = this.height * scale;

    const exportCtx = exportCanvas.getContext('2d');
    if (!exportCtx) {
      throw new Error('无法创建导出Canvas上下文');
    }

    exportCtx.fillStyle = '#FAF0DC';
    exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

    exportCtx.scale(scale, scale);
    exportCtx.drawImage(this.textureCanvas, 0, 0);
    exportCtx.drawImage(this.canvas, 0, 0);

    return exportCanvas;
  }

  private cubicBezier(p0: number, p1: number, p2: number, p3: number, t: number): number {
    const mt = 1 - t;
    return (
      mt * mt * mt * p0 +
      3 * mt * mt * t * p1 +
      3 * mt * t * t * p2 +
      t * t * t * p3
    );
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  destroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
}
