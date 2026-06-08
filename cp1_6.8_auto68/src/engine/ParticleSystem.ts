import { Particle, ParticleType, COLORS, GAME_CONFIG } from './types';

export class ParticleSystem {
  private particles: Particle[] = [];

  spawn(particles: Particle[]) {
    const available = GAME_CONFIG.PARTICLE_MAX - this.particles.length;
    const toAdd = particles.slice(0, Math.max(0, available));
    this.particles.push(...toAdd);
  }

  update(dt: number): Particle[] {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      p.alpha = Math.max(0, p.life / p.maxLife);
      p.rotation += p.rotationSpeed * dt;

      if (p.type === 'explosion') {
        p.vx *= 0.96;
        p.vy *= 0.96;
      } else if (p.type === 'trail') {
        p.vx *= 0.94;
        p.vy *= 0.94;
        p.size *= 0.98;
      } else if (p.type === 'shield_break') {
        p.vx *= 0.95;
        p.vy *= 0.95;
      } else if (p.type === 'pulse') {
        p.vx *= 0.92;
        p.vy *= 0.92;
      }

      if (p.life <= 0 || p.size < 0.3) {
        this.particles.splice(i, 1);
      }
    }
    return this.particles;
  }

  getParticles(): Particle[] {
    return this.particles;
  }

  clear() {
    this.particles.length = 0;
  }
}

export function createExplosionParticles(
  x: number,
  y: number,
  color: string,
  count: number,
  intensity: number = 1
): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
    const speed = (60 + Math.random() * 100) * intensity;
    particles.push({
      x: x + (Math.random() - 0.5) * 6,
      y: y + (Math.random() - 0.5) * 6,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.5 + Math.random() * 0.3,
      maxLife: 0.8,
      color,
      size: 3 + Math.random() * 3,
      type: 'explosion' as ParticleType,
      alpha: 1,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 12,
    });
  }
  return particles;
}

export function createTrailParticle(
  x: number,
  y: number,
  color: string
): Particle {
  return {
    x: x + (Math.random() - 0.5) * 6,
    y: y + (Math.random() - 0.5) * 6,
    vx: (Math.random() - 0.5) * 20,
    vy: (Math.random() - 0.5) * 20,
    life: 0.3 + Math.random() * 0.2,
    maxLife: 0.5,
    color,
    size: 2 + Math.random() * 2,
    type: 'trail' as ParticleType,
    alpha: 0.8,
    rotation: 0,
    rotationSpeed: 0,
  };
}
