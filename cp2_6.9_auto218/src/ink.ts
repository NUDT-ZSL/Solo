import { createNoise2D } from 'simplex-noise';

export interface InkDiffusion {
  x: number;
  y: number;
  baseRadius: number;
  currentRadius: number;
  maxRadius: number;
  alpha: number;
  startTime: number;
  duration: number;
  completed: boolean;
  color: string;
  inkDensity: number;
}

export class InkEngine {
  private noise2D = createNoise2D();
  private diffusions: InkDiffusion[] = [];
  private lastUpdateTime: number = 0;
  private updateInterval: number = 1000 / 30;

  addDiffusion(x: number, y: number, radius: number, inkDensity: number, color: string = '#1A1A1A') {
    const diffusion: InkDiffusion = {
      x,
      y,
      baseRadius: radius,
      currentRadius: radius,
      maxRadius: radius + 3 + Math.random() * 3,
      alpha: inkDensity * 0.6,
      startTime: performance.now(),
      duration: 3000,
      completed: false,
      color,
      inkDensity
    };
    this.diffusions.push(diffusion);
  }

  update(now: number): boolean {
    if (now - this.lastUpdateTime < this.updateInterval) {
      return false;
    }
    this.lastUpdateTime = now;

    let hasActive = false;

    for (let i = this.diffusions.length - 1; i >= 0; i--) {
      const d = this.diffusions[i];
      const elapsed = now - d.startTime;
      const progress = Math.min(elapsed / d.duration, 1);

      d.currentRadius = d.baseRadius + progress * (d.maxRadius - d.baseRadius);
      d.alpha = d.inkDensity * 0.6 * (1 - progress * 0.5);

      if (progress >= 1) {
        d.completed = true;
      } else {
        hasActive = true;
      }
    }

    return hasActive || this.diffusions.length > 0;
  }

  render(ctx: CanvasRenderingContext2D) {
    for (const d of this.diffusions) {
      this.renderDiffusion(ctx, d);
    }
  }

  private renderDiffusion(ctx: CanvasRenderingContext2D, d: InkDiffusion) {
    const segments = 64;
    const noiseScale = 0.015;

    ctx.save();
    ctx.beginPath();

    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const noiseVal = this.noise2D(
        d.x * noiseScale + Math.cos(angle) * 2,
        d.y * noiseScale + Math.sin(angle) * 2
      );
      const jitter = 1 + noiseVal * 0.25;
      const r = d.currentRadius * jitter;
      const x = d.x + Math.cos(angle) * r;
      const y = d.y + Math.sin(angle) * r;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.closePath();

    const gradient = ctx.createRadialGradient(
      d.x, d.y, 0,
      d.x, d.y, d.currentRadius
    );

    const centerColor = this.hexToRgba(d.color, d.alpha * 0.4);
    const edgeColor = this.hexToRgba('#4A4A4A', 0);

    gradient.addColorStop(0, centerColor);
    gradient.addColorStop(0.6, this.hexToRgba(d.color, d.alpha * 0.2));
    gradient.addColorStop(1, edgeColor);

    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.restore();
  }

  cleanupCompleted() {
    this.diffusions = this.diffusions.filter(d => !d.completed || performance.now() - d.startTime < d.duration + 500);
  }

  clear() {
    this.diffusions = [];
  }

  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}
