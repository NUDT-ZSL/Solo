import { createColorData, ColorData } from './probe';

export type GradientType = 'linear' | 'radial';

export interface GradientOptions {
  startColor: string;
  endColor: string;
  type: GradientType;
}

export class GradientGenerator {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private startColor: string = '#FF0000';
  private endColor: string = '#0000FF';
  private type: GradientType = 'linear';
  private resizeObserver: ResizeObserver | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.setupResizeObserver();
  }

  private setupResizeObserver(): void {
    this.resizeObserver = new ResizeObserver(() => {
      this.handleResize();
    });
    this.resizeObserver.observe(this.canvas);
  }

  private handleResize(): void {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
    this.draw();
  }

  setColors(startColor: string, endColor: string): void {
    this.startColor = startColor;
    this.endColor = endColor;
    this.draw();
  }

  setStartColor(color: string): void {
    this.startColor = color;
    this.draw();
  }

  setEndColor(color: string): void {
    this.endColor = color;
    this.draw();
  }

  setType(type: GradientType): void {
    this.type = type;
    this.draw();
  }

  toggleType(): GradientType {
    this.type = this.type === 'linear' ? 'radial' : 'linear';
    this.draw();
    return this.type;
  }

  getType(): GradientType {
    return this.type;
  }

  getStartColor(): string {
    return this.startColor;
  }

  getEndColor(): string {
    return this.endColor;
  }

  draw(): void {
    const rect = this.canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    this.ctx.clearRect(0, 0, width, height);

    let gradient: CanvasGradient;

    if (this.type === 'linear') {
      gradient = this.ctx.createLinearGradient(0, 0, width, 0);
    } else {
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.min(width, height) / 2;
      gradient = this.ctx.createRadialGradient(
        centerX, centerY, 0,
        centerX, centerY, radius
      );
    }

    gradient.addColorStop(0, this.startColor);
    gradient.addColorStop(1, this.endColor);

    this.ctx.fillStyle = gradient;

    const radius = Math.min(8, height / 2);
    this.ctx.beginPath();
    this.roundRect(this.ctx, 0, 0, width, height, radius);
    this.ctx.fill();
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ): void {
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  generateColorSteps(steps: number): ColorData[] {
    const result: ColorData[] = [];
    const startRgb = this.parseColor(this.startColor);
    const endRgb = this.parseColor(this.endColor);

    if (!startRgb || !endRgb) {
      return result;
    }

    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      const r = Math.round(startRgb.r + (endRgb.r - startRgb.r) * t);
      const g = Math.round(startRgb.g + (endRgb.g - startRgb.g) * t);
      const b = Math.round(startRgb.b + (endRgb.b - startRgb.b) * t);
      result.push(createColorData(r, g, b));
    }

    return result;
  }

  private parseColor(color: string): { r: number; g: number; b: number } | null {
    const hexPattern = /^#([A-Fa-f0-9]{6})$/;
    const match = color.match(hexPattern);
    if (match) {
      const hex = match[1];
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16)
      };
    }
    return null;
  }

  generateCSS(): string {
    if (this.type === 'linear') {
      return `linear-gradient(90deg, ${this.startColor}, ${this.endColor})`;
    } else {
      return `radial-gradient(circle, ${this.startColor}, ${this.endColor})`;
    }
  }

  destroy(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
  }
}
