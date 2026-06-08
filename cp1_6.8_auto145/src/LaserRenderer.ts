import { LaserPath, CrystalParticle } from './GameEngine';

interface TrailParticle {
  x: number;
  y: number;
  life: number;
  maxLife: number;
  size: number;
}

export class LaserRenderer {
  private ctx: CanvasRenderingContext2D;
  private trailParticles: TrailParticle[] = [];
  private particleSpawnAccum: number = 0;
  private time: number = 0;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  drawLaser(laserPath: LaserPath, dt: number) {
    const ctx = this.ctx;
    this.time += dt;

    ctx.save();

    for (const seg of laserPath.segments) {
      this.drawLaserSegment(ctx, seg.startX, seg.startY, seg.endX, seg.endY);
    }

    for (let i = 0; i < laserPath.segments.length; i++) {
      const seg = laserPath.segments[i];
      if (seg.hitMirror || i < laserPath.segments.length - 1) {
        this.drawReflectionGlow(ctx, seg.endX, seg.endY);
      }
    }

    this.spawnTrailParticles(laserPath, dt);
    this.updateAndDrawTrailParticles(ctx, dt);

    ctx.restore();
  }

  private drawLaserSegment(ctx: CanvasRenderingContext2D, sx: number, sy: number, ex: number, ey: number) {
    const gradient = ctx.createLinearGradient(sx, sy, ex, ey);
    gradient.addColorStop(0, 'rgba(255, 80, 30, 0.95)');
    gradient.addColorStop(0.5, 'rgba(255, 50, 20, 0.9)');
    gradient.addColorStop(1, 'rgba(255, 30, 10, 0.85)');

    ctx.save();
    ctx.shadowColor = 'rgba(255, 60, 20, 0.7)';
    ctx.shadowBlur = 12;

    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
    ctx.strokeStyle = 'rgba(255, 200, 150, 0.5)';
    ctx.lineWidth = 1;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.restore();
  }

  private drawReflectionGlow(ctx: CanvasRenderingContext2D, x: number, y: number) {
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, 16);
    gradient.addColorStop(0, 'rgba(255, 120, 60, 0.6)');
    gradient.addColorStop(0.4, 'rgba(255, 80, 30, 0.2)');
    gradient.addColorStop(1, 'rgba(255, 60, 20, 0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, 16, 0, Math.PI * 2);
    ctx.fill();
  }

  private spawnTrailParticles(laserPath: LaserPath, dt: number) {
    this.particleSpawnAccum += dt;
    const spawnInterval = 30;

    while (this.particleSpawnAccum >= spawnInterval) {
      this.particleSpawnAccum -= spawnInterval;
      for (const seg of laserPath.segments) {
        const segLen = Math.sqrt(
          (seg.endX - seg.startX) ** 2 + (seg.endY - seg.startY) ** 2
        );
        if (segLen < 5) continue;

        const numPerSeg = Math.max(1, Math.floor(segLen / 80));
        for (let n = 0; n < numPerSeg; n++) {
          const t = Math.random();
          this.trailParticles.push({
            x: seg.startX + (seg.endX - seg.startX) * t,
            y: seg.startY + (seg.endY - seg.startY) * t,
            life: 1,
            maxLife: 0.4 + Math.random() * 0.5,
            size: 1 + Math.random() * 2.5,
          });
        }
      }
    }
  }

  private updateAndDrawTrailParticles(ctx: CanvasRenderingContext2D, dt: number) {
    const sec = dt / 1000;

    for (const p of this.trailParticles) {
      p.life -= sec / p.maxLife;
      p.y -= 8 * sec;
      p.x += (Math.random() - 0.5) * 6 * sec;
    }

    this.trailParticles = this.trailParticles.filter(p => p.life > 0);

    for (const p of this.trailParticles) {
      const alpha = p.life * 0.7;
      ctx.fillStyle = `rgba(255, ${Math.floor(100 + p.life * 80)}, ${Math.floor(30 + p.life * 30)}, ${alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawCrystalExplosion(particles: CrystalParticle[]) {
    const ctx = this.ctx;
    ctx.save();

    for (const p of particles) {
      const alpha = Math.max(0, p.life) * 0.9;
      const r = 255;
      const g = Math.floor(180 + p.life * 60);
      const b = Math.floor(20 + (1 - p.life) * 60);
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
      ctx.shadowColor = `rgba(255, 200, 50, ${alpha * 0.5})`;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * Math.max(0.2, p.life), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  clearParticles() {
    this.trailParticles = [];
    this.particleSpawnAccum = 0;
  }
}
