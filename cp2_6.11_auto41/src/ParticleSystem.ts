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
  phase: 'emerge' | 'idle' | 'returning' | 'fading';
  fadeSpeed: number;
}

interface MouseState {
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  velocity: number;
  isInScroll: boolean;
  enteredAt: number;
}

const PARTICLE_COLORS = ['#D4AF37', '#E5C158', '#C58B3C', '#D9A04A', '#CC9940', '#E6C666'];
const DEFAULT_MAX_PARTICLES = 50;

export class ParticleSystem {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private mouse: MouseState = {
    x: 0, y: 0, prevX: 0, prevY: 0, velocity: 0,
    isInScroll: false, enteredAt: 0
  };
  private canvasWidth = 0;
  private canvasHeight = 0;
  private scrollProgress = 0;
  private emitAccumulator = 0;
  private burstPending = 0;
  private burstOriginX = 0;
  private burstOriginY = 0;
  private maxParticles = DEFAULT_MAX_PARTICLES;

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

  setMaxParticles(count: number): void {
    this.maxParticles = Math.max(15, Math.min(DEFAULT_MAX_PARTICLES, count));
  }

  setMouseInScroll(isIn: boolean): void {
    if (isIn && !this.mouse.isInScroll) {
      this.mouse.enteredAt = performance.now();
    }
    if (!isIn && this.mouse.isInScroll) {
      for (const p of this.particles) {
        if (p.phase === 'idle' || p.phase === 'emerge') {
          p.phase = 'returning';
        }
      }
    }
    this.mouse.isInScroll = isIn;
  }

  updateMouse(x: number, y: number): void {
    this.mouse.prevX = this.mouse.x;
    this.mouse.prevY = this.mouse.y;
    this.mouse.x = x;
    this.mouse.y = y;

    const dx = this.mouse.x - this.mouse.prevX;
    const dy = this.mouse.y - this.mouse.prevY;
    this.mouse.velocity = Math.sqrt(dx * dx + dy * dy);
  }

  triggerBurst(x: number, y: number): void {
    this.burstPending = 45;
    this.burstOriginX = x;
    this.burstOriginY = y;
  }

  update(dt: number): void {
    if (dt <= 0) dt = 1 / 60;
    const revealW = Math.max(0, this.canvasWidth * this.scrollProgress);
    const revealH = this.canvasHeight;

    if (this.burstPending > 0) {
      const spawn = Math.min(this.burstPending, 6);
      for (let i = 0; i < spawn; i++) {
        if (this.particles.length >= this.maxParticles) break;
        this.particles.push(this.createBurstParticle(this.burstOriginX, this.burstOriginY));
      }
      this.burstPending -= spawn;
    }

    if (this.mouse.isInScroll && this.scrollProgress > 0.08 && revealW > 20) {
      this.emitAccumulator += dt * 18;
      while (this.emitAccumulator >= 1 && this.particles.length < this.maxParticles) {
        this.emitAccumulator -= 1;
        this.particles.push(this.createAmbientParticle(revealW, revealH));
      }
    }

    const mouseVel = this.mouse.velocity;
    const pushStrength = mouseVel * 0.3;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      if (this.mouse.isInScroll && (p.phase === 'idle' || p.phase === 'emerge')) {
        const dx = p.x - this.mouse.x;
        const dy = p.y - this.mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const influenceRadius = 140;

        if (dist < influenceRadius && dist > 0.1) {
          const falloff = 1 - dist / influenceRadius;
          const force = pushStrength * falloff * 0.6;
          p.vx += (dx / dist) * force;
          p.vy += (dy / dist) * force * 0.5;
        }
      }

      if (p.phase === 'returning') {
        const dx = p.baseX - p.x;
        const dy = p.baseY - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 2) {
          p.phase = 'fading';
          p.fadeSpeed = 1.5;
        } else {
          p.vx += dx * 0.08;
          p.vy += dy * 0.08;
        }
      }

      if (p.phase === 'fading') {
        p.life -= dt * p.fadeSpeed;
      } else if (p.phase !== 'returning') {
        p.life -= dt / p.maxLife;
      }

      p.vy += 4 * dt;
      p.vx *= 0.94;
      p.vy *= 0.94;
      p.x += p.vx;
      p.y += p.vy;

      if (p.phase === 'emerge') {
        p.opacity = Math.min(1, p.opacity + dt * 4);
        if (p.opacity >= 0.95) {
          p.phase = 'idle';
          p.opacity = 1;
        }
      } else if (p.phase === 'fading') {
        p.opacity = Math.max(0, p.opacity - dt * 2);
      } else {
        const targetOpacity = 0.7 + Math.sin((performance.now() / 1000 + p.x * 0.01)) * 0.15;
        p.opacity += (targetOpacity - p.opacity) * 0.05;
      }

      if (p.life <= 0 || p.opacity <= 0.01 ||
          p.x < -80 || p.x > this.canvasWidth + 80 ||
          p.y > this.canvasHeight + 80) {
        this.particles.splice(i, 1);
      }
    }
  }

  render(): void {
    const ctx = this.ctx;
    const revealW = this.canvasWidth * this.scrollProgress;

    if (revealW <= 2) return;

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, revealW, this.canvasHeight);
    ctx.clip();

    for (const p of this.particles) {
      const alpha = Math.max(0, Math.min(1, p.opacity * p.life));
      if (alpha <= 0.02) continue;

      ctx.globalAlpha = alpha * 0.3;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 2.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  private createAmbientParticle(revealW: number, revealH: number): Particle {
    const x = 10 + Math.random() * Math.max(10, revealW - 20);
    const y = 10 + Math.random() * (revealH - 20);
    const maxLife = 5 + Math.random() * 3;
    return {
      x, y,
      baseX: x, baseY: y,
      vx: (Math.random() - 0.5) * 0.3,
      vy: -0.3 + Math.random() * 0.4,
      size: 0.8 + Math.random() * 2.4,
      life: 1,
      maxLife,
      color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
      opacity: 0,
      phase: 'emerge',
      fadeSpeed: 1
    };
  }

  private createBurstParticle(cx: number, cy: number): Particle {
    const angle = Math.random() * Math.PI * 2;
    const speed = 120 + Math.random() * 200;
    const maxLife = 1.8 + Math.random() * 2;
    return {
      x: cx, y: cy,
      baseX: cx + (Math.random() - 0.5) * 50,
      baseY: cy + (Math.random() - 0.5) * 50,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 1.2 + Math.random() * 2.8,
      life: 1,
      maxLife,
      color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
      opacity: 1,
      phase: 'returning',
      fadeSpeed: 0.6
    };
  }
}
