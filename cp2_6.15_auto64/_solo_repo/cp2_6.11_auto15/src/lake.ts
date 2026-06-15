export interface WaveLayer {
  amplitude: number;
  frequency: number;
  phase: number;
  speed: number;
  direction: number;
  targetDirection: number;
}

export interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  opacity: number;
  life: number;
  lifeSpeed: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  gravity: number;
  size: number;
  color: string;
  opacity: number;
  life: number;
  maxLife: number;
}

const MAX_PARTICLES = 200;
const MAX_RIPPLES = 3;

export class LakeRenderer {
  private waves: WaveLayer[] = [];
  public ripples: Ripple[] = [];
  public particles: Particle[] = [];
  private width = 0;
  private height = 0;
  private time = 0;
  private directionTimer = 0;
  private waterBaseY = 0;
  private _canvas: HTMLCanvasElement | null = null;
  private _ctx: CanvasRenderingContext2D | null = null;

  constructor() {
    for (let i = 0; i < 5; i++) {
      const amp = 2 + Math.random() * 4;
      this.waves.push({
        amplitude: amp,
        frequency: 0.004 + Math.random() * 0.007,
        phase: Math.random() * Math.PI * 2,
        speed: 0.6 + Math.random() * 0.8,
        direction: Math.random() * Math.PI * 2,
        targetDirection: Math.random() * Math.PI * 2,
      });
    }
  }

  attach(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): void {
    this._canvas = canvas;
    this._ctx = ctx;
    this.resize();
  }

  resize(): void {
    if (!this._canvas) return;
    this.width = this._canvas.width;
    this.height = this._canvas.height;
    this.waterBaseY = this.height * 0.25;
  }

  getWaterBaseY(): number {
    return this.waterBaseY;
  }

  getWidth(): number {
    return this.width;
  }

  getHeight(): number {
    return this.height;
  }

  private angleLerp(a: number, b: number, t: number): number {
    let diff = b - a;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    return a + diff * t;
  }

  getWaveHeight(x: number, y: number): number {
    let sum = 0;
    for (const w of this.waves) {
      const projected = x * Math.cos(w.direction) + y * Math.sin(w.direction);
      sum += w.amplitude * Math.sin(projected * w.frequency + w.phase + this.time * w.speed);
    }
    return sum;
  }

  getWaveDrift(): { vx: number; vy: number } {
    let vx = 0;
    let vy = 0;
    for (const w of this.waves) {
      const speed = w.speed * 0.15;
      vx += Math.cos(w.direction) * speed;
      vy += Math.sin(w.direction) * speed;
    }
    return { vx: vx / this.waves.length, vy: vy / this.waves.length };
  }

  addRipple(x: number, y: number, maxRadius = 120, lifeSpeed = 0.012): void {
    if (this.ripples.length >= MAX_RIPPLES) {
      this.ripples.shift();
    }
    this.ripples.push({
      x,
      y,
      radius: 4,
      maxRadius,
      opacity: 0.7,
      life: 0,
      lifeSpeed,
    });
  }

  addSplashParticles(x: number, y: number, count = 18, color = '#ffffff'): void {
    for (let i = 0; i < count; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.9;
      const speed = 1.5 + Math.random() * 4.5;
      this.pushParticle({
        x,
        y,
        vx: Math.cos(angle) * speed + (Math.random() - 0.5) * 1.5,
        vy: Math.sin(angle) * speed,
        gravity: 0.18,
        size: 8 + Math.random() * 4,
        color,
        opacity: 0.95,
        life: 0,
        maxLife: 0.6,
      });
    }
  }

