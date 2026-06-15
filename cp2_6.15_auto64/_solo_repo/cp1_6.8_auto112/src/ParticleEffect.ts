export type ParticleKind = 'feather' | 'dried-flower';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  scale: number;
  opacity: number;
  kind: ParticleKind;
  width: number;
  height: number;
  swayPhase: number;
  swayAmplitude: number;
  life: number;
  maxLife: number;
  color: string;
}

const FEATHER_COLORS = [
  '#f5f0e8',
  '#e8dcc8',
  '#d4c5a9',
  '#c9b896',
  '#bfae8a',
];

const FLOWER_COLORS = [
  '#c47a6c',
  '#b85c4f',
  '#d4956a',
  '#a67c52',
  '#c98472',
  '#8b6b4e',
];

const TARGET_PARTICLE_COUNT = 30;
const MIN_PARTICLE_COUNT = 15;
const FPS_THRESHOLD_LOW = 45;
const FPS_THRESHOLD_HIGH = 55;

export class ParticleEffect {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private particles: Particle[] = [];
  private animationFrameId: number | null = null;
  private lastTime = 0;
  private fpsHistory: number[] = [];
  private currentTarget = TARGET_PARTICLE_COUNT;
  private width = 0;
  private height = 0;
  private isRunning = false;

  attach(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.updateSize();
    this.start();
  }

  detach(): void {
    this.stop();
    this.canvas = null;
    this.ctx = null;
  }

  private updateSize(): void {
    if (!this.canvas) return;
    const rect = this.canvas.parentElement?.getBoundingClientRect();
    if (rect) {
      this.width = rect.width;
      this.height = rect.height;
      this.canvas.width = rect.width * window.devicePixelRatio;
      this.canvas.height = rect.height * window.devicePixelRatio;
      this.canvas.style.width = rect.width + 'px';
      this.canvas.style.height = rect.height + 'px';
      this.ctx?.scale(window.devicePixelRatio, window.devicePixelRatio);
    }
  }

  resize(): void {
    if (!this.ctx) return;
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.updateSize();
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.animate(this.lastTime);
  }

  stop(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private animate(timestamp: number): void {
    if (!this.isRunning || !this.ctx) return;

    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
    this.lastTime = timestamp;

    if (dt > 0) {
      const fps = 1 / dt;
      this.fpsHistory.push(fps);
      if (this.fpsHistory.length > 60) this.fpsHistory.shift();
      this.adjustParticleCount();
    }

    this.update(dt);
    this.render();

    this.animationFrameId = requestAnimationFrame((t) => this.animate(t));
  }

  private adjustParticleCount(): void {
    if (this.fpsHistory.length < 30) return;
    const avgFps = this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length;
    if (avgFps < FPS_THRESHOLD_LOW && this.currentTarget > MIN_PARTICLE_COUNT) {
      this.currentTarget = Math.max(MIN_PARTICLE_COUNT, this.currentTarget - 2);
    } else if (avgFps > FPS_THRESHOLD_HIGH && this.currentTarget < TARGET_PARTICLE_COUNT) {
      this.currentTarget = Math.min(TARGET_PARTICLE_COUNT, this.currentTarget + 1);
    }
  }

  private createParticle(startFromTop = false): Particle {
    const kind: ParticleKind = Math.random() > 0.5 ? 'feather' : 'dried-flower';
    const isFeather = kind === 'feather';
    const maxLife = 8 + Math.random() * 6;

    return {
      x: Math.random() * this.width,
      y: startFromTop ? -30 : Math.random() * this.height,
      vx: (Math.random() - 0.5) * 15,
      vy: 15 + Math.random() * 25,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 1.5,
      scale: 0.5 + Math.random() * 0.7,
      opacity: 0.6 + Math.random() * 0.4,
      kind,
      width: isFeather ? 8 + Math.random() * 6 : 6 + Math.random() * 5,
      height: isFeather ? 20 + Math.random() * 14 : 6 + Math.random() * 5,
      swayPhase: Math.random() * Math.PI * 2,
      swayAmplitude: 10 + Math.random() * 20,
      life: 0,
      maxLife,
      color: isFeather
        ? FEATHER_COLORS[Math.floor(Math.random() * FEATHER_COLORS.length)]
        : FLOWER_COLORS[Math.floor(Math.random() * FLOWER_COLORS.length)],
    };
  }

  private update(dt: number): void {
    while (this.particles.length < this.currentTarget) {
      this.particles.push(this.createParticle(this.particles.length > 5));
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;

      p.swayPhase += dt * 0.8;
      const sway = Math.sin(p.swayPhase) * p.swayAmplitude * dt;

      p.x += (p.vx + sway) * dt;
      p.y += p.vy * dt;
      p.rotation += p.rotationSpeed * dt;

      const lifeRatio = p.life / p.maxLife;
      if (lifeRatio > 0.7) {
        p.opacity = Math.max(0, (1 - (lifeRatio - 0.7) / 0.3) * 0.8);
      }

      if (p.life >= p.maxLife || p.y > this.height + 50 || p.x < -50 || p.x > this.width + 50) {
        this.particles[i] = this.createParticle(true);
      }
    }
  }

  private render(): void {
    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, this.width, this.height);

    for (const p of this.particles) {
      this.ctx!.save();
      this.ctx!.globalAlpha = p.opacity;
      this.ctx!.translate(p.x, p.y);
      this.ctx!.rotate(p.rotation);
      this.ctx!.scale(p.scale, p.scale);

      if (p.kind === 'feather') {
        this.drawFeather(p);
      } else {
        this.drawFlower(p);
      }

      this.ctx!.restore();
    }
  }

  private drawFeather(p: Particle): void {
    const ctx = this.ctx!;
    const w = p.width;
    const h = p.height;

    ctx.beginPath();
    ctx.moveTo(0, -h / 2);
    ctx.bezierCurveTo(w * 0.8, -h * 0.3, w * 0.6, h * 0.1, 0, h / 2);
    ctx.bezierCurveTo(-w * 0.6, h * 0.1, -w * 0.8, -h * 0.3, 0, -h / 2);
    ctx.fillStyle = p.color;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(0, -h / 2);
    ctx.lineTo(0, h / 2);
    ctx.strokeStyle = 'rgba(139,109,63,0.3)';
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }

  private drawFlower(p: Particle): void {
    const ctx = this.ctx!;
    const r = p.width / 2;
    const petals = 5;

    for (let i = 0; i < petals; i++) {
      const angle = (i / petals) * Math.PI * 2;
      ctx.save();
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.ellipse(0, -r * 0.8, r * 0.4, r * 0.8, 0, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
      ctx.restore();
    }

    ctx.beginPath();
    ctx.arc(0, 0, r * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = '#8b6b4e';
    ctx.fill();
  }

  reset(): void {
    this.particles = [];
    this.fpsHistory = [];
    this.currentTarget = TARGET_PARTICLE_COUNT;
  }
}
