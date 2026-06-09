import type { Particle, ParticleType, Position } from './types';

interface ParticlePool {
  active: Particle[];
  pool: Particle[];
  max: number;
}

export class ParticleSystem {
  private pools: Record<ParticleType, ParticlePool>;

  constructor() {
    this.pools = {
      plantDust: { active: [], pool: [], max: 80 },
      oreSpark: { active: [], pool: [], max: 80 },
      potionDrop: { active: [], pool: [], max: 60 },
      steam: { active: [], pool: [], max: 20 },
      successBurst: { active: [], pool: [], max: 50 },
      failSmoke: { active: [], pool: [], max: 40 },
      candleFlame: { active: [], pool: [], max: 60 },
      furnaceFire: { active: [], pool: [], max: 40 },
      dangerExplosion: { active: [], pool: [], max: 50 },
      edgeGlow: { active: [], pool: [], max: 30 },
    };

    this.initializePools();
  }

  private initializePools(): void {
    for (const type of Object.keys(this.pools) as ParticleType[]) {
      const pool = this.pools[type];
      for (let i = 0; i < pool.max; i++) {
        pool.pool.push(this.createEmptyParticle(type));
      }
    }
  }

  private createEmptyParticle(type: ParticleType): Particle {
    return {
      x: 0, y: 0, vx: 0, vy: 0,
      life: 0, maxLife: 1,
      size: 0, color: '#ffffff', type,
      alpha: 0,
      rotation: 0, rotationSpeed: 0,
    };
  }

  private acquire(type: ParticleType): Particle | null {
    const pool = this.pools[type];
    if (pool.pool.length > 0) {
      const p = pool.pool.pop()!;
      p.type = type;
      pool.active.push(p);
      return p;
    }
    if (pool.active.length < pool.max) {
      const p = this.createEmptyParticle(type);
      pool.active.push(p);
      return p;
    }
    return null;
  }

  emitPlantDust(pos: Position): void {
    for (let i = 0; i < 12; i++) {
      const p = this.acquire('plantDust');
      if (!p) continue;
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.5 + Math.random() * 1.5;
      p.x = pos.x + (Math.random() - 0.5) * 30;
      p.y = pos.y + (Math.random() - 0.5) * 20;
      p.vx = Math.cos(angle) * speed;
      p.vy = -Math.abs(Math.sin(angle)) * speed - 1;
      p.life = 1500;
      p.maxLife = 1500;
      p.size = 3 + Math.random() * 3;
      const greens = ['#4CAF50', '#66BB6A', '#81C784', '#A5D6A7', '#388E3C'];
      p.color = greens[Math.floor(Math.random() * greens.length)];
      p.alpha = 0.9;
    }
  }

  emitOreSpark(pos: Position): void {
    for (let i = 0; i < 15; i++) {
      const p = this.acquire('oreSpark');
      if (!p) continue;
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.2;
      const speed = 2 + Math.random() * 4;
      p.x = pos.x + (Math.random() - 0.5) * 20;
      p.y = pos.y + (Math.random() - 0.5) * 10;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.life = 1000;
      p.maxLife = 1000;
      p.size = 2 + Math.random() * 2;
      const sparks = ['#FF5722', '#FF7043', '#FF9800', '#FFAB40', '#FFC107'];
      p.color = sparks[Math.floor(Math.random() * sparks.length)];
      p.alpha = 1;
    }
  }

  emitPotionDrop(pos: Position): void {
    for (let i = 0; i < 8; i++) {
      const p = this.acquire('potionDrop');
      if (!p) continue;
      p.x = pos.x + (Math.random() - 0.5) * 25;
      p.y = pos.y - 10 - Math.random() * 20;
      p.vx = (Math.random() - 0.5) * 1;
      p.vy = 2 + Math.random() * 3;
      p.life = 800;
      p.maxLife = 800;
      p.size = 4 + Math.random() * 3;
      const blues = ['#2196F3', '#42A5F5', '#64B5F6', '#1E88E5'];
      p.color = blues[Math.floor(Math.random() * blues.length)];
      p.alpha = 0.85;
    }
  }

