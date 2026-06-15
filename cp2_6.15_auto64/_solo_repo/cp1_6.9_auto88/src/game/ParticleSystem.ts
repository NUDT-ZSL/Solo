import { Vector2 } from './types';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  life: number;
  maxLife: number;
  active: boolean;
}

const MAX_PARTICLES = 300;

export class ParticleSystem {
  private pool: Particle[] = [];
  private activeCount = 0;

  constructor() {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.pool.push({
        x: 0, y: 0, vx: 0, vy: 0,
        radius: 0, color: '#FFF',
        life: 0, maxLife: 1, active: false,
      });
    }
  }

  spawnExplosion(position: Vector2, count: number = 15): void {
    const actualCount = Math.min(count, MAX_PARTICLES - this.activeCount);
    for (let i = 0; i < actualCount; i++) {
      const p = this.getInactiveParticle();
      if (!p) break;
      const angle = (Math.PI * 2 * i) / actualCount + Math.random() * 0.5;
      const speed = 40 + Math.random() * 60;
      const hue = Math.random() > 0.5 ? '#FFDD00' : '#FF8844';
      p.x = position.x;
      p.y = position.y;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.radius = 3 + Math.random() * 4;
      p.color = hue;
      p.life = 0.8;
      p.maxLife = 0.8;
      p.active = true;
      this.activeCount++;
    }
  }

  spawnShards(position: Vector2, count: number = 3): void {
    const actualCount = Math.min(count, MAX_PARTICLES - this.activeCount);
    for (let i = 0; i < actualCount; i++) {
      const p = this.getInactiveParticle();
      if (!p) break;
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 80;
      p.x = position.x;
      p.y = position.y;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.radius = 4 + Math.random() * 5;
      p.color = '#88CCFF';
      p.life = 0.6;
      p.maxLife = 0.6;
      p.active = true;
      this.activeCount++;
    }
  }

  private getInactiveParticle(): Particle | null {
    for (let i = 0; i < this.pool.length; i++) {
      if (!this.pool[i].active) return this.pool[i];
    }
    return null;
  }

  update(dt: number): void {
    for (let i = 0; i < this.pool.length; i++) {
      const p = this.pool[i];
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        this.activeCount = Math.max(0, this.activeCount - 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.96;
      p.vy *= 0.96;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (let i = 0; i < this.pool.length; i++) {
      const p = this.pool[i];
      if (!p.active) continue;
      const alpha = p.life / p.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}
