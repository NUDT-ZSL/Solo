export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  hue: number;
  saturation: number;
  lightness: number;
  life: number;
  maxLife: number;
  active: boolean;
}

const POOL_SIZE = 400;
const PARTICLE_LIFE = 0.4;

export class ParticleSystem {
  private ctx: CanvasRenderingContext2D;
  private width = 0;
  private height = 0;
  private pool: Particle[] = [];

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;
    for (let i = 0; i < POOL_SIZE; i++) {
      this.pool.push(this.allocateDead());
    }
  }

  private allocateDead(): Particle {
    return {
      x: 0, y: 0, vx: 0, vy: 0, size: 0,
      hue: 0, saturation: 0, lightness: 0,
      life: 0, maxLife: PARTICLE_LIFE, active: false,
    };
  }

  resize(w: number, h: number): void {
    this.width = w;
    this.height = h;
  }

  emit(
    x: number,
    y: number,
    hue: number,
    pathAngleRad: number,
    count: number,
    speedScale = 1,
  ): void {
    let emitted = 0;
    for (let i = 0; i < this.pool.length && emitted < count; i++) {
      const p = this.pool[i];
      if (p.active) continue;
      const spread = (Math.random() * 2 - 1) * Math.PI;
      const forwardBias = Math.random() * 0.4;
      const angle = pathAngleRad + spread + forwardBias * (Math.random() < 0.5 ? 1 : -1);
      const speed = (30 + Math.random() * 30) * speedScale;
      p.x = x + (Math.random() * 2 - 1) * 4;
      p.y = y + (Math.random() * 2 - 1) * 4;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.size = 1 + Math.random() * 2;
      p.hue = hue + (Math.random() * 20 - 10);
      p.saturation = 75 + Math.random() * 20;
      p.lightness = 72 + Math.random() * 18;
      p.life = PARTICLE_LIFE * (0.85 + Math.random() * 0.3);
      p.maxLife = p.life;
      p.active = true;
      emitted++;
    }
  }

  update(dt: number): void {
    for (const p of this.pool) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 1 - 1.2 * dt;
      p.vy *= 1 - 1.2 * dt;
      if (p.x < -20 || p.x > this.width + 20 || p.y < -20 || p.y > this.height + 20) {
        p.active = false;
      }
    }
  }

  render(dpr: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (const p of this.pool) {
      if (!p.active) continue;
      const t = p.life / p.maxLife;
      const alpha = t * 0.85;
      ctx.beginPath();
      ctx.fillStyle = `hsla(${p.hue}, ${p.saturation}%, ${p.lightness}%, ${alpha})`;
      ctx.arc(p.x, p.y, p.size * (0.6 + t * 0.4), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  reset(): void {
    for (const p of this.pool) p.active = false;
  }

  get activeCount(): number {
    let n = 0;
    for (const p of this.pool) if (p.active) n++;
    return n;
  }
}
