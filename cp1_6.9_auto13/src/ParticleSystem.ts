export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  radius: number;
  color: string;
  alpha: number;
  type: 'trail' | 'burst' | 'wave';
  startRadius?: number;
  endRadius?: number;
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private maxParticles: number = 200;

  addTrail(x: number, y: number, color: string): void {
    if (this.particles.length >= this.maxParticles) return;
    this.particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 10,
      vy: (Math.random() - 0.5) * 10,
      life: 0.4,
      maxLife: 0.4,
      radius: 4 + Math.random() * 3,
      color,
      alpha: 0.6,
      type: 'trail'
    });
  }

  addBurst(centerX: number, centerY: number, count: number = 12, colors?: string[]): void {
    const palette = colors || ['#FF6B6B', '#FFB347', '#FFD93D', '#6BCB77', '#4D96FF', '#9B59B6'];
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.2;
      const speed = 80 + Math.random() * 60;
      this.particles.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.5,
        maxLife: 0.5,
        radius: 3 + Math.random() * 2,
        color: palette[Math.floor(Math.random() * palette.length)],
        alpha: 1,
        type: 'burst'
      });
    }
  }

  addWave(centerX: number, centerY: number, color: string): void {
    if (this.particles.length >= this.maxParticles) return;
    this.particles.push({
      x: centerX,
      y: centerY,
      vx: 0,
      vy: 0,
      life: 0.4,
      maxLife: 0.4,
      radius: 0,
      startRadius: 20,
      endRadius: 80,
      color,
      alpha: 0.8,
      type: 'wave'
    });
  }

  update(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      const t = p.life / p.maxLife;
      p.alpha = t;
      if (p.type === 'trail') {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.92;
        p.vy *= 0.92;
      } else if (p.type === 'burst') {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.96;
        p.vy *= 0.96;
      } else if (p.type === 'wave') {
        const progress = 1 - t;
        const sr = p.startRadius || 20;
        const er = p.endRadius || 80;
        p.radius = sr + (er - sr) * progress;
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      if (p.type === 'wave') {
        ctx.save();
        ctx.strokeStyle = p.color;
        ctx.globalAlpha = p.alpha * 0.8;
        ctx.lineWidth = 3;
        ctx.shadowBlur = 15;
        ctx.shadowColor = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      } else {
        ctx.save();
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.shadowBlur = 8;
        ctx.shadowColor = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * (p.type === 'trail' ? p.life / p.maxLife * 0.5 + 0.5 : 1), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  clear(): void {
    this.particles = [];
  }

  getCount(): number {
    return this.particles.length;
  }
}
