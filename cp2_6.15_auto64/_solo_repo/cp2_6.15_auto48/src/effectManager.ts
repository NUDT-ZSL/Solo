import {
  Particle,
  ScreenFlash,
  PARTICLE_COLORS,
  PARTICLE_COUNT,
  PARTICLE_LIFE,
  HIT_FLASH_DURATION,
  HIT_FLASH_ALPHA,
  TRAIL_LENGTH,
} from './types';

export type EffectEventType = 'collect' | 'hit' | 'jump' | 'land';

export class EffectManager {
  private particles: Particle[] = [];
  private screenFlash: ScreenFlash | null = null;

  public trigger(type: EffectEventType, x: number, y: number): void {
    switch (type) {
      case 'collect':
        this.spawnBurstParticles(x, y);
        break;
      case 'hit':
        this.screenFlash = {
          color: '#ff0000',
          alpha: HIT_FLASH_ALPHA,
          duration: HIT_FLASH_DURATION,
          time: HIT_FLASH_DURATION,
        };
        break;
      case 'jump':
        this.spawnJumpParticles(x, y);
        break;
      case 'land':
        break;
    }
  }

  private spawnBurstParticles(centerX: number, centerY: number): void {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const angle = (Math.PI * 2 * i) / PARTICLE_COUNT + Math.random() * 0.5;
      const speed = 80 + Math.random() * 150;
      const color = PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)];
      this.particles.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: 4,
        life: PARTICLE_LIFE,
        maxLife: PARTICLE_LIFE,
        trail: [],
      });
    }
  }

  private spawnJumpParticles(x: number, y: number): void {
    for (let i = 0; i < 6; i++) {
      const color = PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)];
      this.particles.push({
        x: x + (Math.random() - 0.5) * 20,
        y: y,
        vx: (Math.random() - 0.5) * 60,
        vy: 50 + Math.random() * 80,
        color,
        size: 3,
        life: 0.3,
        maxLife: 0.3,
        trail: [],
      });
    }
  }

  public update(dt: number): void {
    for (const p of this.particles) {
      p.trail.unshift({ x: p.x, y: p.y });
      if (p.trail.length > TRAIL_LENGTH) {
        p.trail.pop();
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 300 * dt;
      p.life -= dt;
    }
    this.particles = this.particles.filter(p => p.life > 0);

    if (this.screenFlash) {
      this.screenFlash.time -= dt;
      if (this.screenFlash.time <= 0) {
        this.screenFlash = null;
      }
    }
  }

  public getParticles(): Particle[] {
    return this.particles;
  }

  public getScreenFlash(): ScreenFlash | null {
    return this.screenFlash;
  }

  public reset(): void {
    this.particles = [];
    this.screenFlash = null;
  }
}
