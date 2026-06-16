import type { Particle, HitResult } from '@/types';
import { CONFIG } from '@/types';

export class ParticleSystem {
  private particles: Particle[] = [];
  private nextId = 0;

  spawnHitParticles(x: number, y: number, type: HitResult): void {
    const count = 8 + Math.floor(Math.random() * 5);
    const color = type === 'perfect' ? '#ffdd00' : '#ffaa00';

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 50;

      this.addParticle({
        id: `p-${this.nextId++}`,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.3,
        maxLife: 0.3,
        color,
        size: 3 + Math.random() * 3,
      });
    }
  }

  spawnFlameParticles(x: number, y: number, intensity: number): void {
    const baseCount = Math.floor(20 + intensity * 20);
    const count = Math.min(baseCount, CONFIG.MAX_PARTICLES - this.particles.length);

    for (let i = 0; i < count; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.6;
      const speed = 40 + Math.random() * 60;

      this.addParticle({
        id: `p-${this.nextId++}`,
        x: x + (Math.random() - 0.5) * 20,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.5,
        maxLife: 0.5,
        color: '#ff6600',
        size: 4 + Math.random() * 4,
      });
    }
  }

  private addParticle(particle: Particle): void {
    if (this.particles.length >= CONFIG.MAX_PARTICLES) {
      this.particles.shift();
    }
    this.particles.push(particle);
  }

  update(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;
      p.vy += 20 * deltaTime;
      p.life -= deltaTime;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  getParticles(): Particle[] {
    return this.particles;
  }

  clear(): void {
    this.particles = [];
  }
}

export const particleSystem = new ParticleSystem();
