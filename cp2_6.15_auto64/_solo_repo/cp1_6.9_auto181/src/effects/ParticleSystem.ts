import type { Particle, PulseEffect, AfterImage } from '../game/types';

export const COLORS = {
  firefly: '#F1C40F',
  lightPoint: '#FFFFFF',
  redPistil: '#E74C3C',
  greenPistil: '#27AE60',
  bluePistil: '#3498DB',
  seed: '#F9A825',
  firework: [
    '#E74C3C', '#E67E22', '#F1C40F', '#2ECC71',
    '#3498DB', '#9B59B6', '#1ABC9C',
  ],
};

const MAX_NORMAL_PARTICLES = 200;
const MAX_FIREWORK_PARTICLES = 1500;

export class ParticleSystem {
  private particles: Particle[] = [];
  private pulses: PulseEffect[] = [];
  private afterImages: AfterImage[] = [];
  private trailPool: Particle[] = [];
  private fireworkActive = false;

  public update(dt: number): void {
    this.updatePulses(dt);
    this.updateAfterImages(dt);
    this.updateParticles(dt);
  }

  public getActiveParticleCount(): number {
    return this.particles.length;
  }

  public getParticles(): Particle[] {
    return this.particles;
  }

  public getPulses(): PulseEffect[] {
    return this.pulses;
  }

  public getAfterImages(): AfterImage[] {
    return this.afterImages;
  }

  public isFireworkActive(): boolean {
    return this.fireworkActive;
  }

  private spawnTrailRaw(x: number, y: number, color: string): void {
    const maxCount = this.fireworkActive ? MAX_FIREWORK_PARTICLES : MAX_NORMAL_PARTICLES;
    if (this.particles.length >= maxCount) return;
    const angle = Math.random() * Math.PI * 2;
    const speed = 10 + Math.random() * 15;
    const size = 2 + Math.random() * 2;
    const life = 0.4 + Math.random() * 0.3;
    this.particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life, maxLife: life,
      size, initialSize: size,
      color, alpha: 1,
    });
  }

  public spawnFireflyTrail(x: number, y: number): void {
    for (let i = 0; i < 2; i++) {
      this.spawnTrailRaw(x, y, COLORS.firefly);
    }
  }

  public spawnMirrorTrail(x: number, y: number): void {
    if (Math.random() < 0.6) {
      this.spawnTrailRaw(x, y, COLORS.bluePistil);
    }
  }

  public spawnLightPointPulse(x: number, y: number): void {
    this.pulses.push({
      x, y,
      radius: 4, maxRadius: 20,
      life: 0.3, maxLife: 0.3,
      color: COLORS.lightPoint,
    });
  }

  public spawnPistilPulse(x: number, y: number, color: string): void {
    this.pulses.push({
      x, y,
      radius: 6, maxRadius: 40,
      life: 0.4, maxLife: 0.4,
      color,
    });
  }

  public spawnSeedBurst(x: number, y: number): void {
    this.pulses.push({
      x, y,
      radius: 10, maxRadius: 400,
      life: 1.2, maxLife: 1.2,
      color: '#FFFFFF',
    });
    this.pulses.push({
      x, y,
      radius: 5, maxRadius: 200,
      life: 0.8, maxLife: 0.8,
      color: COLORS.seed,
    });
  }

  public spawnFirework(cx: number, cy: number): void {
    this.fireworkActive = true;
    const total = 1200;
    const colors = COLORS.firework;
    for (let i = 0; i < total; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 180;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const size = 2 + Math.random() * 2;
      const life = 1.2 + Math.random() * 0.8;
      this.particles.push({
        x: cx + (Math.random() - 0.5) * 10,
        y: cy + (Math.random() - 0.5) * 10,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life, maxLife: life,
        size, initialSize: size,
        color,
        alpha: 1,
      });
    }
    setTimeout(() => {
      this.fireworkActive = false;
    }, 2500);
  }

  public spawnAfterImage(x: number, y: number, color: string): void {
    if (this.afterImages.length >= 8) this.afterImages.shift();
    this.afterImages.push({
      x, y, life: 0.25, maxLife: 0.25, color,
    });
  }

  public spawnDeathBurst(x: number, y: number): void {
    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 60;
      const life = 0.6 + Math.random() * 0.5;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life, maxLife: life,
        size: 2 + Math.random() * 2,
        initialSize: 3,
        color: COLORS.firefly,
        alpha: 1,
      });
    }
  }

  private updatePulses(dt: number): void {
    for (let i = this.pulses.length - 1; i >= 0; i--) {
      const p = this.pulses[i];
      p.life -= dt;
      const t = 1 - p.life / p.maxLife;
      p.radius = 4 + (p.maxRadius - 4) * t;
      if (p.life <= 0) this.pulses.splice(i, 1);
    }
  }

  private updateAfterImages(dt: number): void {
    for (let i = this.afterImages.length - 1; i >= 0; i--) {
      const a = this.afterImages[i];
      a.life -= dt;
      if (a.life <= 0) this.afterImages.splice(i, 1);
    }
  }

  private updateParticles(dt: number): void {
    const maxCount = this.fireworkActive ? MAX_FIREWORK_PARTICLES : MAX_NORMAL_PARTICLES;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.98;
      p.vy *= 0.98;
      const t = Math.max(0, p.life / p.maxLife);
      p.alpha = t;
      p.size = p.initialSize * t;
    }
    while (this.particles.length > maxCount) {
      this.particles.splice(0, 1);
    }
    void this.trailPool;
  }

  public reset(): void {
    this.particles = [];
    this.pulses = [];
    this.afterImages = [];
    this.trailPool = [];
    this.fireworkActive = false;
  }
}
