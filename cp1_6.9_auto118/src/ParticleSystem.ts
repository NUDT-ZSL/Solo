import type { Particle } from './types';

const POOL_SIZE = 500;
const PARTICLE_LIFE = 1.2;

export class ParticleSystem {
  private pool: Particle[] = [];
  private spawnAccumulator = new Map<number, number>();

  constructor() {
    for (let i = 0; i < POOL_SIZE; i++) {
      this.pool.push({
        x: 0, y: 0, vx: 0, vy: 0,
        life: 0, maxLife: PARTICLE_LIFE,
        size: 2, color: '#ffffff', alpha: 0, active: false,
      });
    }
  }

  spawn(
    x: number,
    y: number,
    vx: number,
    vy: number,
    color: string,
    speedJitter = 0.5,
    sizeRange: [number, number] = [2, 4]
  ): void {
    for (let i = 0; i < POOL_SIZE; i++) {
      const p = this.pool[i];
      if (!p.active) {
        const angle = Math.atan2(vy, vx) + (Math.random() - 0.5) * 0.6;
        const speed = Math.hypot(vx, vy) * (1 + (Math.random() - 0.5) * speedJitter);
        p.x = x + (Math.random() - 0.5) * 6;
        p.y = y + (Math.random() - 0.5) * 6;
        p.vx = Math.cos(angle) * speed;
        p.vy = Math.sin(angle) * speed;
        p.life = PARTICLE_LIFE;
        p.maxLife = PARTICLE_LIFE;
        p.size = sizeRange[0] + Math.random() * (sizeRange[1] - sizeRange[0]);
        p.color = color;
        p.alpha = 0.9;
        p.active = true;
        return;
      }
    }
  }

  emitTrail(
    pieceId: number,
    dt: number,
    x: number,
    y: number,
    vx: number,
    vy: number,
    color: string
  ): void {
    const rate = 25;
    const acc = (this.spawnAccumulator.get(pieceId) ?? 0) + dt * rate;
    const spawnCount = Math.floor(acc);
    this.spawnAccumulator.set(pieceId, acc - spawnCount);

    const speed = Math.hypot(vx, vy);
    if (speed < 0.5) return;

    for (let i = 0; i < spawnCount; i++) {
      const t = i / Math.max(spawnCount, 1);
      const px = x - vx * t * 0.05;
      const py = y - vy * t * 0.05;
      this.spawn(px, py, -vx * 0.3, -vy * 0.3, color, 0.8, [2, 4]);
    }
  }

  spawnBurst(x: number, y: number, color: string, count = 30): void {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.3;
      const speed = 60 + Math.random() * 140;
      this.spawn(
        x, y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        color,
        0.3,
        [3, 6]
      );
    }
  }

  update(dt: number): void {
    for (let i = 0; i < POOL_SIZE; i++) {
      const p = this.pool[i];
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }
      const t = p.life / p.maxLife;
      p.alpha = 0.9 * t;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.96;
      p.vy *= 0.96;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < POOL_SIZE; i++) {
      const p = this.pool[i];
      if (!p.active) continue;
      ctx.beginPath();
      const r = p.size * (0.5 + (p.life / p.maxLife) * 0.5);
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 2);
      grad.addColorStop(0, this.hexToRgba(p.color, p.alpha));
      grad.addColorStop(0.5, this.hexToRgba(p.color, p.alpha * 0.4));
      grad.addColorStop(1, this.hexToRgba(p.color, 0));
      ctx.fillStyle = grad;
      ctx.arc(p.x, p.y, r * 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  reset(): void {
    for (let i = 0; i < POOL_SIZE; i++) {
      this.pool[i].active = false;
    }
    this.spawnAccumulator.clear();
  }

  private hexToRgba(hex: string, alpha: number): string {
    const h = hex.replace('#', '');
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}
