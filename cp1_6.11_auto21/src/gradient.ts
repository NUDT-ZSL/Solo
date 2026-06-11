import { GradientConfig, IGradientGenerator } from './types';
import { ColorProbe } from './probe';

export type { GradientConfig } from './types';

export class GradientGenerator implements IGradientGenerator {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private config: GradientConfig;
  private resizeObserver: ResizeObserver | null = null;
  private animationFrameId: number | null = null;
  private pendingRender: boolean = false;
  private readonly MIN_WIDTH: number = 300;
  private readonly MIN_HEIGHT: number = 40;

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

    this.setupResizeObserver();
  }

  private setupResizeObserver(): void {
    if (typeof ResizeObserver === 'undefined') return;

    try {
      this.resizeObserver = new ResizeObserver(entries => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          this.resizeTo(Math.ceil(width), Math.ceil(height));
        }
      });

      requestAnimationFrame(() => {
        if (!this.resizeObserver) return;
        const container = this.canvas.parentElement || this.canvas;
        this.resizeObserver.observe(container);

        const rect = container.getBoundingClientRect();
        if (rect.width > 0 || rect.height > 0) {
          this.resizeTo(Math.ceil(rect.width), Math.ceil(rect.height));
        }
      });
    } catch (e) {
      console.warn('ResizeObserver初始化失败，使用窗口resize事件降级', e);
    }
  }

  private resizeTo(width: number, height: number): void {
    const safeWidth = Math.max(width, this.MIN_WIDTH);
    const safeHeight = Math.max(height, this.MIN_HEIGHT);

    const currentWidth = this.canvas.width;
    const currentHeight = this.canvas.height;

    if (currentWidth === safeWidth && currentHeight === safeHeight) return;

    this.canvas.width = safeWidth;
    this.canvas.height = safeHeight;

    this.canvas.style.width = '100%';
    this.canvas.style.height = `${safeHeight}px`;

    this.scheduleRender();
  }

  setConfig(config: Partial<GradientConfig>): void {
    const next: GradientConfig = { ...this.config, ...config };

    if (
      next.startColor === this.config.startColor &&
      next.endColor === this.config.endColor &&
      next.type === this.config.type
    ) {
      return;
    }

    this.config = next;
    this.scheduleRender();
  }

  getConfig(): GradientConfig {
    return { ...this.config };
  }

  setSize(width: number, height: number): void {
    this.resizeTo(width, height);
  }

  render(): void {
    const { width, height } = this.canvas;

    if (width === 0 || height === 0) return;

    this.ctx.clearRect(0, 0, width, height);

    try {
      const gradient = this.config.type === 'linear'
        ? this.createLinearGradient(width, height)
        : this.createRadialGradient(width, height);

      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(0, 0, width, height);
    } catch (e) {
      console.error('渐变渲染失败:', e);
      this.ctx.fillStyle = this.sanitizeColor(this.config.startColor);
      this.ctx.fillRect(0, 0, width, height);
    }
  }

  private createLinearGradient(width: number, _height: number): CanvasGradient {
    const gradient = this.ctx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, this.sanitizeColor(this.config.startColor));
    gradient.addColorStop(1, this.sanitizeColor(this.config.endColor));
    return gradient;
  }

  private createRadialGradient(width: number, height: number): CanvasGradient {
    const centerX = width / 2;
    const centerY = height / 2;
    const halfDiagonal = Math.sqrt(width * width + height * height) / 2;

    const innerRadius = 0;
    const outerRadius = halfDiagonal;

    const gradient = this.ctx.createRadialGradient(
      centerX,
      centerY,
      innerRadius,
      centerX,
      centerY,
      outerRadius
    );

    const startColor = this.sanitizeColor(this.config.startColor);
    const endColor = this.sanitizeColor(this.config.endColor);

    gradient.addColorStop(0, startColor);
    gradient.addColorStop(0.5, this.interpolateColor(startColor, endColor, 0.5));
    gradient.addColorStop(1, endColor);

    return gradient;
  }

  private interpolateColor(color1Hex: string, color2Hex: string, ratio: number): string {
    const c1 = ColorProbe.hexToRgb(color1Hex);
    const c2 = ColorProbe.hexToRgb(color2Hex);

    if (!c1 || !c2) return color1Hex;

    const safeRatio = Math.max(0, Math.min(1, ratio));
    const r = Math.round(c1.r + (c2.r - c1.r) * safeRatio);
    const g = Math.round(c1.g + (c2.g - c1.g) * safeRatio);
    const b = Math.round(c1.b + (c2.b - c1.b) * safeRatio);

    return ColorProbe.rgbToHex(r, g, b);
  }

  private sanitizeColor(color: string): string {
    if (!color) return '#000000';
    const trimmed = color.trim();
    if (/^#[0-9a-f]{6}$/i.test(trimmed)) return trimmed.toUpperCase();
    if (/^#[0-9a-f]{3}$/i.test(trimmed)) {
      const full = trimmed.split('').slice(1).map(c => c + c).join('');
      return `#${full.toUpperCase()}`;
    }
    const rgb = ColorProbe.hexToRgb(trimmed);
    if (rgb) return ColorProbe.rgbToHex(rgb.r, rgb.g, rgb.b);
    return '#000000';
  }

  generateColorSteps(steps: number): string[] {
    if (steps <= 1) return [this.config.startColor];

    const startRgb = ColorProbe.hexToRgb(this.config.startColor);
    const endRgb = ColorProbe.hexToRgb(this.config.endColor);

    if (!startRgb || !endRgb) return [this.config.startColor, this.config.endColor];

    const colors: string[] = [];
    for (let i = 0; i < steps; i++) {
      const ratio = i / (steps - 1);
      const r = Math.round(startRgb.r + (endRgb.r - startRgb.r) * ratio);
      const g = Math.round(startRgb.g + (endRgb.g - startRgb.g) * ratio);
      const b = Math.round(startRgb.b + (endRgb.b - startRgb.b) * ratio);
      colors.push(ColorProbe.rgbToHex(r, g, b));
    }

    return colors;
  }

  generateCSS(): string {
    const start = this.sanitizeColor(this.config.startColor);
    const end = this.sanitizeColor(this.config.endColor);

    if (this.config.type === 'linear') {
      return `linear-gradient(90deg, ${start}, ${end})`;
    } else {
      return `radial-gradient(circle at center, ${start}, ${end})`;
    }
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
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
}
