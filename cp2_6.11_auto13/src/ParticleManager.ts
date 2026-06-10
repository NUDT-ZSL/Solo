import type { Particle, Ribbon } from './types';

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

  public addBeamNoteTrigger(beamIndex: number, x: number, y: number, color: string): void {
    const startX = x;
    const startY = y;
    const targetX = x + (Math.random() - 0.3) * 80;
    const targetY = y - 60 - Math.random() * 100;
    const maxLife = Math.floor(72);

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
      size: 3
    });

    const ribbonStartX = x;
    const ribbonStartY = y;
    const cpOffsetX = 50 + Math.random() * 50;
    const cpOffsetY = -100 - Math.random() * 80;
    const endX = this.canvasWidth * 0.75 + Math.random() * (this.canvasWidth * 0.15);
    const endY = Math.max(60, this.canvasHeight * 0.15 + Math.random() * 80);

    const controlX = ribbonStartX + cpOffsetX;
    const controlY = ribbonStartY + cpOffsetY;

    const points: Array<{ x: number; y: number }> = [];
    const ribbonLength = 30;
    for (let i = 0; i < ribbonLength; i++) {
      const t = i / (ribbonLength - 1);
      const px = this.quadBezier(ribbonStartX, controlX, endX, t);
      const py = this.quadBezier(ribbonStartY, controlY, endY, t);
      points.push({ x: px, y: py });
    }

    this.ribbons.push({
      points,
      color: color,
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
            x: last.x + (Math.random() - 0.5) * 1.5,
            y: last.y - 0.8
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
      ctx.shadowBlur = 12;
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
      ctx.globalAlpha = alpha * 0.7;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowColor = r.color;
      ctx.shadowBlur = 10;

      ctx.beginPath();
      ctx.moveTo(r.points[0].x, r.points[0].y);
      for (let i = 1; i < r.points.length; i++) {
        ctx.lineTo(r.points[i].x, r.points[i].y);
      }
      ctx.stroke();

      ctx.globalAlpha = alpha * 0.25;
      ctx.lineWidth = 6;
      ctx.shadowBlur = 18;
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
