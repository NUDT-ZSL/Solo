interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  colorStart: { r: number; g: number; b: number };
  colorEnd: { r: number; g: number; b: number };
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private maxParticles = 200;

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 255, g: 255, b: 255 };
  }

  spawnBurst(x: number, y: number, count: number = 8): void {
    const colorStart = this.hexToRgb('#f72585');
    const colorEnd = this.hexToRgb('#7209b7');

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) {
        this.particles.shift();
      }

      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3 + 1;

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 4 + 4,
        life: 1.2,
        maxLife: 1.2,
        colorStart,
        colorEnd,
      });
    }
  }

  spawnTrail(x: number, y: number, count: number = 8): void {
    const colorStart = this.hexToRgb('#f72585');
    const colorEnd = this.hexToRgb('#7209b7');

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) {
        this.particles.shift();
      }

      this.particles.push({
        x: x + (Math.random() - 0.5) * 4,
        y: y + (Math.random() - 0.5) * 4,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 4 + 4,
        life: 1.2,
        maxLife: 1.2,
        colorStart,
        colorEnd,
      });
    }
  }

  update(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= dt;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      const t = 1 - p.life / p.maxLife;
      const alpha = 1 - t;
      const r = Math.round(p.colorStart.r + (p.colorEnd.r - p.colorStart.r) * t);
      const g = Math.round(p.colorStart.g + (p.colorEnd.g - p.colorStart.g) * t);
      const b = Math.round(p.colorStart.b + (p.colorEnd.b - p.colorStart.b) * t);

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.shadowColor = `rgb(${r}, ${g}, ${b})`;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (1 - t * 0.5), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  clear(): void {
    this.particles = [];
  }

  getCount(): number {
    return this.particles.length;
  }
}
