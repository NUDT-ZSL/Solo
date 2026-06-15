export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  hue: number;
  alpha: number;
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private width: number;
  private height: number;
  private readonly PARTICLE_COUNT = 150;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.init();
  }

  private init(): void {
    this.particles = [];
    for (let i = 0; i < this.PARTICLE_COUNT; i++) {
      this.particles.push(this.createParticle());
    }
  }

  private createParticle(): Particle {
    const hue = 200 + Math.random() * 80;
    return {
      x: Math.random() * this.width,
      y: Math.random() * this.height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      size: 3 + Math.random() * 5,
      hue,
      alpha: 0.2 + Math.random() * 0.2
    };
  }

  resize(width: number, height: number): void {
    const scaleX = width / this.width;
    const scaleY = height / this.height;
    this.width = width;
    this.height = height;
    for (const p of this.particles) {
      p.x *= scaleX;
      p.y *= scaleY;
    }
  }

  update(): void {
    for (const p of this.particles) {
      p.hue += (Math.random() - 0.5) * 0.3;
      if (p.hue < 200) p.hue = 200;
      if (p.hue > 280) p.hue = 280;

      p.x += p.vx;
      p.y += p.vy;

      if (p.x < -10) p.x = this.width + 10;
      if (p.x > this.width + 10) p.x = -10;
      if (p.y < -10) p.y = this.height + 10;
      if (p.y > this.height + 10) p.y = -10;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of this.particles) {
      const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2);
      gradient.addColorStop(0, `hsla(${p.hue}, 80%, 70%, ${p.alpha})`);
      gradient.addColorStop(0.4, `hsla(${p.hue}, 80%, 60%, ${p.alpha * 0.5})`);
      gradient.addColorStop(1, `hsla(${p.hue}, 80%, 50%, 0)`);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}
