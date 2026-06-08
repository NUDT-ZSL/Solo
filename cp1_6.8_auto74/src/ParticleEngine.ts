import { MoodColor } from './types';
import {
  PARTICLE_COUNT_MIN,
  PARTICLE_COUNT_MAX,
  PARTICLE_SPEED_MIN,
  PARTICLE_SPEED_MAX,
  PARTICLE_LIFE,
  PARTICLE_DRAG,
  PARTICLE_GRAVITY,
  PARTICLE_MIN_RADIUS,
  PARTICLE_MAX_RADIUS,
} from './constants';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  life: number;
  maxLife: number;
}

export class ParticleEngine {
  particles: Particle[] = [];

  emit(x: number, y: number, color: MoodColor) {
    const count =
      PARTICLE_COUNT_MIN +
      Math.floor(Math.random() * (PARTICLE_COUNT_MAX - PARTICLE_COUNT_MIN));

    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed =
        PARTICLE_SPEED_MIN +
        Math.random() * (PARTICLE_SPEED_MAX - PARTICLE_SPEED_MIN);

      const variation = 30;
      const pr = Math.min(255, Math.max(0, r + (Math.random() - 0.5) * variation));
      const pg = Math.min(255, Math.max(0, g + (Math.random() - 0.5) * variation));
      const pb = Math.min(255, Math.max(0, b + (Math.random() - 0.5) * variation));

      const maxLife = PARTICLE_LIFE + Math.random() * 500;

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius:
          PARTICLE_MIN_RADIUS +
          Math.random() * (PARTICLE_MAX_RADIUS - PARTICLE_MIN_RADIUS),
        color: `rgb(${Math.round(pr)},${Math.round(pg)},${Math.round(pb)})`,
        life: maxLife,
        maxLife,
      });
    }
  }

  update(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      p.x += p.vx;
      p.y += p.vy;
      p.vy += PARTICLE_GRAVITY;
      p.vx *= PARTICLE_DRAG;
      p.vy *= PARTICLE_DRAG;
    }
  }

  render(ctx: CanvasRenderingContext2D) {
    for (const p of this.particles) {
      const lifeRatio = Math.max(0, p.life / p.maxLife);
      const r = p.radius * lifeRatio;
      if (r <= 0.5) continue;

      ctx.save();
      ctx.globalAlpha = lifeRatio;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}
