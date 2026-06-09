export interface ParticleConfig {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  size: number;
}

interface TrailPoint {
  x: number;
  y: number;
  alpha: number;
}

export class Particle {
  x: number = 0;
  y: number = 0;
  vx: number = 0;
  vy: number = 0;
  color: string = '#fff';
  life: number = 0;
  maxLife: number = 0;
  size: number = 3;
  active: boolean = false;
  trail: TrailPoint[] = [];
  private maxTrailLength: number = 12;

  constructor() {}

  init(config: ParticleConfig): void {
    this.x = config.x;
    this.y = config.y;
    this.vx = config.vx;
    this.vy = config.vy;
    this.color = config.color;
    this.life = config.life;
    this.maxLife = config.life;
    this.size = config.size;
    this.active = true;
    this.trail = [];
  }

  update(deltaTime: number, speedMultiplier: number): boolean {
    if (!this.active) return false;

    this.trail.push({ x: this.x, y: this.y, alpha: 0.8 });
    if (this.trail.length > this.maxTrailLength) {
      this.trail.shift();
    }
    for (let i = 0; i < this.trail.length; i++) {
      this.trail[i].alpha = (i / this.trail.length) * 0.8;
    }

    this.x += this.vx * speedMultiplier * deltaTime;
    this.y += this.vy * speedMultiplier * deltaTime;

    this.vx *= 0.98;
    this.vy *= 0.98;
    this.vy += 0.03 * deltaTime;

    this.life -= deltaTime;
    if (this.life <= 0) {
      this.active = false;
      return false;
    }
    return true;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (!this.active) return;

    for (let i = 0; i < this.trail.length; i++) {
      const point = this.trail[i];
      const tSize = (i / this.trail.length) * this.size;
      ctx.globalAlpha = point.alpha * (this.life / this.maxLife);
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(point.x, point.y, tSize, 0, Math.PI * 2);
      ctx.fill();
    }

    const lifeRatio = this.life / this.maxLife;
    ctx.globalAlpha = lifeRatio;
    ctx.fillStyle = this.color;
    ctx.shadowBlur = 15;
    ctx.shadowColor = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  reset(): void {
    this.active = false;
    this.trail = [];
  }
}

export class ParticlePool {
  private pool: Particle[] = [];
  private maxSize: number = 500;

  constructor(initialSize: number = 200) {
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(new Particle());
    }
  }

  acquire(): Particle {
    for (let i = 0; i < this.pool.length; i++) {
      if (!this.pool[i].active) {
        return this.pool[i];
      }
    }
    if (this.pool.length < this.maxSize) {
      const p = new Particle();
      this.pool.push(p);
      return p;
    }
    let oldestIdx = 0;
    let oldestLife = Infinity;
    for (let i = 0; i < this.pool.length; i++) {
      if (this.pool[i].life < oldestLife) {
        oldestLife = this.pool[i].life;
        oldestIdx = i;
      }
    }
    return this.pool[oldestIdx];
  }

  getActive(): Particle[] {
    const result: Particle[] = [];
    for (let i = 0; i < this.pool.length; i++) {
      if (this.pool[i].active) {
        result.push(this.pool[i]);
      }
    }
    return result;
  }

  update(deltaTime: number, speedMultiplier: number): void {
    for (let i = 0; i < this.pool.length; i++) {
      if (this.pool[i].active) {
        this.pool[i].update(deltaTime, speedMultiplier);
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (let i = 0; i < this.pool.length; i++) {
      if (this.pool[i].active) {
        this.pool[i].draw(ctx);
      }
    }
  }

  clear(): void {
    for (let i = 0; i < this.pool.length; i++) {
      this.pool[i].reset();
    }
  }
}

export class HaloParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  active: boolean;

  constructor(x: number, y: number, color: string) {
    this.x = x;
    this.y = y;
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 2;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.life = 0.3;
    this.maxLife = 0.3;
    this.color = color;
    this.size = 2 + Math.random() * 2;
    this.active = true;
  }

  update(deltaTime: number): boolean {
    this.x += this.vx * deltaTime * 60;
    this.y += this.vy * deltaTime * 60;
    this.life -= deltaTime;
    if (this.life <= 0) {
      this.active = false;
      return false;
    }
    return true;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (!this.active) return;
    const alpha = this.life / this.maxLife;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

export class CollisionHalo {
  x: number;
  y: number;
  color1: string;
  color2: string;
  radius: number;
  maxRadius: number;
  life: number;
  maxLife: number;
  flashLife: number;
  flashMaxLife: number;
  particles: HaloParticle[];
  active: boolean;

  constructor(x: number, y: number, color1: string, color2: string) {
    this.x = x;
    this.y = y;
    this.color1 = color1;
    this.color2 = color2;
    this.radius = 10;
    this.maxRadius = 80;
    this.life = 0.6;
    this.maxLife = 0.6;
    this.flashLife = 0.2;
    this.flashMaxLife = 0.2;
    this.particles = [];
    this.active = true;

    const mixedColor = mixColors(color1, color2);
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const px = x + Math.cos(angle) * 40;
      const py = y + Math.sin(angle) * 40;
      this.particles.push(new HaloParticle(px, py, mixedColor));
    }
  }

  update(deltaTime: number): boolean {
    this.radius = 10 + (this.maxRadius - 10) * (1 - this.life / this.maxLife);
    this.life -= deltaTime;
    this.flashLife -= deltaTime;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      if (!this.particles[i].update(deltaTime)) {
        this.particles.splice(i, 1);
      }
    }

    if (this.life <= 0 && this.particles.length === 0) {
      this.active = false;
      return false;
    }
    return true;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (!this.active) return;

    if (this.flashLife > 0) {
      const flashAlpha = (this.flashLife / this.flashMaxLife) * 0.3;
      ctx.globalAlpha = flashAlpha;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    if (this.life > 0) {
      const alpha = this.life / this.maxLife;
      const gradient = ctx.createRadialGradient(
        this.x, this.y, this.radius * 0.5,
        this.x, this.y, this.radius
      );
      gradient.addColorStop(0, this.color1);
      gradient.addColorStop(1, this.color2);

      ctx.globalAlpha = alpha * 0.7;
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.globalAlpha = alpha * 0.2;
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 1;
    }

    for (const p of this.particles) {
      p.draw(ctx);
    }
  }
}

function mixColors(c1: string, c2: string): string {
  const r1 = parseInt(c1.slice(1, 3), 16);
  const g1 = parseInt(c1.slice(3, 5), 16);
  const b1 = parseInt(c1.slice(5, 7), 16);
  const r2 = parseInt(c2.slice(1, 3), 16);
  const g2 = parseInt(c2.slice(3, 5), 16);
  const b2 = parseInt(c2.slice(5, 7), 16);
  const r = Math.round((r1 + r2) / 2);
  const g = Math.round((g1 + g2) / 2);
  const b = Math.round((b1 + b2) / 2);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}