  emitSteam(pos: Position): void {
    for (let i = 0; i < 2; i++) {
      const p = this.acquire('steam');
      if (!p) continue;
      p.x = pos.x + (Math.random() - 0.5) * 40;
      p.y = pos.y - 30;
      p.vx = (Math.random() - 0.5) * 0.8;
      p.vy = -0.5 - Math.random() * 0.5;
      p.life = 2500;
      p.maxLife = 2500;
      p.size = 8 + Math.random() * 10;
      p.color = '#E0E0E0';
      p.alpha = 0.4;
    }
  }

  emitSuccessBurst(pos: Position): void {
    const colors = ['#FF6B6B', '#FF8E72', '#FFB347', '#FFD700', '#FFEE58', '#AED581', '#4ECDC4', '#81D4FA'];
    for (let i = 0; i < 30; i++) {
      const p = this.acquire('successBurst');
      if (!p) continue;
      const angle = (i / 30) * Math.PI * 2 + Math.random() * 0.3;
      const speed = 1.5 + Math.random() * 3;
      p.x = pos.x;
      p.y = pos.y;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed - 1;
      p.life = 1200;
      p.maxLife = 1200;
      p.size = 3 + Math.random() * 4;
      if (Math.random() < 0.3) p.color = '#FFD700';
      else p.color = colors[Math.floor(Math.random() * colors.length)];
      p.alpha = 1;
    }
  }

  emitFailSmoke(pos: Position): void {
    for (let i = 0; i < 20; i++) {
      const p = this.acquire('failSmoke');
      if (!p) continue;
      p.x = pos.x + (Math.random() - 0.5) * 30;
      p.y = pos.y - 20;
      p.vx = (Math.random() - 0.5) * 1.2;
      p.vy = -0.3 - Math.random() * 0.6;
      p.life = 2000;
      p.maxLife = 2000;
      p.size = 6 + Math.random() * 8;
      const grays = ['#212121', '#333333', '#424242'];
      p.color = grays[Math.floor(Math.random() * grays.length)];
      p.alpha = 0.8;
    }
  }

  emitCandleFlame(pos: Position, time: number): void {
    if (Math.random() > 0.5) return;
    const p = this.acquire('candleFlame');
    if (!p) return;
    const sway = Math.sin(time * 0.003) * 3;
    p.x = pos.x + sway + (Math.random() - 0.5) * 3;
    p.y = pos.y;
    p.vx = (Math.random() - 0.5) * 0.3;
    p.vy = -1 - Math.random() * 1.5;
    p.life = 400;
    p.maxLife = 400;
    p.size = 3 + Math.random() * 3;
    const flames = ['#FFEB3B', '#FFC107', '#FF9800', '#FF5722'];
    p.color = flames[Math.floor(Math.random() * flames.length)];
    p.alpha = 0.9;
  }

  emitFurnaceFire(pos: Position): void {
    if (Math.random() > 0.6) return;
    const p = this.acquire('furnaceFire');
    if (!p) return;
    p.x = pos.x + (Math.random() - 0.5) * 30;
    p.y = pos.y;
    p.vx = (Math.random() - 0.5) * 1;
    p.vy = -1.5 - Math.random() * 2;
    p.life = 600;
    p.maxLife = 600;
    p.size = 3 + Math.random() * 4;
    const fires = ['#BF360C', '#D84315', '#E64A19', '#FF5722', '#FF7043'];
    p.color = fires[Math.floor(Math.random() * fires.length)];
    p.alpha = 0.9;
  }

  emitDangerExplosion(pos: Position): void {
    for (let i = 0; i < 40; i++) {
      const p = this.acquire('dangerExplosion');
      if (!p) continue;
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 5;
      p.x = pos.x;
      p.y = pos.y;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.life = 800;
      p.maxLife = 800;
      p.size = 4 + Math.random() * 5;
      const danger = ['#B71C1C', '#D32F2F', '#F44336', '#FF5252', '#FFCDD2'];
      p.color = danger[Math.floor(Math.random() * danger.length)];
      p.alpha = 1;
    }
  }

