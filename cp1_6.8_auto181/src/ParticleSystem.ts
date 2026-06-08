import type { AnalysisData, BandType } from './AudioAnalyzer';

interface Particle {
  angle: number;
  radius: number;
  baseRadius: number;
  speed: number;
  size: number;
  color: string;
  alpha: number;
  band: BandType;
  burstVx: number;
  x: number;
  y: number;
  z: number;
  life: number;
  maxLife: number;
}

interface Halo {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  color: string;
  speed: number;
}

interface Star {
  x: number;
  y: number;
  size: number;
  alpha: number;
  twinkleSpeed: number;
  twinklePhase: number;
}

const BAND_COLORS: Record<BandType, string[]> = {
  low: ['#e040fb', '#9c27b0', '#ce93d8'],
  mid: ['#00e5ff', '#00c853', '#69f0ae'],
  high: ['#ffd740', '#ffab00', '#ffe082'],
};

const ORBIT_BASE = { low: 100, mid: 180, high: 260 };
const ORBIT_SPREAD = { low: 40, mid: 50, high: 60 };

export class ParticleSystem {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private halos: Halo[] = [];
  private stars: Star[] = [];
  private rotationX = 0.35;
  private rotationY = 0;
  private zoom = 1;
  private centerX = 0;
  private centerY = 0;
  private maxParticles = 1500;
  private frameCount = 0;
  private glowCanvas: HTMLCanvasElement;
  private glowCtx: CanvasRenderingContext2D;
  private haloCanvas: HTMLCanvasElement;
  private haloCtx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    this.glowCanvas = document.createElement('canvas');
    this.glowCtx = this.glowCanvas.getContext('2d')!;
    this.haloCanvas = document.createElement('canvas');
    this.haloCtx = this.haloCanvas.getContext('2d')!;
    this.resize();
    this.initStars();
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.glowCanvas.width = 32;
    this.glowCanvas.height = 32;
    this.haloCanvas.width = 128;
    this.haloCanvas.height = 128;
    this.centerX = w / 2;
    this.centerY = h / 2;
    this.maxParticles = Math.min(2000, Math.floor(w * h / 700));
    this.initStars();
  }

  private initStars() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const count = Math.floor((w * h) / 8000);
    this.stars = [];
    for (let i = 0; i < count; i++) {
      this.stars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        size: 0.3 + Math.random() * 1.2,
        alpha: 0.2 + Math.random() * 0.6,
        twinkleSpeed: 0.005 + Math.random() * 0.015,
        twinklePhase: Math.random() * Math.PI * 2,
      });
    }
  }

  update(data: AnalysisData, dt: number) {
    this.frameCount++;
    const intensity = data.volume;

    if (data.low > 0.05) this.spawnBand('low', data.low, 1 + Math.floor(data.low * 6));
    if (data.mid > 0.05) this.spawnBand('mid', data.mid, 1 + Math.floor(data.mid * 5));
    if (data.high > 0.05) this.spawnBand('high', data.high, 1 + Math.floor(data.high * 4));

    if (data.beat) {
      this.triggerBurst(intensity);
      this.spawnHalo(intensity);
    }

    const cosRx = Math.cos(this.rotationX);
    const sinRx = Math.sin(this.rotationX);
    const cosRy = Math.cos(this.rotationY);
    const sinRy = Math.sin(this.rotationY);
    const perspective = 800;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.angle += p.speed * dt * 60;
      p.life -= dt;

      if (p.burstVx > 0.1) {
        p.radius += p.burstVx * dt * 60;
        p.burstVx *= Math.pow(0.92, dt * 60);
      } else {
        p.burstVx = 0;
        p.radius += (p.baseRadius - p.radius) * 0.02 * dt * 60;
      }

      const r = p.radius;
      const a = p.angle;
      let x3 = r * Math.cos(a);
      let y3 = r * Math.sin(a);
      let z3 = 0;

      const y3r = y3 * cosRx - z3 * sinRx;
      const z3r = y3 * sinRx + z3 * cosRx;
      const x3r = x3 * cosRy - z3r * sinRy;
      const z3f = x3 * sinRy + z3r * cosRy;

      const scale = perspective / (perspective + z3f) * this.zoom;
      p.x = this.centerX + x3r * scale;
      p.y = this.centerY + y3r * scale;
      p.z = z3f;

      const lifeRatio = p.life / p.maxLife;
      p.alpha = lifeRatio * (0.6 + intensity * 0.4);

      if (p.life <= 0 || p.radius > p.baseRadius + 300) {
        this.particles[i] = this.particles[this.particles.length - 1];
        this.particles.pop();
      }
    }

    for (let i = this.halos.length - 1; i >= 0; i--) {
      const h = this.halos[i];
      h.radius += h.speed * dt * 60;
      h.alpha -= 0.015 * dt * 60;
      if (h.alpha <= 0) {
        this.halos[i] = this.halos[this.halos.length - 1];
        this.halos.pop();
      }
    }

    while (this.particles.length > this.maxParticles) {
      this.particles.shift();
    }
  }

  private spawnBand(band: BandType, energy: number, count: number) {
    const colors = BAND_COLORS[band];
    const baseR = ORBIT_BASE[band];
    const spread = ORBIT_SPREAD[band];
    const speedFactor = band === 'low' ? 0.5 : band === 'mid' ? 1 : 1.6;

    for (let i = 0; i < count; i++) {
      const color = colors[Math.floor(Math.random() * colors.length)];
      const life = 2 + Math.random() * 3;
      this.particles.push({
        angle: Math.random() * Math.PI * 2,
        radius: baseR + (Math.random() - 0.5) * spread * 2,
        baseRadius: baseR + (Math.random() - 0.5) * spread,
        speed: (0.003 + Math.random() * 0.01) * speedFactor,
        size: 1.2 + Math.random() * 2.5 * energy,
        color,
        alpha: 0.7 + Math.random() * 0.3,
        band,
        burstVx: 0,
        x: 0,
        y: 0,
        z: 0,
        life,
        maxLife: life,
      });
    }
  }

  private triggerBurst(intensity: number) {
    const force = 1.5 + intensity * 5;
    for (const p of this.particles) {
      p.burstVx = force * (0.5 + Math.random() * 0.8);
    }
  }

  private spawnHalo(intensity: number) {
    const band: BandType = ['low', 'mid', 'high'][Math.floor(Math.random() * 3)] as BandType;
    const colors = BAND_COLORS[band];
    this.halos.push({
      x: this.centerX,
      y: this.centerY,
      radius: 30 + Math.random() * 20,
      alpha: 0.3 + intensity * 0.4,
      color: colors[Math.floor(Math.random() * colors.length)],
      speed: 1.5 + Math.random() * 2,
    });
  }

  render() {
    const ctx = this.ctx;
    const w = window.innerWidth;
    const h = window.innerHeight;

    ctx.fillStyle = '#050510';
    ctx.fillRect(0, 0, w, h);

    const grad = ctx.createRadialGradient(this.centerX, this.centerY, 0, this.centerX, this.centerY, Math.max(w, h) * 0.7);
    grad.addColorStop(0, 'rgba(10, 10, 46, 0.6)');
    grad.addColorStop(0.5, 'rgba(8, 8, 35, 0.4)');
    grad.addColorStop(1, 'rgba(5, 5, 16, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    this.renderStars(ctx);

    this.halos.sort((a, b) => a.alpha - b.alpha);
    for (const halo of this.halos) {
      ctx.save();
      ctx.globalAlpha = halo.alpha;
      ctx.beginPath();
      ctx.arc(halo.x, halo.y, halo.radius, 0, Math.PI * 2);
      ctx.strokeStyle = halo.color;
      ctx.lineWidth = 2 + halo.alpha * 3;
      ctx.stroke();
      const rGrad = ctx.createRadialGradient(halo.x, halo.y, halo.radius * 0.8, halo.x, halo.y, halo.radius * 1.1);
      rGrad.addColorStop(0, 'transparent');
      rGrad.addColorStop(0.5, halo.color + '20');
      rGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = rGrad;
      ctx.fill();
      ctx.restore();
    }

    this.particles.sort((a, b) => b.z - a.z);
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6 + p.size * 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.globalAlpha = 1;
  }

  private renderStars(ctx: CanvasRenderingContext2D) {
    const time = this.frameCount;
    for (const s of this.stars) {
      const twinkle = 0.5 + 0.5 * Math.sin(time * s.twinkleSpeed + s.twinklePhase);
      ctx.save();
      ctx.globalAlpha = s.alpha * twinkle;
      ctx.fillStyle = '#c8d6e5';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  setRotation(rx: number, ry: number) {
    this.rotationX = rx;
    this.rotationY = ry;
  }

  setZoom(z: number) {
    this.zoom = Math.max(0.3, Math.min(3, z));
  }

  getZoom() { return this.zoom; }

  getParticleCount() { return this.particles.length; }

  findNearestBand(mx: number, my: number): BandType | null {
    const dx = mx - this.centerX;
    const dy = my - this.centerY;
    const dist = Math.sqrt(dx * dx + dy * dy) / this.zoom;
    if (dist < ORBIT_BASE.low + ORBIT_SPREAD.low) return 'low';
    if (dist < ORBIT_BASE.mid + ORBIT_SPREAD.mid) return 'mid';
    if (dist < ORBIT_BASE.high + ORBIT_SPREAD.high) return 'high';
    return null;
  }

  getRotation() { return { rx: this.rotationX, ry: this.rotationY }; }
}
