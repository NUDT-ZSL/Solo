import type { AudioParams } from './audioProcessor';

const RING_COUNT = 30;
const MIN_RADIUS = 20;
const RADIUS_STEP = 11;
const INNER_SPEED = 0.5;
const OUTER_SPEED = 0.05;
const PARTICLE_LIMIT = 300;
const PARTICLES_PER_SEC_MIN = 30;
const PARTICLES_PER_SEC_MAX = 50;
const ACCEL_DURATION = 500;
const DECEL_DURATION = 2000;
const COLOR_BOTTOM_H = 240;
const COLOR_TOP_H = 0;
const START_COLOR = { r: 74, g: 0, b: 224 };
const END_COLOR = { r: 255, g: 77, b: 77 };

interface Ring {
  radius: number;
  baseLineWidth: number;
  baseAlpha: number;
  targetAngleSpeed: number;
  currentAngleSpeed: number;
  angle: number;
  direction: 1 | -1;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  maxSize: number;
  color: { r: number; g: number; b: number };
  alpha: number;
}

export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private centerX = 0;
  private centerY = 0;
  private canvasSize = 0;
  private scale = 1;
  private rings: Ring[] = [];
  private particles: Particle[] = [];
  private audioParams: AudioParams = {
    volume: 0,
    pitch: 0,
    cepstrum: 0,
    frequencyData: new Uint8Array(),
    timeData: new Float32Array()
  };
  private rafId: number | null = null;
  private isRunning = false;
  private isRecording = false;
  private lastParticleTime = 0;
  private animStartTime = 0;
  private animStopTime = 0;
  private currentTime = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: true, antialias: true }) as CanvasRenderingContext2D | null;
    if (!ctx) throw new Error('Failed to get canvas 2d context');
    this.ctx = ctx;
    this.initRings();
  }

  private initRings(): void {
    this.rings = [];
    for (let i = 0; i < RING_COUNT; i++) {
      const radius = MIN_RADIUS + i * RADIUS_STEP;
      const t = i / (RING_COUNT - 1);
      const speed = INNER_SPEED - t * (INNER_SPEED - OUTER_SPEED);
      this.rings.push({
        radius,
        baseLineWidth: 1,
        baseAlpha: 0.3,
        targetAngleSpeed: speed,
        currentAngleSpeed: 0,
        angle: Math.random() * Math.PI * 2,
        direction: i % 2 === 0 ? -1 : 1
      });
    }
  }

  resize(viewportWidth: number, viewportHeight: number): void {
    const size = Math.min(viewportWidth, viewportHeight);
    const margin = size * 0.04;
    this.canvasSize = size - margin * 2;
    this.scale = this.canvasSize / 800;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.floor(this.canvasSize * dpr);
    this.canvas.height = Math.floor(this.canvasSize * dpr);
    this.canvas.style.width = `${this.canvasSize}px`;
    this.canvas.style.height = `${this.canvasSize}px`;

    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.centerX = this.canvasSize / 2;
    this.centerY = this.canvasSize / 2;
  }

  updateAudioParams(params: AudioParams): void {
    this.audioParams = params;
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.animStartTime = performance.now();
    this.isRecording = true;
    this.loop();
  }

  stop(): void {
    this.isRecording = false;
    this.animStopTime = performance.now();
  }

  destroy(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.isRunning = false;
  }

  private loop = (): void => {
    if (!this.isRunning && this.particles.length === 0) {
      return;
    }

    this.rafId = requestAnimationFrame(this.loop);
    this.currentTime = performance.now();

    this.updateRings();
    this.updateParticles();
    this.generateParticles();
    this.render();
  };

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  private easeOutExpo(t: number): number {
    return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
  }

  private updateRings(): void {
    let speedFactor = 0;

    if (this.isRecording) {
      const elapsed = this.currentTime - this.animStartTime;
      speedFactor = elapsed < ACCEL_DURATION
        ? this.easeOutCubic(elapsed / ACCEL_DURATION)
        : 1;
    } else {
      const elapsed = this.currentTime - this.animStopTime;
      speedFactor = elapsed < DECEL_DURATION
        ? 1 - this.easeOutExpo(elapsed / DECEL_DURATION)
        : 0;

      if (speedFactor <= 0 && this.particles.length === 0) {
        this.isRunning = false;
        if (this.rafId !== null) {
          cancelAnimationFrame(this.rafId);
          this.rafId = null;
        }
      }
    }

    const volume = this.audioParams.volume;
    const speedMultiplier = 1 + volume * 3;

    for (let i = 0; i < this.rings.length; i++) {
      const ring = this.rings[i];
      const targetSpeed = ring.targetAngleSpeed * speedFactor * speedMultiplier;
      ring.currentAngleSpeed = ring.currentAngleSpeed * 0.9 + targetSpeed * 0.1;
      ring.angle += (ring.currentAngleSpeed * Math.PI / 180) * ring.direction;
    }
  }

  private generateParticles(): void {
    if (!this.isRecording) return;

    const volume = this.audioParams.volume;
    const baseRate = PARTICLES_PER_SEC_MIN +
      (PARTICLES_PER_SEC_MAX - PARTICLES_PER_SEC_MIN) * volume;
    const rate = volume > 0.7 ? baseRate * 3 : baseRate;
    const interval = 1000 / rate;

    if (this.currentTime - this.lastParticleTime >= interval) {
      this.lastParticleTime = this.currentTime;
      const count = volume > 0.7 ? 2 + Math.floor(Math.random() * 2) : 1;
      for (let i = 0; i < count; i++) {
        this.spawnParticle();
      }
    }

    while (this.particles.length > PARTICLE_LIMIT) {
      this.particles.shift();
    }
  }

  private spawnParticle(): void {
    const volume = this.audioParams.volume;
    const radius = MIN_RADIUS + Math.random() * (MIN_RADIUS + (RING_COUNT - 1) * RADIUS_STEP - MIN_RADIUS);
    const angle = Math.random() * Math.PI * 2;

    const normalizedRadius = (radius - MIN_RADIUS) / ((RING_COUNT - 1) * RADIUS_STEP);
    const ringIndex = Math.min(RING_COUNT - 1, Math.floor(normalizedRadius * RING_COUNT));
    const color = this.getRingColor(ringIndex, 0);

    const spreadAngle = (Math.random() - 0.5) * Math.PI / 3;
    const speed = 1 + Math.random() * 2;
    const sizeBoost = volume > 0.7 ? 2 : 1;
    const alphaBoost = volume > 0.7 ? 2 : 1;
    const maxSize = (1 + Math.random() * 2) * sizeBoost;
    const maxLife = 60 + Math.random() * 40;

    this.particles.push({
      x: this.centerX + Math.cos(angle) * radius * this.scale,
      y: this.centerY + Math.sin(angle) * radius * this.scale,
      vx: Math.cos(angle + spreadAngle) * speed,
      vy: Math.sin(angle + spreadAngle) * speed - 0.02,
      life: 0,
      maxLife,
      size: maxSize,
      maxSize,
      color,
      alpha: (0.3 + Math.random() * 0.3) * alphaBoost
    });
  }

  private updateParticles(): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life++;
      p.x += p.vx * this.scale;
      p.y += p.vy * this.scale;

      const lifeRatio = p.life / p.maxLife;
      p.size = p.maxSize * (1 - lifeRatio);
      p.alpha = Math.max(0, 0.6 * (1 - lifeRatio));

      if (p.life >= p.maxLife || p.size <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  private lerpColor(start: { r: number; g: number; b: number },
                    end: { r: number; g: number; b: number },
                    t: number): { r: number; g: number; b: number } {
    return {
      r: Math.round(start.r + (end.r - start.r) * t),
      g: Math.round(start.g + (end.g - start.g) * t),
      b: Math.round(start.b + (end.b - start.b) * t)
    };
  }

  private hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;

    if (h >= 0 && h < 60) { r = c; g = x; b = 0; }
    else if (h >= 60 && h < 120) { r = x; g = c; b = 0; }
    else if (h >= 120 && h < 180) { r = 0; g = c; b = x; }
    else if (h >= 180 && h < 240) { r = 0; g = x; b = c; }
    else if (h >= 240 && h < 300) { r = x; g = 0; b = c; }
    else if (h >= 300 && h < 360) { r = c; g = 0; b = x; }

    return {
      r: Math.round((r + m) * 255),
      g: Math.round((g + m) * 255),
      b: Math.round((b + m) * 255)
    };
  }

  private getRingColor(ringIndex: number, pitchT: number): { r: number; g: number; b: number } {
    const ringT = ringIndex / (RING_COUNT - 1);
    const combinedT = Math.max(0, Math.min(1, ringT * 0.5 + pitchT * 0.5));
    const h = COLOR_BOTTOM_H + (COLOR_TOP_H - COLOR_BOTTOM_H) * combinedT;
    return this.hslToRgb(h, 0.85, 0.55);
  }

  private render(): void {
    const ctx = this.ctx;
    const size = this.canvasSize;

    ctx.clearRect(0, 0, size, size);

    const grad = ctx.createRadialGradient(
      this.centerX, this.centerY, 0,
      this.centerX, this.centerY, size * 0.5
    );
    grad.addColorStop(0, 'rgba(26, 26, 46, 0.95)');
    grad.addColorStop(0.7, 'rgba(18, 18, 18, 0.95)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0.95)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    const volume = this.audioParams.volume;
    const pitch = this.audioParams.pitch;
    const pitchT = pitch > 0 ? Math.min(1, Math.max(0, (pitch - 80) / (8000 - 80))) : 0.3;

    this.drawRings(ctx, volume, pitchT);
    this.drawParticles(ctx);
    this.drawCore(ctx, volume, pitchT);
  }

  private drawRings(ctx: CanvasRenderingContext2D, volume: number, pitchT: number): void {
    for (let i = 0; i < this.rings.length; i++) {
      const ring = this.rings[i];
      const radius = ring.radius * this.scale;
      const lineWidth = (ring.baseLineWidth + volume * 7) * this.scale;
      const alpha = ring.baseAlpha + volume * 0.7;
      const color = this.getRingColor(i, pitchT);

      ctx.save();
      ctx.translate(this.centerX, this.centerY);
      ctx.rotate(ring.angle);

      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';

      ctx.shadowColor = `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha * 0.6})`;
      ctx.shadowBlur = 8 * this.scale;

      ctx.stroke();

      const dashCount = 3 + i;
      const circumference = 2 * Math.PI * radius;
      const dashLength = circumference / (dashCount * 2);
      ctx.setLineDash([dashLength, dashLength]);
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha * 0.3})`;
      ctx.lineWidth = Math.max(0.5, lineWidth * 0.4);
      ctx.shadowBlur = 4 * this.scale;
      ctx.stroke();

      ctx.restore();
    }
  }

  private drawParticles(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      if (p.size <= 0 || p.alpha <= 0) continue;

      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.5, p.size * this.scale), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${p.alpha})`;
      ctx.shadowColor = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${p.alpha * 0.8})`;
      ctx.shadowBlur = 6 * this.scale;
      ctx.fill();
    }
  }

  private drawCore(ctx: CanvasRenderingContext2D, volume: number, pitchT: number): void {
    const coreR = 12 * this.scale;
    const pulseR = coreR + volume * 15 * this.scale;
    const color = this.lerpColor(START_COLOR, END_COLOR, pitchT);

    const glowGrad = ctx.createRadialGradient(
      this.centerX, this.centerY, 0,
      this.centerX, this.centerY, pulseR * 3
    );
    glowGrad.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${0.4 + volume * 0.3})`);
    glowGrad.addColorStop(0.5, `rgba(${color.r}, ${color.g}, ${color.b}, ${0.1 + volume * 0.1})`);
    glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.beginPath();
    ctx.arc(this.centerX, this.centerY, pulseR * 3, 0, Math.PI * 2);
    ctx.fillStyle = glowGrad;
    ctx.fill();

    const coreGrad = ctx.createRadialGradient(
      this.centerX, this.centerY, 0,
      this.centerX, this.centerY, pulseR
    );
    coreGrad.addColorStop(0, `rgba(255, 255, 255, ${0.8 + volume * 0.2})`);
    coreGrad.addColorStop(0.3, `rgba(${color.r}, ${color.g}, ${color.b}, 0.9)`);
    coreGrad.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0.2)`);

    ctx.beginPath();
    ctx.arc(this.centerX, this.centerY, pulseR, 0, Math.PI * 2);
    ctx.fillStyle = coreGrad;
    ctx.shadowColor = `rgba(${color.r}, ${color.g}, ${color.b}, 0.8)`;
    ctx.shadowBlur = 20 * this.scale;
    ctx.fill();
  }
}
