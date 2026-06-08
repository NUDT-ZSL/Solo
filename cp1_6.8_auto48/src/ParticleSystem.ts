interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  baseAlpha: number;
  color: string;
  pulsePhase: number;
  pulseSpeed: number;
}

const PALETTE = [
  'rgba(108,92,231,',
  'rgba(162,155,254,',
  'rgba(99,110,255,',
  'rgba(72,149,239,',
  'rgba(190,120,255,',
];

export class ParticleSystem {
  private particles: Particle[] = [];
  private maxParticles: number;
  private canvas: HTMLCanvasElement | null = null;
  private dpr: number = 1;

  constructor(maxParticles: number = 60) {
    this.maxParticles = maxParticles;
  }

  init(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.particles = [];
    for (let i = 0; i < this.maxParticles; i++) {
      this.particles.push(this.createParticle(true));
    }
  }

  resize(width: number, height: number): void {
    if (!this.canvas) return;
    this.canvas.width = width * this.dpr;
    this.canvas.height = height * this.dpr;
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';
  }

  private createParticle(randomY: boolean): Particle {
    const w = this.canvas ? this.canvas.width / this.dpr : window.innerWidth;
    const h = this.canvas ? this.canvas.height / this.dpr : window.innerHeight;
    const colorBase = PALETTE[Math.floor(Math.random() * PALETTE.length)];
    const alpha = 0.15 + Math.random() * 0.35;
    return {
      x: Math.random() * w,
      y: randomY ? Math.random() * h : h + Math.random() * 40,
      vx: (Math.random() - 0.5) * 0.3,
      vy: -(0.15 + Math.random() * 0.35),
      radius: 1 + Math.random() * 2.5,
      alpha,
      baseAlpha: alpha,
      color: colorBase,
      pulsePhase: Math.random() * Math.PI * 2,
      pulseSpeed: 0.008 + Math.random() * 0.015,
    };
  }

  update(): void {
    const w = this.canvas ? this.canvas.width / this.dpr : window.innerWidth;
    const h = this.canvas ? this.canvas.height / this.dpr : window.innerHeight;

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.pulsePhase += p.pulseSpeed;
      p.alpha = p.baseAlpha * (0.6 + 0.4 * Math.sin(p.pulsePhase));

      if (p.y < -20 || p.x < -20 || p.x > w + 20) {
        this.particles[i] = this.createParticle(false);
        this.particles[i].y = h + 10;
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    const dpr = this.dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    for (const p of this.particles) {
      const r = Math.max(0.5, p.radius);
      const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 4);
      glow.addColorStop(0, p.color + p.alpha + ')');
      glow.addColorStop(0.4, p.color + (p.alpha * 0.4) + ')');
      glow.addColorStop(1, p.color + '0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = p.color + Math.min(p.alpha * 1.5, 0.9) + ')';
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  destroy(): void {
    this.particles = [];
    this.canvas = null;
  }
}
