import { ColorProbe } from './probe';

export type GradientType = 'linear' | 'radial';

export interface GradientConfig {
  startColor: string;
  endColor: string;
  type: GradientType;
}

export class GradientGenerator {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private config: GradientConfig;
  private animationFrameId: number | null = null;
  private pendingRender: boolean = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法获取Canvas上下文');
    this.ctx = ctx;
    this.config = {
      startColor: '#FF0000',
      endColor: '#0000FF',
      type: 'linear'
    };
  }

  setConfig(config: Partial<GradientConfig>): void {
    this.config = { ...this.config, ...config };
    this.scheduleRender();
  }

  getConfig(): GradientConfig {
    return { ...this.config };
  }

  setSize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.scheduleRender();
  }

  render(): void {
    const { width, height } = this.canvas;
    this.ctx.clearRect(0, 0, width, height);

    const gradient = this.config.type === 'linear'
      ? this.createLinearGradient(width, height)
      : this.createRadialGradient(width, height);

    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, width, height);
  }

  private createLinearGradient(width: number, height: number): CanvasGradient {
    const gradient = this.ctx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, this.config.startColor);
    gradient.addColorStop(1, this.config.endColor);
    return gradient;
  }

  private createRadialGradient(width: number, height: number): CanvasGradient {
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2;
    const gradient = this.ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
    gradient.addColorStop(0, this.config.startColor);
    gradient.addColorStop(1, this.config.endColor);
    return gradient;
  }

  generateColorSteps(steps: number): string[] {
    const startRgb = ColorProbe.hexToRgb(this.config.startColor);
    const endRgb = ColorProbe.hexToRgb(this.config.endColor);

    if (!startRgb || !endRgb) return [];

    const colors: string[] = [];
    for (let i = 0; i < steps; i++) {
      const ratio = i / (steps - 1);
      const r = Math.round(startRgb.r + (endRgb.r - startRgb.r) * ratio);
      const g = Math.round(startRgb.g + (endRgb.g - startRgb.g) * ratio);
      const b = Math.round(startRgb.b + (endRgb.b - startRgb.b) * ratio);
      colors.push(this.rgbToHex(r, g, b));
    }

    return colors;
  }

  generateCSS(): string {
    if (this.config.type === 'linear') {
      return `linear-gradient(90deg, ${this.config.startColor}, ${this.config.endColor})`;
    } else {
      return `radial-gradient(circle, ${this.config.startColor}, ${this.config.endColor})`;
    }
  }

  private rgbToHex(r: number, g: number, b: number): string {
    const toHex = (n: number) => n.toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
  }

  private scheduleRender(): void {
    if (this.pendingRender) return;
    this.pendingRender = true;

    setTimeout(() => {
      this.pendingRender = false;
      this.render();
    }, 100);
  }

  destroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
}