  emitEdgeGlow(rect: { x: number; y: number; w: number; h: number; r: number }): void {
    const cx = rect.x + rect.w / 2;
    const cy = rect.y + rect.h / 2;
    for (let i = 0; i < 5; i++) {
      const p = this.acquire('edgeGlow');
      if (!p) continue;
      const angle = (i / 5) * Math.PI * 2 + rect.r;
      p.x = cx + Math.cos(angle) * (rect.w / 2 + 2);
      p.y = cy + Math.sin(angle) * (rect.h / 2 + 2);
      p.vx = 0;
      p.vy = 0;
      p.life = 500;
      p.maxLife = 500;
      p.size = 2;
      p.color = '#FFFFFF';
      p.alpha = 0.8;
    }
  }

  update(deltaTime: number, time: number): void {
    for (const type of Object.keys(this.pools) as ParticleType[]) {
      const pool = this.pools[type];
      for (let i = pool.active.length - 1; i >= 0; i--) {
        const p = pool.active[i];
        p.life -= deltaTime;
        if (p.life <= 0) {
          pool.active.splice(i, 1);
          pool.pool.push(p);
          continue;
        }

        const t = p.life / p.maxLife;

        switch (type) {
          case 'plantDust':
            p.vy -= 0.002 * deltaTime;
            p.alpha = 0.9 * t;
            p.x += p.vx * deltaTime * 0.06;
            p.y += p.vy * deltaTime * 0.06;
            break;
          case 'oreSpark':
            p.vy += 0.004 * deltaTime;
            p.alpha = t;
            p.x += p.vx * deltaTime * 0.06;
            p.y += p.vy * deltaTime * 0.06;
            break;
          case 'potionDrop':
            p.vy += 0.002 * deltaTime;
            p.alpha = 0.85 * t;
            p.x += p.vx * deltaTime * 0.06;
            p.y += p.vy * deltaTime * 0.06;
            break;
          case 'steam':
            p.size += 0.005 * deltaTime;
            p.alpha = 0.4 * Math.min(t * 2, 1);
            p.x += p.vx * deltaTime * 0.06;
            p.y += p.vy * deltaTime * 0.06;
            break;
          case 'successBurst':
            p.vy += 0.001 * deltaTime;
            p.alpha = t;
            p.x += p.vx * deltaTime * 0.06;
            p.y += p.vy * deltaTime * 0.06;
            break;
          case 'failSmoke':
            p.size += 0.008 * deltaTime;
            p.alpha = 0.8 * t;
            p.x += p.vx * deltaTime * 0.06;
            p.y += p.vy * deltaTime * 0.06;
            break;
          case 'candleFlame': {
            const sway = Math.sin(time * 0.006 + p.x * 0.1) * 0.05 * deltaTime;
            p.alpha = 0.9 * Math.min(t * 3, 1);
            p.x += p.vx * deltaTime * 0.06 + sway;
            p.y += p.vy * deltaTime * 0.06;
            break;
          }
          case 'furnaceFire':
            p.alpha = 0.9 * Math.min(t * 2, 1);
            p.x += p.vx * deltaTime * 0.06;
            p.y += p.vy * deltaTime * 0.06;
            break;
          case 'dangerExplosion':
            p.vx *= 0.98;
            p.vy *= 0.98;
            p.alpha = t;
            p.x += p.vx * deltaTime * 0.06;
            p.y += p.vy * deltaTime * 0.06;
            break;
          case 'edgeGlow':
            p.alpha = 0.8 * t;
            break;
        }
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (const type of Object.keys(this.pools) as ParticleType[]) {
      const pool = this.pools[type];
      for (const p of pool.active) {
        ctx.save();
        ctx.globalAlpha = p.alpha;

        if (type === 'candleFlame' || type === 'furnaceFire' || type === 'successBurst' || type === 'dangerExplosion' || type === 'oreSpark') {
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 8;
        }

        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  getActiveCount(): number {
    let count = 0;
    for (const type of Object.keys(this.pools) as ParticleType[]) {
      count += this.pools[type].active.length;
    }
    return count;
  }
}
