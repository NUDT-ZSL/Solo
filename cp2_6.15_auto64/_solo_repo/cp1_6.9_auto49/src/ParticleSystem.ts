type ParticleType = 'explode' | 'vortex' | 'halo';

interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  type: ParticleType;
  angle: number;
  radius: number;
  centerX: number;
  centerY: number;
  rotSpeed: number;
}

export class ParticleSystem {
  private pool: Particle[] = [];
  private readonly POOL_SIZE = 600;

  constructor() {
    for (let i = 0; i < this.POOL_SIZE; i++) {
      this.pool.push(this.createEmpty());
    }
  }

  private createEmpty(): Particle {
    return {
      active: false,
      x: 0, y: 0, vx: 0, vy: 0,
      life: 0, maxLife: 1,
      color: '#fff', size: 3,
      type: 'explode',
      angle: 0, radius: 0,
      centerX: 0, centerY: 0,
      rotSpeed: 0,
    };
  }

  private acquire(): Particle | null {
    for (const p of this.pool) {
      if (!p.active) {
        p.active = true;
        return p;
      }
    }
    return null;
  }

  public spawnExplosion(x: number, y: number, color: string, speed = 150): void {
    for (let i = 0; i < 6; i++) {
      const p = this.acquire();
      if (!p) break;
      const angle = (i / 6) * Math.PI * 2 + Math.random() * 0.2;
      const s = speed * (0.85 + Math.random() * 0.3);
      p.type = 'explode';
      p.x = x; p.y = y;
      p.vx = Math.cos(angle) * s;
      p.vy = Math.sin(angle) * s;
      p.color = color;
      p.size = 3 + Math.random() * 2;
      p.life = 0;
      p.maxLife = 0.6;
    }
  }

  public spawnVortex(centerX: number, centerY: number, color: string, count = 40): void {
    for (let i = 0; i < count; i++) {
      const p = this.acquire();
      if (!p) break;
      p.type = 'vortex';
      p.centerX = centerX;
      p.centerY = centerY;
      p.angle = Math.random() * Math.PI * 2;
      p.radius = 120 + Math.random() * 180;
      p.rotSpeed = (Math.random() > 0.5 ? 1 : -1) * (2 + Math.random() * 3);
      p.color = color;
      p.size = 2 + Math.random() * 3;
      p.life = 0;
      p.maxLife = 1.0;
      p.x = centerX + Math.cos(p.angle) * p.radius;
      p.y = centerY + Math.sin(p.angle) * p.radius;
    }
  }

  public spawnHalo(centerX: number, centerY: number, count = 80): void {
    for (let i = 0; i < count; i++) {
      const p = this.acquire();
      if (!p) break;
      p.type = 'halo';
      p.centerX = centerX;
      p.centerY = centerY;
      p.angle = (i / count) * Math.PI * 2;
      p.radius = 200;
      p.rotSpeed = 1.5;
      p.color = '#ffdd44';
      p.size = 3 + Math.random() * 2;
      p.life = 0;
      p.maxLife = 2.0;
      p.x = centerX + Math.cos(p.angle) * p.radius;
      p.y = centerY + Math.sin(p.angle) * p.radius;
    }
  }

  public update(dt: number): void {
    for (const p of this.pool) {
      if (!p.active) continue;
      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        continue;
      }
      const t = p.life / p.maxLife;
      if (p.type === 'explode') {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.96;
        p.vy *= 0.96;
      } else if (p.type === 'vortex') {
        p.angle += p.rotSpeed * dt;
        const r = p.radius * (1 - t);
        p.x = p.centerX + Math.cos(p.angle) * r;
        p.y = p.centerY + Math.sin(p.angle) * r;
      } else if (p.type === 'halo') {
        p.angle += p.rotSpeed * dt;
        const r = 200 + t * 200;
        p.x = p.centerX + Math.cos(p.angle) * r;
        p.y = p.centerY + Math.sin(p.angle) * r;
      }
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    for (const p of this.pool) {
      if (!p.active) continue;
      const t = p.life / p.maxLife;
      const alpha = p.type === 'halo' ? (1 - t) * 0.8 : 1 - t;
      ctx.save();
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = p.size * 3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (p.type === 'halo' ? (1 + t * 0.5) : 1), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  public clear(): void {
    for (const p of this.pool) p.active = false;
  }
}
