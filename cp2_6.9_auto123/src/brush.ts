import type { RGBA } from './palette';

export type BrushShape = 'circle' | 'ellipse' | 'irregular';

export interface BrushParams {
  diameter: number;
  shape: BrushShape;
  opacity: number;
}

export interface StrokePoint {
  x: number;
  y: number;
  speed: number;
  timestamp: number;
}

const PAPER_BG = { r: 245, g: 230, b: 204 };

export class Brush {
  diameter: number;
  shape: BrushShape;
  opacity: number;

  constructor(params: Partial<BrushParams> = {}) {
    this.diameter = params.diameter ?? 30;
    this.shape = params.shape ?? 'circle';
    this.opacity = params.opacity ?? 0.7;
  }

  setParams(params: Partial<BrushParams>): void {
    if (params.diameter !== undefined) {
      this.diameter = Math.max(10, Math.min(80, params.diameter));
    }
    if (params.shape !== undefined) {
      this.shape = params.shape;
    }
    if (params.opacity !== undefined) {
      this.opacity = Math.max(0.1, Math.min(1.0, params.opacity));
    }
  }

  computeEffectiveOpacity(speed: number): number {
    let factor: number;
    if (speed < 20) {
      factor = 1.0;
    } else if (speed > 100) {
      factor = 0.25;
    } else {
      const t = (speed - 20) / 80;
      factor = 1.0 - 0.75 * t;
    }
    return this.opacity * factor;
  }

  computeEffectiveDiameter(speed: number): number {
    let factor: number;
    if (speed < 20) {
      factor = 1.15;
    } else if (speed > 100) {
      factor = 0.45;
    } else {
      const t = (speed - 20) / 80;
      factor = 1.15 - 0.7 * t;
    }
    return this.diameter * factor;
  }

  private _noise(x: number, y: number, seed: number = 0): number {
    const n = Math.sin(x * 12.9898 + y * 78.233 + seed * 37.719) * 43758.5453;
    return n - Math.floor(n);
  }

  drawStamp(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    color: RGBA,
    speed: number,
    angle: number = 0,
  ): void {
    const effDiameter = this.computeEffectiveDiameter(speed);
    const effOpacity = this.computeEffectiveOpacity(speed);
    const radius = effDiameter / 2;

    ctx.save();
    ctx.translate(x, y);

    if (this.shape === 'ellipse') {
      ctx.rotate(angle);
      ctx.scale(1, 0.6);
    }

    const steps = 5;
    for (let i = steps; i >= 0; i--) {
      const t = i / steps;
      const layerRadius = radius * (1 + t * 0.5);
      const layerAlpha = effOpacity * (1 - t) * 0.55;

      if (layerAlpha <= 0.003) continue;

      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, layerRadius);

      const r = color.r;
      const g = color.g;
      const b = color.b;

      grad.addColorStop(0, `rgba(${r},${g},${b},${layerAlpha})`);
      grad.addColorStop(0.5, `rgba(${r},${g},${b},${layerAlpha * 0.6})`);
      grad.addColorStop(0.8, `rgba(${r},${g},${b},${layerAlpha * 0.2})`);
      grad.addColorStop(1, `rgba(${r},${g},${b},0)`);

      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = grad;

      if (this.shape === 'irregular') {
        this._drawIrregularShape(ctx, layerRadius, x, y);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, layerRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (speed > 80 && this.shape !== 'irregular') {
      const dryAlpha = effOpacity * 0.15;
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = `rgba(${color.r},${color.g},${color.b},${dryAlpha})`;
      for (let i = 0; i < 6; i++) {
        const dx = (this._noise(x + i, y) - 0.5) * radius * 0.6;
        const dy = (this._noise(x, y + i) - 0.5) * radius * 0.6;
        const dotR = radius * 0.1 * this._noise(x + i * 3, y + i * 2);
        ctx.beginPath();
        ctx.arc(dx, dy, Math.max(0.5, dotR), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  private _drawIrregularShape(
    ctx: CanvasRenderingContext2D,
    radius: number,
    seedX: number,
    seedY: number,
  ): void {
    const points = 16;
    ctx.beginPath();
    for (let i = 0; i <= points; i++) {
      const angle = (i / points) * Math.PI * 2;
      const noiseVal = this._noise(seedX + i * 0.7, seedY + i * 1.3, 1);
      const r = radius * (0.75 + noiseVal * 0.5);
      const px = Math.cos(angle) * r;
      const py = Math.sin(angle) * r;
      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.closePath();
    ctx.fill();
  }

  drawSegment(
    ctx: CanvasRenderingContext2D,
    from: StrokePoint,
    to: StrokePoint,
    color: RGBA,
  ): void {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const avgDiameter =
      (this.computeEffectiveDiameter(from.speed) + this.computeEffectiveDiameter(to.speed)) / 2;
    const step = Math.max(1, avgDiameter * 0.12);
    const steps = Math.max(1, Math.ceil(dist / step));
    const angle = Math.atan2(dy, dx);

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = from.x + dx * t;
      const y = from.y + dy * t;
      const speed = from.speed + (to.speed - from.speed) * t;
      this.drawStamp(ctx, x, y, color, speed, angle);
    }
  }

  renderPreview(ctx: CanvasRenderingContext2D, color: RGBA, width: number, height: number): void {
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.fillStyle = `rgb(${PAPER_BG.r},${PAPER_BG.g},${PAPER_BG.b})`;
    ctx.fillRect(0, 0, width, height);
    this._drawPaperTexture(ctx, width, height);

    const previewDiameter = Math.min(this.diameter, 50);
    const oldDiameter = this.diameter;
    this.diameter = previewDiameter;

    const cx = width / 2;
    const cy = height / 2;

    const pts: StrokePoint[] = [
      { x: cx - 25, y: cy + 10, speed: 15, timestamp: 0 },
      { x: cx - 10, y: cy - 5, speed: 50, timestamp: 1 },
      { x: cx + 5, y: cy + 5, speed: 70, timestamp: 2 },
      { x: cx + 25, y: cy - 8, speed: 110, timestamp: 3 },
    ];

    for (let i = 0; i < pts.length - 1; i++) {
      this.drawSegment(ctx, pts[i], pts[i + 1], color);
    }

    this.diameter = oldDiameter;
    ctx.restore();
  }

  drawPaperBackground(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.save();
    ctx.fillStyle = `rgb(${PAPER_BG.r},${PAPER_BG.g},${PAPER_BG.b})`;
    ctx.fillRect(0, 0, width, height);
    this._drawPaperTexture(ctx, width, height);
    ctx.restore();
  }

  private _drawPaperTexture(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const x = (i / 4) % width;
      const y = Math.floor(i / 4 / width);

      const noise = (Math.random() - 0.5) * 18;
      data[i] = Math.max(0, Math.min(255, data[i] + noise));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));

      const fiberNoise = this._pseudoRandom(x * 0.13, y * 0.17);
      if (fiberNoise > 0.985) {
        const darken = -25;
        data[i] = Math.max(0, data[i] + darken);
        data[i + 1] = Math.max(0, data[i + 1] + darken);
        data[i + 2] = Math.max(0, data[i + 2] + darken);
      } else if (fiberNoise > 0.97) {
        const darken = -12;
        data[i] = Math.max(0, data[i] + darken);
        data[i + 1] = Math.max(0, data[i + 1] + darken);
        data[i + 2] = Math.max(0, data[i + 2] + darken);
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }

  private _pseudoRandom(x: number, y: number): number {
    const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return n - Math.floor(n);
  }
}
