import { hslToRgb } from './path-manager.js';

const POOL_SIZE_EXPLOSION = 600;
const POOL_SIZE_TRAIL = 400;
const POOL_SIZE_RIPPLE = 24;

interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  r: number;
  g: number;
  b: number;
  kind: 'explosion' | 'trail' | 'ripple';
  rippleMaxRadius: number;
}

export class ParticleSystem {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private explosionPool: Particle[] = [];
  private trailPool: Particle[] = [];
  private ripplePool: Particle[] = [];
  private fadingOut: boolean = false;
  private fadeProgress: number = 0;

  constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    this.canvas = canvas;
    this.ctx = ctx;
    this._initPools();
  }

  private _initPools(): void {
    for (let i = 0; i < POOL_SIZE_EXPLOSION; i++) {
      this.explosionPool.push(this._createEmpty('explosion'));
    }
    for (let i = 0; i < POOL_SIZE_TRAIL; i++) {
      this.trailPool.push(this._createEmpty('trail'));
    }
    for (let i = 0; i < POOL_SIZE_RIPPLE; i++) {
      this.ripplePool.push(this._createEmpty('ripple'));
    }
  }

  private _createEmpty(kind: 'explosion' | 'trail' | 'ripple'): Particle {
    return {
      active: false,
      x: 0, y: 0, vx: 0, vy: 0,
      life: 0, maxLife: 1,
      size: 0, r: 255, g: 255, b: 255,
      kind,
      rippleMaxRadius: 0,
    };
  }

  public spawnExplosion(params: { x: number; y: number; baseColor: string; count?: number }): void {
    const { x, y, baseColor, count } = params;
    const particleCount = count ?? 50 + Math.floor(Math.random() * 51);
    const { h, s, l } = this._parseHsl(baseColor);

    let spawned = 0;
    for (let i = 0; i < this.explosionPool.length && spawned < particleCount; i++) {
      const p = this.explosionPool[i];
      if (!p.active) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 50 + Math.random() * 150;
        const hueOffset = (Math.random() - 0.5) * 40;
        const newH = h + hueOffset;
        const rgb = hslToRgb(((newH % 360) + 360) % 360, s, l + (Math.random() - 0.3) * 10);
        p.active = true;
        p.x = x;
        p.y = y;
        p.vx = Math.cos(angle) * speed;
        p.vy = Math.sin(angle) * speed;
        p.maxLife = 1.6 + Math.random() * 0.4;
        p.life = p.maxLife;
        p.size = 2 + Math.random() * 3;
        p.r = rgb.r;
        p.g = rgb.g;
        p.b = rgb.b;
        spawned++;
      }
    }
  }

  public spawnRipple(params: { x: number; y: number; color: string }): void {
    const { x, y, color } = params;
    const { h, s, l } = this._parseHsl(color);
    const rgb = hslToRgb(h, s, l);

    for (let i = 0; i < this.ripplePool.length; i++) {
      const p = this.ripplePool[i];
      if (!p.active) {
        p.active = true;
        p.x = x;
        p.y = y;
        p.vx = 0;
        p.vy = 0;
        p.maxLife = 0.5;
        p.life = p.maxLife;
        p.size = 2;
        p.rippleMaxRadius = 80;
        p.r = rgb.r;
        p.g = rgb.g;
        p.b = rgb.b;
        break;
      }
    }
  }

  public spawnTrailParticle(params: { x: number; y: number; color: string }): void {
    const { x, y, color } = params;
    const { h, s, l } = this._parseHsl(color);
    const rgb = hslToRgb(h, s, l);

    for (let i = 0; i < this.trailPool.length; i++) {
      const p = this.trailPool[i];
      if (!p.active) {
        p.active = true;
        p.x = x;
        p.y = y;
        p.vx = (Math.random() - 0.5) * 8;
        p.vy = (Math.random() - 0.5) * 8;
        p.maxLife = 1.2 + Math.random() * 0.3;
        p.life = p.maxLife;
        p.size = 2;
        p.r = rgb.r;
        p.g = rgb.g;
        p.b = rgb.b;
        break;
      }
    }
  }

  public update(deltaTime: number): void {
    const dt = deltaTime;

    for (const p of this.explosionPool) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.96;
      p.vy *= 0.96;
      p.vy += 15 * dt;
    }

    for (const p of this.trailPool) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.92;
      p.vy *= 0.92;
    }

    for (const p of this.ripplePool) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
      }
    }

    if (this.fadingOut) {
      this.fadeProgress += dt / 0.4;
      if (this.fadeProgress >= 1) {
        this.fadingOut = false;
        this.fadeProgress = 0;
        this._forceClear();
      }
    }
  }

  public render(): void {
    const ctx = this.ctx;
    const fadeMul = this.fadingOut ? Math.max(0, 1 - this.fadeProgress) : 1;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    for (const p of this.trailPool) {
      if (!p.active) continue;
      const alpha = (p.life / p.maxLife) * 0.7 * fadeMul;
      ctx.beginPath();
      const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
      grd.addColorStop(0, `rgba(${p.r},${p.g},${p.b},${alpha})`);
      grd.addColorStop(1, `rgba(${p.r},${p.g},${p.b},0)`);
      ctx.fillStyle = grd;
      ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const p of this.explosionPool) {
      if (!p.active) continue;
      const lifeRatio = p.life / p.maxLife;
      const alpha = lifeRatio * fadeMul;
      const size = p.size * (0.4 + lifeRatio * 0.6);
      ctx.beginPath();
      const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size * 4);
      grd.addColorStop(0, `rgba(255,255,255,${alpha * 0.9})`);
      grd.addColorStop(0.25, `rgba(${p.r},${p.g},${p.b},${alpha * 0.8})`);
      grd.addColorStop(1, `rgba(${p.r},${p.g},${p.b},0)`);
      ctx.fillStyle = grd;
      ctx.arc(p.x, p.y, size * 4, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const p of this.ripplePool) {
      if (!p.active) continue;
      const t = 1 - p.life / p.maxLife;
      const radius = t * p.rippleMaxRadius;
      const alpha = (1 - t) * 0.7 * fadeMul;
      ctx.beginPath();
      const grd = ctx.createRadialGradient(p.x, p.y, Math.max(0, radius - 8), p.x, p.y, radius);
      grd.addColorStop(0, `rgba(${p.r},${p.g},${p.b},0)`);
      grd.addColorStop(0.6, `rgba(${p.r},${p.g},${p.b},${alpha * 0.5})`);
      grd.addColorStop(1, `rgba(255,255,255,${alpha * 0.2})`);
      ctx.fillStyle = grd;
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  public reset(): void {
    this.fadingOut = true;
    this.fadeProgress = 0;
  }

  private _forceClear(): void {
    for (const p of this.explosionPool) p.active = false;
    for (const p of this.trailPool) p.active = false;
    for (const p of this.ripplePool) p.active = false;
  }

  private _parseHsl(hslStr: string): { h: number; s: number; l: number } {
    const m = /hsl\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*\)/i.exec(hslStr);
    if (m) {
      return { h: parseFloat(m[1]), s: parseFloat(m[2]), l: parseFloat(m[3]) };
    }
    return { h: 200, s: 80, l: 60 };
  }

  public hasActiveParticles(): boolean {
    if (this.fadingOut) return true;
    for (const p of this.explosionPool) if (p.active) return true;
    for (const p of this.trailPool) if (p.active) return true;
    for (const p of this.ripplePool) if (p.active) return true;
    return false;
  }
}
