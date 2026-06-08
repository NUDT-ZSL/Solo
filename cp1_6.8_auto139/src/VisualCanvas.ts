import { IllustrationParams } from './PoemEngine';

export class VisualCanvas {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private params: IllustrationParams;
  private particles: Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    opacity: number;
    angle: number;
  }>;
  private animationId: number | null;
  private time: number;
  private flashOpacity: number;
  private width: number;
  private height: number;
  private dpr: number;

  constructor(canvas: HTMLCanvasElement, params: IllustrationParams) {
    this.canvas = canvas;
    this.params = params;
    this.dpr = window.devicePixelRatio || 1;
    this.width = canvas.clientWidth;
    this.height = canvas.clientHeight;
    canvas.width = this.width * this.dpr;
    canvas.height = this.height * this.dpr;
    this.ctx = canvas.getContext('2d')!;
    this.ctx.scale(this.dpr, this.dpr);
    this.particles = [];
    this.animationId = null;
    this.time = 0;
    this.flashOpacity = 0;
    this.init();
  }

  init(): void {
    this.particles = [];
    for (let i = 0; i < this.params.particleCount; i++) {
      this.particles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        vx: (Math.random() * 2 - 1) * this.params.particleSpeed,
        vy: 0.2 + Math.random() * (this.params.particleSpeed - 0.2),
        size:
          this.params.particleSize * 0.5 +
          Math.random() * this.params.particleSize,
        opacity: 0.3 + Math.random() * 0.5,
        angle: Math.random() * Math.PI * 2,
      });
    }
  }

  start(): void {
    this.animate();
  }

  stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  destroy(): void {
    this.stop();
  }

  triggerFlash(): void {
    this.flashOpacity = 1.0;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.canvas.width = width * this.dpr;
    this.canvas.height = height * this.dpr;
    this.ctx.scale(this.dpr, this.dpr);
    this.init();
  }

  updateParams(params: IllustrationParams): void {
    this.params = params;
    this.init();
  }

  private animate(): void {
    this.time += 0.016;
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.drawGradient();
    this.drawWaves();
    this.drawParticles();
    this.drawFlash();
    this.animationId = requestAnimationFrame(() => this.animate());
  }

  private drawGradient(): void {
    const gradient = this.ctx.createLinearGradient(
      0,
      0,
      0,
      this.height
    );
    const colors = this.params.gradientColors;
    for (let i = 0; i < colors.length; i++) {
      gradient.addColorStop(i / (colors.length - 1), colors[i]);
    }
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  private drawWaves(): void {
    for (let waveIndex = 0; waveIndex < 3; waveIndex++) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, this.height);
      for (let x = 0; x <= this.width; x++) {
        const y =
          this.height * 0.6 +
          Math.sin(
            x * this.params.waveFrequency +
              this.time * 2 +
              waveIndex * 1.5
          ) *
            this.params.waveAmplitude *
            30;
        this.ctx.lineTo(x, y);
      }
      this.ctx.strokeStyle = `rgba(255, 255, 255, ${0.3 - waveIndex * 0.08})`;
      this.ctx.lineWidth = 1.5;
      this.ctx.stroke();
    }
  }

  private drawParticles(): void {
    for (const particle of this.particles) {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.angle += 0.01;

      if (particle.y > this.height) {
        particle.y = -10;
      }
      if (particle.x < 0) {
        particle.x = this.width;
      }
      if (particle.x > this.width) {
        particle.x = 0;
      }

      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(255, 255, 255, ${particle.opacity})`;
      this.ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
      this.ctx.shadowBlur = particle.size * 2;
      this.ctx.fill();
      this.ctx.shadowBlur = 0;
    }
  }

  private drawFlash(): void {
    if (this.flashOpacity > 0) {
      this.ctx.fillStyle = `rgba(255, 255, 255, ${this.flashOpacity})`;
      this.ctx.fillRect(0, 0, this.width, this.height);
      this.flashOpacity = Math.max(0, this.flashOpacity - 0.02);
    }
  }
}
