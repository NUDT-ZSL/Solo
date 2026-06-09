import { Particle } from './particles';
import { PaperTexture } from './texture';

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private textureCanvas: HTMLCanvasElement;
  private textureCtx: CanvasRenderingContext2D;

  constructor(ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;
    this.textureCanvas = document.createElement('canvas');
    this.textureCanvas.width = width;
    this.textureCanvas.height = height;
    this.textureCtx = this.textureCanvas.getContext('2d')!;
    this.generateTexture();
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.textureCanvas.width = width;
    this.textureCanvas.height = height;
    this.generateTexture();
  }

  private generateTexture(): void {
    const paperTexture = new PaperTexture();
    const imageData = paperTexture.generate(this.width, this.height);
    this.textureCtx.putImageData(imageData, 0, 0);

    this.textureCtx.globalCompositeOperation = 'multiply';
    for (let i = 0; i < 8; i++) {
      const x = Math.random() * this.width;
      const y = Math.random() * this.height;
      const radius = 100 + Math.random() * 200;
      const gradient = this.textureCtx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, 'rgba(200, 190, 170, 0.15)');
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      this.textureCtx.fillStyle = gradient;
      this.textureCtx.fillRect(0, 0, this.width, this.height);
    }
    this.textureCtx.globalCompositeOperation = 'source-over';
  }

  clear(): void {
    this.ctx.drawImage(this.textureCanvas, 0, 0);
  }

  draw(particles: Particle[]): void {
    this.clear();

    this.ctx.globalCompositeOperation = 'multiply';

    for (const p of particles) {
      this.drawParticle(p);
    }

    this.ctx.globalCompositeOperation = 'source-over';
  }

  private drawParticle(p: Particle): void {
    const alpha = Math.max(0, Math.min(1, p.alpha));
    const size = Math.max(0.5, p.size);

    const gradient = this.ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size);
    const color = this.parseColor(p.color);

    if (p.isSplash) {
      gradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`);
      gradient.addColorStop(0.6, `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha * 0.4})`);
      gradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);
    } else {
      gradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`);
      gradient.addColorStop(0.4, `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha * 0.7})`);
      gradient.addColorStop(0.75, `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha * 0.3})`);
      gradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);
    }

    this.ctx.beginPath();
    this.ctx.fillStyle = gradient;
    this.ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
    this.ctx.fill();

    if (!p.isSplash && size > 6 && alpha > 0.3) {
      const innerGrad = this.ctx.createRadialGradient(
        p.x, p.y, 0,
        p.x, p.y, size * 0.4
      );
      innerGrad.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha * 0.15})`);
      innerGrad.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);
      this.ctx.beginPath();
      this.ctx.fillStyle = innerGrad;
      this.ctx.arc(p.x, p.y, size * 0.4, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  private parseColor(color: string): { r: number; g: number; b: number } {
    if (color.startsWith('#')) {
      const hex = color.slice(1);
      const bigint = parseInt(hex.length === 3
        ? hex.split('').map(c => c + c).join('')
        : hex, 16);
      return {
        r: (bigint >> 16) & 255,
        g: (bigint >> 8) & 255,
        b: bigint & 255
      };
    }
    const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (match) {
      return {
        r: parseInt(match[1], 10),
        g: parseInt(match[2], 10),
        b: parseInt(match[3], 10)
      };
    }
    return { r: 51, g: 51, b: 51 };
  }

  getCanvas(): HTMLCanvasElement {
    return this.ctx.canvas;
  }

  exportPNG(): string {
    return this.ctx.canvas.toDataURL('image/png');
  }
}
