import type { Particle, Vec2 } from './types';

const MAX_PARTICLES = 500;

export class ParticleSystem {
  private particles: Particle[] = [];
  private pool: Particle[] = [];

  emitMerge(position: Vec2, color: string, count: number = 20) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 120;
      this.spawn({
        x: position.x,
        y: position.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0,
        maxLife: 0.6 + Math.random() * 0.6,
        color,
        size: 2 + Math.random() * 3,
      });
    }
  }

  emitPortal(centerX: number, centerY: number, progress: number) {
    const ringCount = 3;
    const particlesPerRing = 8;
    for (let r = 0; r < ringCount; r++) {
      const radius = 30 + progress * 150 + r * 30;
      for (let i = 0; i < particlesPerRing; i++) {
        const angle = (i / particlesPerRing) * Math.PI * 2 + progress * Math.PI * 4 + r * 0.5;
        const px = centerX + Math.cos(angle) * radius;
        const py = centerY + Math.sin(angle) * radius;
        this.spawn({
          x: px,
          y: py,
          vx: Math.cos(angle + Math.PI / 2) * 20,
          vy: Math.sin(angle + Math.PI / 2) * 20,
          life: 1.0,
          maxLife: 0.4 + Math.random() * 0.3,
          color: ['#00FFD1', '#FF00AA', '#FFD700', '#FFFFFF'][Math.floor(Math.random() * 4)],
          size: 1.5 + Math.random() * 2.5,
        });
      }
    }
  }

  private spawn(p: Particle) {
    let particle: Particle;
    if (this.pool.length > 0) {
      particle = this.pool.pop()!;
      Object.assign(particle, p);
    } else if (this.particles.length < MAX_PARTICLES) {
      particle = { ...p };
    } else {
      return;
    }
    if (!this.particles.includes(particle)) {
      this.particles.push(particle);
    }
  }

  update(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.98;
      p.vy *= 0.98;
      p.life -= dt / p.maxLife;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        if (this.pool.length < MAX_PARTICLES) {
          this.pool.push(p);
        }
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D, offsetX: number, offsetY: number) {
    for (const p of this.particles) {
      const alpha = Math.max(0, p.life);
      const sx = offsetX + p.x;
      const sy = offsetY + p.y;
      ctx.beginPath();
      ctx.arc(sx, sy, p.size * alpha, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = alpha * 0.8;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  clear() {
    this.particles.length = 0;
    this.pool.length = 0;
  }
}
