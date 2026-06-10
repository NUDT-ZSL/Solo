import type { Particle, Ribbon } from './types';
import { PARTICLE_COLORS } from './types';

export class ParticleManager {
  public particles: Particle[] = [];
  public ribbons: Ribbon[] = [];
  private canvasWidth: number = 0;
  private canvasHeight: number = 0;

  constructor() {}

  public setCanvasSize(w: number, h: number): void {
    this.canvasWidth = w;
    this.canvasHeight = h;
  }

  public addBeamNoteTrigger(beamIndex: number, x: number, y: number): void {
    for (let i = 0; i < 3; i++) {
      const startX = x + (Math.random() - 0.5) * 10;
      const startY = y;
      const offsetX = 50 + Math.random() * 100;
      const offsetY = -80 - Math.random() * 120;
      const targetX = startX + offsetX + (Math.random() - 0.5) * 50;
      const targetY = startY + offsetY - Math.random() * 80;
      const color = PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)];
      const maxLife = Math.floor(72 * (1.0 + Math.random() * 0.2));

      this.particles.push({
        x: startX,
        y: startY,
        startX,
        startY,
        targetX,
        targetY,
        lifeTime: maxLife,
        maxLife,
        color,
        size: 2 + Math.random() * 2
      });
    }

    const startX = x;
    const startY = y;
    const cpOffsetX = 50 + Math.random() * 50;
    const cpOffsetY = -100 - Math.random() * 80;
    const endX = this.canvasWidth * 0.75 + Math.random() * (this.canvasWidth * 0.2);
    const endY = Math.max(60, this.canvasHeight * 0.15 + Math.random() * 100);

    const controlX = startX + cpOffsetX;
    const controlY = startY + cpOffsetY;

    const points: Array<{ x: number; y: number }> = [];
    const ribbonLength = 30;
    for (let i = 0; i < ribbonLength; i++) {
      const t = i / (ribbonLength - 1);
      const px = this.quadBezier(startX, controlX, endX, t);
      const py = this.quadBezier(startY, controlY, endY, t);
      points.push({ x: px, y: py });
    }

    this.ribbons.push({
      points,
      color: '#4A9EFF',
      lifeTime: 60,
      maxLife: 60
    });
  }

  private quadBezier(p0: number, p1: number, p2: number, t: number): number {
    const it = 1 - t;
    return it * it * p0 + 2 * it * t * p1 + t * t * p2;
  }

  public update(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.lifeTime--;
      const t = 1 - p.lifeTime / p.maxLife;
      const easeT = t * t * (3 - 2 * t);
      p.x = p.startX + (p.targetX - p.startX) * easeT;
      p.y = p.startY + (p.targetY - p.startY) * easeT;

      if (p.lifeTime <= 0) {
        this.particles.splice(i, 1);
      }
    }

    for (let i = this.ribbons.length - 1; i >= 0; i--) {
      const r = this.ribbons[i];
      r.lifeTime--;

      if (r.points.length > 0) {
        r.points.shift();
        if (r.points.length > 0) {
          const last = r.points[r.points.length - 1];
          r.points.push({
            x: last.x + (Math.random() - 0.5) * 2,
            y: last.y - 1
          });
        }
      }

      if (r.lifeTime <= 0) {
        this.ribbons.splice(i, 1);
      }
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    this.renderRibbons(ctx);
    this.renderParticles(ctx);
  }

  private renderParticles(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      const alpha = Math.min(1, p.lifeTime / (p.maxLife * 0.5));
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 10;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private renderRibbons(ctx: CanvasRenderingContext2D): void {
    for (const r of this.ribbons) {
      if (r.points.length < 2) continue;

      const alpha = r.lifeTime / r.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha * 0.6;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowColor = r.color;
      ctx.shadowBlur = 8;

      ctx.beginPath();
      ctx.moveTo(r.points[0].x, r.points[0].y);
      for (let i = 1; i < r.points.length; i++) {
        ctx.lineTo(r.points[i].x, r.points[i].y);
      }
      ctx.stroke();

      ctx.globalAlpha = alpha * 0.2;
      ctx.lineWidth = 6;
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.moveTo(r.points[0].x, r.points[0].y);
      for (let i = 1; i < r.points.length; i++) {
        ctx.lineTo(r.points[i].x, r.points[i].y);
      }
      ctx.stroke();

      ctx.restore();
    }
  }
}
