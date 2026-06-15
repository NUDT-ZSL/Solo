import { Particle } from './types';
import { NORDIC_COLORS } from './types';

export function createExplosionParticles(
  centerX: number,
  centerY: number,
  count: number = 50
): Particle[] {
  const particles: Particle[] = [];

  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const speed = 2 + Math.random() * 4;
    const color = NORDIC_COLORS[Math.floor(Math.random() * NORDIC_COLORS.length)].value;

    particles.push({
      id: i,
      x: centerX,
      y: centerY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color,
      life: 1,
      maxLife: 60 + Math.random() * 30,
      size: 3 + Math.random() * 5,
    });
  }

  return particles;
}

export function updateParticles(particles: Particle[]): Particle[] {
  return particles
    .map((p) => ({
      ...p,
      x: p.x + p.vx,
      y: p.y + p.vy,
      vy: p.vy + 0.05,
      life: p.life - 1 / p.maxLife,
      size: p.size * 0.98,
    }))
    .filter((p) => p.life > 0);
}
