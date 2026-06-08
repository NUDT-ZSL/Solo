import type { FocalLengthType, ThemeType } from './StarGalleryEngine';

interface TrailPoint {
  angle: number;
  radius: number;
  speed: number;
  opacity: number;
  hue: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  hue: number;
  size: number;
}

const WARM_HUES = [15, 30, 45, 50];
const COOL_HUES = [195, 210, 240, 270];

function getRotationSpeed(focalLength: FocalLengthType, isHovered: boolean): number {
  const base: Record<FocalLengthType, number> = {
    wide: 0.0004,
    standard: 0.0007,
    telephoto: 0.0012,
  };
  return base[focalLength] * (isHovered ? 4 : 1);
}

function getTrailCount(exposureTime: number): number {
  return Math.min(Math.max(Math.floor(exposureTime / 60), 8), 40);
}

function getTrailArc(exposureTime: number): number {
  return Math.min((exposureTime / 1800) * Math.PI * 0.8, Math.PI * 0.8);
}

export class StarTrailRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private trails: TrailPoint[] = [];
  private particles: Particle[] = [];
  private animationId: number = 0;
  private isActive = false;
  private isHovered = false;
  private isExploding = false;
  private globalAngle = 0;
  private focalLength: FocalLengthType = 'wide';
  private theme: ThemeType = 'cool';
  private exposureTime = 600;
  private width = 0;
  private height = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get 2d context');
    this.ctx = ctx;
  }

  configure(focalLength: FocalLengthType, theme: ThemeType, exposureTime: number) {
    this.focalLength = focalLength;
    this.theme = theme;
    this.exposureTime = exposureTime;
    this.generateTrails();
  }

  resize(width: number, height: number) {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.width = width;
    this.height = height;
    this.generateTrails();
  }

  setHovered(v: boolean) {
    this.isHovered = v;
  }

  triggerExplosion() {
    this.isExploding = true;
    this.particles = [];
    const cx = this.width / 2;
    const cy = this.height / 2;
    const hues = this.theme === 'warm' ? WARM_HUES : COOL_HUES;
    for (let i = 0; i < 60; i++) {
      const angle = (Math.PI * 2 * i) / 60 + Math.random() * 0.3;
      const speed = 1.5 + Math.random() * 3;
      this.particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: 0.6 + Math.random() * 0.5,
        hue: hues[Math.floor(Math.random() * hues.length)],
        size: 1.5 + Math.random() * 2.5,
      });
    }
  }

  start() {
    if (this.isActive) return;
    this.isActive = true;
    this.loop();
  }

  stop() {
    this.isActive = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = 0;
    }
  }

  private generateTrails() {
    this.trails = [];
    const count = getTrailCount(this.exposureTime);
    const hues = this.theme === 'warm' ? WARM_HUES : COOL_HUES;
    const minDim = Math.min(this.width, this.height);
    for (let i = 0; i < count; i++) {
      const minR = minDim * 0.08;
      const maxR = minDim * 0.42;
      this.trails.push({
        angle: Math.random() * Math.PI * 2,
        radius: minR + Math.random() * (maxR - minR),
        speed: 0.3 + Math.random() * 0.7,
        opacity: 0.3 + Math.random() * 0.5,
        hue: hues[Math.floor(Math.random() * hues.length)],
      });
    }
  }

  private loop = () => {
    if (!this.isActive) return;
    this.update();
    this.draw();
    this.animationId = requestAnimationFrame(this.loop);
  };

  private update() {
    const speed = getRotationSpeed(this.focalLength, this.isHovered);
    this.globalAngle += speed;
    if (this.isExploding) {
      let allDead = true;
      for (const p of this.particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.98;
        p.vy *= 0.98;
        p.life -= 1 / (60 * p.maxLife);
        if (p.life > 0) allDead = false;
      }
      if (allDead) {
        this.isExploding = false;
        this.particles = [];
      }
    }
  }

  private draw() {
    const { ctx, width, height } = this;
    ctx.clearRect(0, 0, width, height);
    const cx = width / 2;
    const cy = height / 2;
    const arcLength = getTrailArc(this.exposureTime);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    for (const trail of this.trails) {
      const startAngle = this.globalAngle * trail.speed + trail.angle;
      const endAngle = startAngle + arcLength;

      const gradient = ctx.createConicGradient(startAngle, cx, cy);
      const baseColor = `hsla(${trail.hue}, 100%, 70%, ${trail.opacity})`;
      const fadeColor = `hsla(${trail.hue}, 100%, 70%, 0)`;
      gradient.addColorStop(0, fadeColor);
      gradient.addColorStop(0.3, baseColor);
      gradient.addColorStop(0.7, baseColor);
      gradient.addColorStop(1, fadeColor);

      ctx.beginPath();
      ctx.arc(cx, cy, trail.radius, startAngle, endAngle);
      ctx.strokeStyle = `hsla(${trail.hue}, 100%, 70%, ${trail.opacity})`;
      ctx.lineWidth = 1.5;
      ctx.shadowColor = `hsla(${trail.hue}, 100%, 60%, 0.8)`;
      ctx.shadowBlur = 8;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy, trail.radius, startAngle, endAngle);
      ctx.strokeStyle = `hsla(${trail.hue}, 80%, 85%, ${trail.opacity * 0.4})`;
      ctx.lineWidth = 0.8;
      ctx.shadowBlur = 0;
      ctx.stroke();

      const dotAngle = endAngle - 0.02;
      const dotX = cx + Math.cos(dotAngle) * trail.radius;
      const dotY = cy + Math.sin(dotAngle) * trail.radius;
      ctx.beginPath();
      ctx.arc(dotX, dotY, 2, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${trail.hue}, 100%, 90%, ${trail.opacity})`;
      ctx.shadowColor = `hsla(${trail.hue}, 100%, 80%, 1)`;
      ctx.shadowBlur = 6;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    if (this.isExploding) {
      for (const p of this.particles) {
        if (p.life <= 0) continue;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 100%, 75%, ${p.life * 0.9})`;
        ctx.shadowColor = `hsla(${p.hue}, 100%, 65%, ${p.life})`;
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    ctx.restore();
  }
}
