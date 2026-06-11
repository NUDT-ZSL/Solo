import { ElementType, getElementColor, Point } from './runeRecognizer';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
  colorStart: string;
  colorEnd: string;
  trail: Point[];
  trailLength: number;
  mode: 'spiral' | 'lissajous' | 'explode';
  angle: number;
  angularSpeed: number;
  radius: number;
  radiusSpeed: number;
  focusX: number;
  focusY: number;
  lissajousA: number;
  lissajousB: number;
  lissajousDelta: number;
  lissajousScale: number;
  phase: number;
}

interface ParticleSystemOptions {
  maxParticles?: number;
}

export class ParticleEngine {
  private particles: Particle[] = [];
  private maxParticles: number;
  private particlePool: Particle[] = [];

  constructor(options: ParticleSystemOptions = {}) {
    this.maxParticles = options.maxParticles || 500;
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        }
      : { r: 255, g: 255, b: 255 };
  }

  private lerpColor(start: string, end: string, t: number): string {
    const s = this.hexToRgb(start);
    const e = this.hexToRgb(end);
    const r = Math.round(s.r + (e.r - s.r) * t);
    const g = Math.round(s.g + (e.g - s.g) * t);
    const b = Math.round(s.b + (e.b - s.b) * t);
    return `rgb(${r}, ${g}, ${b})`;
  }

  private acquireParticle(): Particle | null {
    if (this.particlePool.length > 0) {
      return this.particlePool.pop()!;
    }
    if (this.particles.length >= this.maxParticles) {
      return null;
    }
    return {} as Particle;
  }

  private releaseParticle(p: Particle): void {
    if (this.particlePool.length < this.maxParticles) {
      this.particlePool.push(p);
    }
  }

  spawnElementParticles(
    element: ElementType,
    centerX: number,
    centerY: number,
    count: number = 80,
    isCombo: boolean = false
  ): void {
    const colors = getElementColor(element);
    const actualCount = isCombo ? count * 2 : count;

    for (let i = 0; i < actualCount; i++) {
      const p = this.acquireParticle();
      if (!p) break;

      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 6;
      const size = 2 + Math.random() * 4;

      p.x = centerX;
      p.y = centerY;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.size = size;
      p.alpha = 1;
      p.life = 0;
      p.maxLife = 4 + Math.random() * 3;
      p.colorStart = colors.start;
      p.colorEnd = colors.end;
      p.trail = [];
      p.trailLength = 15 + Math.floor(Math.random() * 10);
      p.mode = isCombo ? 'lissajous' : 'spiral';
      p.angle = angle;
      p.angularSpeed = (Math.random() - 0.5) * 0.03;
      p.radius = 0;
      p.radiusSpeed = 0.5 + Math.random() * 1.5;
      p.focusX = centerX;
      p.focusY = centerY;
      p.lissajousA = 2 + Math.floor(Math.random() * 4);
      p.lissajousB = 3 + Math.floor(Math.random() * 4);
      p.lissajousDelta = Math.random() * Math.PI;
      p.lissajousScale = 50 + Math.random() * 100;
      p.phase = Math.random() * Math.PI * 2;

      this.particles.push(p);
    }
  }

  update(dt: number): void {
    const toRemove: number[] = [];

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.life += dt;

      if (p.life >= p.maxLife) {
        toRemove.push(i);
        continue;
      }

      p.trail.push({ x: p.x, y: p.y });
      if (p.trail.length > p.trailLength) {
        p.trail.shift();
      }

      const lifeRatio = p.life / p.maxLife;
      p.alpha = lifeRatio < 0.1
        ? lifeRatio * 10
        : lifeRatio > 0.8
        ? (1 - lifeRatio) * 5
        : 1;

      if (p.mode === 'explode') {
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.98;
        p.vy *= 0.98;
        p.vy += 0.05;
      } else if (p.mode === 'spiral') {
        if (p.radius < 100 + Math.random() * 50) {
          p.radius += p.radiusSpeed * dt * 60;
        }
        p.angle += p.angularSpeed * dt * 60;
        p.x = p.focusX + Math.cos(p.angle) * p.radius;
        p.y = p.focusY + Math.sin(p.angle) * p.radius;
        p.focusX += (p.vx * 0.02) * dt * 60;
        p.focusY += (p.vy * 0.02) * dt * 60;
      } else if (p.mode === 'lissajous') {
        p.phase += p.angularSpeed * dt * 60 * 2;
        const t = p.phase;
        const lx = Math.sin(p.lissajousA * t + p.lissajousDelta) * p.lissajousScale;
        const ly = Math.sin(p.lissajousB * t) * p.lissajousScale * 0.8;
        p.x = p.focusX + lx;
        p.y = p.focusY + ly;

        if (p.lissajousScale > 40) {
          p.lissajousScale -= 0.3 * dt * 60;
        }
      }
    }

    for (let i = toRemove.length - 1; i >= 0; i--) {
      const idx = toRemove[i];
      const p = this.particles.splice(idx, 1)[0];
      this.releaseParticle(p);
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    for (const p of this.particles) {
      if (p.trail.length > 1) {
        ctx.beginPath();
        ctx.moveTo(p.trail[0].x, p.trail[0].y);
        for (let i = 1; i < p.trail.length; i++) {
          ctx.lineTo(p.trail[i].x, p.trail[i].y);
        }
        ctx.strokeStyle = this.lerpColor(p.colorStart, p.colorEnd, Math.random());
        ctx.lineWidth = p.size * 0.6;
        ctx.lineCap = 'round';
        ctx.globalAlpha = p.alpha * 0.4;
        ctx.stroke();
      }

      const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2);
      const color = this.lerpColor(p.colorStart, p.colorEnd, Math.random());

      gradient.addColorStop(0, color);
      gradient.addColorStop(0.5, color);
      gradient.addColorStop(1, 'transparent');

      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = p.alpha * 0.8;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  clear(): void {
    for (const p of this.particles) {
      this.releaseParticle(p);
    }
    this.particles = [];
  }

  getParticleCount(): number {
    return this.particles.length;
  }

  setFocusPoint(x: number, y: number): void {
    for (const p of this.particles) {
      p.focusX = x;
      p.focusY = y;
    }
  }
}

