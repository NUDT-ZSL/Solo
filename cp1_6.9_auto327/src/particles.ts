import type { Particle, HSL, Point } from './types';

export class ParticleSystem {
  private particles: Particle[] = [];
  private isMobile: boolean = false;

  setMobile(mobile: boolean): void {
    this.isMobile = mobile;
  }

  emit(x: number, y: number, color: HSL, count?: number): void {
    const particleCount = count ?? (this.isMobile ? 3 : Math.floor(Math.random() * 4) + 5);
    const actualCount = this.isMobile ? Math.ceil(particleCount / 2) : particleCount;
    for (let i = 0; i < actualCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 0.8 + 0.3;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: { ...color },
        life: 500,
        maxLife: 500,
        size: Math.random() * 2 + 1,
      });
    }
  }

  update(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= deltaTime;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      const progress = 1 - p.life / p.maxLife;
      const moveFactor = 20 / p.maxLife;
      p.x += p.vx * moveFactor * deltaTime;
      p.y += p.vy * moveFactor * deltaTime;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${p.color.h}, ${p.color.s}%, ${p.color.l}%, ${alpha})`;
      ctx.fill();
    }
  }

  clear(): void {
    this.particles = [];
  }
}
