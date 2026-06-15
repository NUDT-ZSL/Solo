import { TrailParticle, EffectParticle } from '../types';

const MAX_TOTAL_PARTICLES = 200;
const MAX_TRAIL = 15;

export class ParticleSystem {
  trail: TrailParticle[] = [];
  effects: EffectParticle[] = [];
  private frameCounter = 0;

  updateTrail(seedX: number, seedY: number, dt: number): void {
    this.frameCounter++;
    for (const p of this.trail) {
      p.x += p.vx * dt * 60;
      p.y += p.vy * dt * 60;
      p.vx *= 0.92;
      p.vy *= 0.92;
      p.life -= dt;
      p.sizeJitter = 1 + Math.sin((this.frameCounter + p.colorPhase * 10) * 0.35) * 0.8;
    }
    this.trail = this.trail.filter((p) => p.life > 0);

    if (this.frameCounter % 2 === 0) {
      while (this.trail.length >= MAX_TRAIL) {
        this.trail.shift();
      }
      const particle: TrailParticle = {
        x: seedX + (Math.random() - 0.5) * 4,
        y: seedY + (Math.random() - 0.5) * 4,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        life: 0.7 + Math.random() * 0.3,
        maxLife: 1.0,
        size: 1 + Math.random() * 2,
        sizeJitter: 1,
        colorPhase: Math.random(),
      };
      this.trail.push(particle);
    }
    this.enforceLimit();
  }

  emitCrystalBurst(x: number, y: number): void {
    const count = 20;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.3;
      const speed = 1.5 + Math.random() * 3;
      const p: EffectParticle = {
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.2,
        maxLife: 1.2,
        size: 2 + Math.random() * 2.5,
        hue: Math.random() * 360,
        saturation: 90,
        lightness: 60 + Math.random() * 20,
        type: 'crystal',
      };
      this.effects.push(p);
    }
    this.enforceLimit();
  }

  emitGameOver(x: number, y: number): void {
    const count = 40;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 4;
      const p: EffectParticle = {
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.5,
        maxLife: 0.5,
        size: 2 + Math.random() * 3,
        hue: 0 + Math.random() * 15,
        saturation: 90,
        lightness: 45 + Math.random() * 20,
        type: 'gameover',
      };
      this.effects.push(p);
    }
    this.enforceLimit();
  }

  emitVictoryRain(centerX: number, centerY: number, width: number, height: number): void {
    const count = 60;
    for (let i = 0; i < count; i++) {
      const p: EffectParticle = {
        x: centerX + (Math.random() - 0.5) * width * 0.9,
        y: centerY - height * 0.5 + Math.random() * height * 0.2,
        vx: (Math.random() - 0.5) * 0.6,
        vy: 0.5 + Math.random() * 1.8,
        life: 3.0,
        maxLife: 3.0,
        size: 2 + Math.random() * 3,
        hue: 40 + Math.random() * 15,
        saturation: 95,
        lightness: 55 + Math.random() * 20,
        type: 'victory',
      };
      this.effects.push(p);
    }
    this.enforceLimit();
  }

  emitVineGlow(x: number, y: number): void {
    const count = 5;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.3 + Math.random() * 0.6;
      const p: EffectParticle = {
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.6,
        maxLife: 0.6,
        size: 1.5 + Math.random() * 2,
        hue: 95 + Math.random() * 20,
        saturation: 80,
        lightness: 70 + Math.random() * 15,
        type: 'vineGlow',
      };
      this.effects.push(p);
    }
    this.enforceLimit();
  }

  updateEffects(dt: number): void {
    for (const p of this.effects) {
      p.x += p.vx * dt * 60;
      p.y += p.vy * dt * 60;
      if (p.type === 'victory') {
        p.vy += 0.02;
      } else if (p.type === 'crystal') {
        p.vx *= 0.98;
        p.vy *= 0.98;
      } else {
        p.vx *= 0.96;
        p.vy *= 0.96;
      }
      p.life -= dt;
    }
    this.effects = this.effects.filter((p) => p.life > 0);
  }

  totalCount(): number {
    return this.trail.length + this.effects.length;
  }

  private enforceLimit(): void {
    while (this.totalCount() > MAX_TOTAL_PARTICLES) {
      if (this.effects.length > 0) {
        this.effects.shift();
      } else if (this.trail.length > 0) {
        this.trail.shift();
      } else {
        break;
      }
    }
  }

  reset(): void {
    this.trail = [];
    this.effects = [];
    this.frameCounter = 0;
  }
}