interface StarParticle {
  x: number;
  y: number;
  size: number;
  alpha: number;
  speed: number;
  twinkleSpeed: number;
  twinklePhase: number;
}

export class Starfield {
  private stars: StarParticle[] = [];
  private width: number = 0;
  private height: number = 0;

  constructor(count: number = 150) {
    for (let i = 0; i < count; i++) {
      this.stars.push({
        x: Math.random(),
        y: Math.random(),
        size: 0.5 + Math.random() * 2,
        alpha: 0.3 + Math.random() * 0.7,
        speed: 0.02 + Math.random() * 0.08,
        twinkleSpeed: 0.01 + Math.random() * 0.03,
        twinklePhase: Math.random() * Math.PI * 2
      });
    }
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  update(dt: number): void {
    for (const star of this.stars) {
      star.y += star.speed * dt * 60 * 0.1;
      star.twinklePhase += star.twinkleSpeed * dt * 60;

      if (star.y > 1.1) {
        star.y = -0.1;
        star.x = Math.random();
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (const star of this.stars) {
      const x = star.x * this.width;
      const y = star.y * this.height;
      const twinkle = 0.5 + Math.sin(star.twinklePhase) * 0.5;
      const alpha = star.alpha * twinkle;

      ctx.fillStyle = `rgba(200, 180, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, star.size, 0, Math.PI * 2);
      ctx.fill();

      if (star.size > 1.5) {
        const glow = ctx.createRadialGradient(x, y, 0, x, y, star.size * 3);
        glow.addColorStop(0, `rgba(200, 180, 255, ${alpha * 0.5})`);
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, y, star.size * 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}
