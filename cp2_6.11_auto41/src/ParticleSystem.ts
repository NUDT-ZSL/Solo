interface Particle {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  color: string;
  opacity: number;
  returning: boolean;
}

interface MouseState {
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  velocity: number;
  isInScroll: boolean;
}

const PARTICLE_COLORS = ['#D4AF37', '#E5C158', '#C58B3C', '#D9A04A', '#CC9940'];
const MAX_PARTICLES = 50;

export class ParticleSystem {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private mouse: MouseState = {
    x: 0, y: 0, prevX: 0, prevY: 0, velocity: 0, isInScroll: false
  };
  private canvasWidth = 0;
  private canvasHeight = 0;
  private scrollProgress = 0;
  private emitAccumulator = 0;
  private burstParticles = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    this.ctx = ctx;
    this.resize();
  }

  resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.canvasWidth = rect.width;
    this.canvasHeight = rect.height;
  }

  setScrollProgress(progress: number): void {
    this.scrollProgress = Math.max(0, Math.min(1, progress));
  }

  setMouseInScroll(isIn: boolean): void {
    this.mouse.isInScroll = isIn;
  }

  updateMouse(x: number, y: number): void {
    const dx = x - this.mouse.x;
    const dy = y - this.mouse.y;
    this.mouse.prevX = this.mouse.x;
    this.mouse.prevY = this.mouse.y;
    this.mouse.x = x;
    this.mouse.y = y;
    this.mouse.velocity = Math.sqrt(dx * dx + dy * dy);
  }

  triggerBurst(x: number, y: number): void {
    this.burstParticles = 40;
    this.mouse.x = x;
    this.mouse.y = y;
  }

  update(dt: number): void {
    const revealW = this.canvasWidth * this.scrollProgress;

    if (this.burstParticles > 0) {
      const spawn = Math.min(this.burstParticles, 5);
      for (let i = 0; i < spawn; i++) {
        if (this.particles.length >= MAX_PARTICLES) break;
        this.particles.push(this.createBurstParticle(this.mouse.x, this.mouse.y));
      }
      this.burstParticles -= spawn;
    }

    if (this.mouse.isInScroll && this.scrollProgress > 0.1) {
      this.emitAccumulator += dt * 20;
      while (this.emitAccumulator >= 1 && this.particles.length < MAX_PARTICLES) {
        this.emitAccumulator -= 1;
        this.particles.push(this.createAmbientParticle(revealW));
      }
    }

    const attraction = this.mouse.isInScroll ? 0.3 : 0;
    const velocityOffset = this.mouse.velocity * attraction;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      if (this.mouse.isInScroll) {
        const dx = this.mouse.x - p.x;
        const dy = this.mouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120 && dist > 0.1) {
          const force = (1 - dist / 120) * velocityOffset * 0.02;
          p.vx += (dx / dist) * force;
          p.vy += (dy / dist) * force * 0.5;
        }
      }

      if (p.returning) {
        p.vx += (p.baseX - p.x) * 0.04;
        p.vy += (p.baseY - p.y) * 0.04;
      }

      p.vy += 2 * dt;
      p.vx *= 0.96;
      p.vy *= 0.96;
      p.x += p.vx;
      p.y += p.vy;

      p.life -= dt / p.maxLife;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      p.opacity = Math.max(0, Math.min(1, p.life)) * 0.85;

      if (p.x < -50 || p.x > this.canvasWidth + 50 || p.y > this.canvasHeight + 50) {
        this.particles.splice(i, 1);
      }
    }
  }

  render(): void {
    const ctx = this.ctx;
    const revealW = this.canvasWidth * this.scrollProgress;

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, revealW, this.canvasHeight);
    ctx.clip();

    for (const p of this.particles) {
      ctx.globalAlpha = p.opacity;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = p.opacity * 0.3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 2.2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  private createAmbientParticle(revealWidth: number): Particle {
    const x = Math.random() * Math.max(10, revealWidth - 10);
    const y = Math.random() * this.canvasHeight * 0.9;
    const maxLife = 5 + Math.random() * 3;
    return {
      x, y,
      baseX: x, baseY: y,
      vx: (Math.random() - 0.5) * 0.4,
      vy: -0.2 + Math.random() * 0.4,
      size: 0.8 + Math.random() * 2.2,
      life: 1,
      maxLife,
      color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
      opacity: 0,
      returning: true
    };
  }

  private createBurstParticle(cx: number, cy: number): Particle {
    const angle = Math.random() * Math.PI * 2;
    const speed = 80 + Math.random() * 160;
    const x = cx;
    const y = cy;
    const maxLife = 2 + Math.random() * 2;
    return {
      x, y,
      baseX: cx + (Math.random() - 0.5) * 40,
      baseY: cy + (Math.random() - 0.5) * 40,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 1 + Math.random() * 2.5,
      life: 1,
      maxLife,
      color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
      opacity: 0,
      returning: true
    };
  }
}
