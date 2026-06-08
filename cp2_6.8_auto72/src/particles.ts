export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  type: 'food' | 'water' | 'zzz';
  opacity: number;
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private readonly MAX_PARTICLES = 20;

  update(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      p.opacity = Math.max(0, p.life / p.maxLife);

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = p.opacity;
      ctx.fillStyle = p.color;

      if (p.type === 'zzz') {
        ctx.font = `bold ${p.size}px sans-serif`;
        ctx.fillText('Z', p.x, p.y);
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  spawnFoodParticles(centerX: number, topY: number): void {
    if (this.particles.length >= this.MAX_PARTICLES) return;

    for (let i = 0; i < 8; i++) {
      if (this.particles.length >= this.MAX_PARTICLES) break;
      this.particles.push({
        x: centerX + (Math.random() - 0.5) * 40,
        y: topY - Math.random() * 20,
        vx: (Math.random() - 0.5) * 20,
        vy: 60 + Math.random() * 40,
        life: 1.5 + Math.random() * 0.5,
        maxLife: 2,
        color: '#FFD700',
        size: 3 + Math.random() * 2,
        type: 'food',
        opacity: 1
      });
    }
  }

  spawnWaterParticles(centerX: number, centerY: number): void {
    if (this.particles.length >= this.MAX_PARTICLES) return;

    for (let i = 0; i < 8; i++) {
      if (this.particles.length >= this.MAX_PARTICLES) break;
      const angle = (Math.PI * 2 * i) / 8;
      this.particles.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * 50,
        vy: Math.sin(angle) * 50 - 20,
        life: 1.2,
        maxLife: 1.2,
        color: '#00BCD4',
        size: 3 + Math.random() * 2,
        type: 'water',
        opacity: 1
      });
    }
  }

  spawnZzz(centerX: number, topY: number): void {
    if (this.particles.length >= this.MAX_PARTICLES) return;

    this.particles.push({
      x: centerX + (Math.random() - 0.5) * 20,
      y: topY,
      vx: (Math.random() - 0.5) * 10,
      vy: -25,
      life: 2,
      maxLife: 2,
      color: '#666',
      size: 14,
      type: 'zzz',
      opacity: 1
    });
  }

  clear(): void {
    this.particles = [];
  }
}
