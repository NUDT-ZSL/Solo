export interface Particle {
  x: number;
  y: number;
  startX: number;
  startY: number;
  centerX: number;
  centerY: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  active: boolean;
  type: 'default' | 'ring' | 'summon_ring' | 'implode_explode';
  ringRadius?: number;
  ringMaxRadius?: number;
  ringStartAlpha?: number;
  implodeDuration?: number;
  explodeSpeed?: number;
  angle?: number;
}

const PARTICLE_LIMIT = 800;
const PARTICLE_COLORS = ['#E94560', '#0F3460', '#FFD700'];

export class ParticleSystem {
  private pool: Particle[] = [];

  constructor() {
    for (let i = 0; i < PARTICLE_LIMIT; i++) {
      this.pool.push(this.createEmptyParticle());
    }
  }

  private createEmptyParticle(): Particle {
    return {
      x: 0, y: 0, startX: 0, startY: 0, centerX: 0, centerY: 0,
      vx: 0, vy: 0, size: 0, color: '#FFFFFF',
      alpha: 0, life: 0, maxLife: 1, active: false, type: 'default'
    };
  }

  private getInactiveParticle(): Particle | null {
    for (let i = 0; i < this.pool.length; i++) {
      if (!this.pool[i].active) {
        return this.pool[i];
      }
    }
    if (this.pool.length < PARTICLE_LIMIT) {
      const p = this.createEmptyParticle();
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

  spawnSummonParticles(x: number, y: number): void {
    const count = 100;
    for (let i = 0; i < count; i++) {
      const p = this.getInactiveParticle();
      if (!p) break;
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.size = 3 + Math.random() * 5;
      p.color = PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)];
      p.alpha = 1;
      p.life = 2;
      p.maxLife = 2;
      p.active = true;
      p.type = 'default';
    }
  }

  spawnFireworkParticles(x: number, y: number): void {
    const count = 500;
    for (let i = 0; i < count; i++) {
      const p = this.getInactiveParticle();
      if (!p) break;
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.size = 2 + Math.random() * 4;
      p.color = '#FFD700';
      p.alpha = 1;
      p.life = 3;
      p.maxLife = 3;
      p.active = true;
      p.type = 'default';
    }
  }

  spawnRingEffect(x: number, y: number): void {
    const p = this.getInactiveParticle();
    if (!p) return;
    p.x = x;
    p.y = y;
    p.vx = 0;
    p.vy = 0;
    p.size = 0;
    p.color = '#FFD700';
    p.alpha = 1;
    p.life = 1;
    p.maxLife = 1;
    p.active = true;
    p.type = 'ring';
    p.ringRadius = 10;
    p.ringMaxRadius = 80;
  }

  update(deltaTime: number): void {
    for (let i = 0; i < this.pool.length; i++) {
      const p = this.pool[i];
      if (!p.active) continue;
      p.life -= deltaTime;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }
      if (p.type === 'ring') {
        const progress = 1 - p.life / p.maxLife;
        p.ringRadius = 10 + (80 - 10) * progress;
        p.alpha = 1 - progress;
      } else {
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.98;
        p.vy *= 0.98;
        p.alpha = p.life / p.maxLife;
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (let i = 0; i < this.pool.length; i++) {
      const p = this.pool[i];
      if (!p.active) continue;
      ctx.save();
      ctx.globalAlpha = p.alpha;
      if (p.type === 'ring' && p.ringRadius !== undefined) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.ringRadius, 0, Math.PI * 2);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 3;
        ctx.stroke();
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  getActiveCount(): number {
    let count = 0;
    for (const p of this.pool) {
      if (p.active) count++;
    }
    return count;
  }
}
