import type { Particle } from './types';
import { MAX_PARTICLES } from './types';

export function createDeathParticles(x: number, y: number, color: string, count: number): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 3;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 600 + Math.random() * 400,
      maxLife: 1000,
      color,
      size: 2 + Math.random() * 4,
      type: 'death',
    });
  }
  return particles;
}

export function createUpgradeParticles(x: number, y: number): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < 12; i++) {
    const angle = (Math.PI * 2 * i) / 12;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * 1.5,
      vy: Math.sin(angle) * 1.5 - 1,
      life: 800,
      maxLife: 800,
      color: '#F4D03F',
      size: 3,
      type: 'upgrade',
    });
  }
  return particles;
}

export function updateParticles(particles: Particle[], dt: number): Particle[] {
  const updated = particles
    .map((p) => ({
      ...p,
      x: p.x + p.vx * dt * 0.06,
      y: p.y + p.vy * dt * 0.06,
      vy: p.vy + (p.type === 'upgrade' ? -0.02 : 0.01) * dt * 0.06,
      life: p.life - dt,
      size: p.size * (1 - dt * 0.0005),
    }))
    .filter((p) => p.life > 0 && p.size > 0.5);

  if (updated.length > MAX_PARTICLES) {
    return updated.slice(updated.length - MAX_PARTICLES);
  }
  return updated;
}

export function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
  for (const p of particles) {
    const alpha = Math.max(0, p.life / p.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