  addBurstParticles(x: number, y: number, count: number, color: string, color2?: string): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 6;
      const c = color2 && Math.random() < 0.45 ? color2 : color;
      this.pushParticle({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        gravity: 0.15,
        size: 6 + Math.random() * 8,
        color: c,
        opacity: 1,
        life: 0,
        maxLife: 0.9 + Math.random() * 0.5,
      });
    }
  }

  pushParticle(p: Particle): void {
    if (this.particles.length >= MAX_PARTICLES) {
      this.particles.splice(0, this.particles.length - MAX_PARTICLES + 1);
    }
    this.particles.push(p);
  }

  update(dt: number): void {
    this.time += dt;

    this.directionTimer += dt;
    if (this.directionTimer >= 5) {
      this.directionTimer = 0;
      for (const w of this.waves) {
        w.targetDirection = Math.random() * Math.PI * 2;
      }
    }
    for (const w of this.waves) {
      w.direction = this.angleLerp(w.direction, w.targetDirection, dt * 0.04);
    }

    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      r.life += r.lifeSpeed;
      r.radius = 4 + (r.maxRadius - 4) * r.life;
      r.opacity = 0.7 * (1 - r.life);
      if (r.life >= 1) this.ripples.splice(i, 1);
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt / 60;
      p.vy += p.gravity;
      p.x += p.vx;
      p.y += p.vy;
      p.opacity = Math.max(0, 1 - p.life / p.maxLife);
      p.size *= 0.985;
      if (p.life >= p.maxLife || p.opacity <= 0) this.particles.splice(i, 1);
    }
  }

  render(dt: number): void {
    if (!this._ctx) return;
    const ctx = this._ctx;
    this.update(dt);

    const w = this.width;
    const h = this.height;
    const baseY = this.waterBaseY;

    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#0a192f');
    bg.addColorStop(1, '#020c1b');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, baseY);
    for (let x = 0; x <= w; x += 4) {
      const wh = this.getWaveHeight(x, 0);
      ctx.lineTo(x, baseY + wh);
    }
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();

    const waterGrad = ctx.createLinearGradient(0, baseY, 0, h);
    waterGrad.addColorStop(0, 'rgba(20, 60, 110, 0.9)');
    waterGrad.addColorStop(0.4, 'rgba(8, 32, 64, 0.95)');
    waterGrad.addColorStop(1, 'rgba(2, 12, 27, 1)');
    ctx.fillStyle = waterGrad;
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = 'rgba(100, 200, 255, 0.12)';
    ctx.lineWidth = 1;
    for (let layer = 1; layer <= 3; layer++) {
      ctx.beginPath();
      const offY = layer * 30;
      for (let x = 0; x <= w; x += 6) {
        const wh = this.getWaveHeight(x * (1 - layer * 0.15), 0) * (1 - layer * 0.2);
        if (x === 0) ctx.moveTo(x, baseY + offY + wh);
        else ctx.lineTo(x, baseY + offY + wh);
      }
      ctx.stroke();
    }
    ctx.restore();

    for (const r of this.ripples) {
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(r.x, r.y, r.radius, r.radius * 0.35, 0, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(150, 210, 255, ${r.opacity})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    }

    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = p.opacity;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(1, p.size), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  renderConeSplash(x: number, y: number, progress: number): void {
    if (!this._ctx) return;
    const ctx = this._ctx;
    const height = 110 * (1 - Math.abs(progress - 0.5) * 2);
    const radiusBottom = 50 * progress + 10;

    ctx.save();
    ctx.globalAlpha = 0.65 * (1 - progress);

    const coneGrad = ctx.createLinearGradient(x, y - height, x, y);
    coneGrad.addColorStop(0, 'rgba(140, 210, 255, 0.9)');
    coneGrad.addColorStop(1, 'rgba(80, 160, 220, 0.3)');
    ctx.fillStyle = coneGrad;

    ctx.beginPath();
    ctx.moveTo(x, y - height);
    ctx.quadraticCurveTo(x - radiusBottom * 0.6, y - height * 0.5, x - radiusBottom, y);
    ctx.lineTo(x + radiusBottom, y);
    ctx.quadraticCurveTo(x + radiusBottom * 0.6, y - height * 0.5, x, y - height);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(200, 235, 255, 0.8)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }
}
