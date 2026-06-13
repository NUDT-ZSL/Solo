import { MaterialType } from './PhysicsEngine';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  width: number;
  height: number;
  alpha: number;
  gravity: number;
}

interface ParticleConfig {
  width: number;
  height: number;
  color: string;
  minCount: number;
  maxCount: number;
  life: number;
  speedX: [number, number];
  speedY: [number, number];
  gravity: number;
}

const CONFIGS: Record<MaterialType, ParticleConfig> = {
  grass: {
    width: 4, height: 8, color: '#22c55e',
    minCount: 12, maxCount: 18, life: 0.6,
    speedX: [-60, 60], speedY: [-200, -80], gravity: 300
  },
  sand: {
    width: 2, height: 2, color: '#eab308',
    minCount: 8, maxCount: 12, life: 0.4,
    speedX: [-120, 120], speedY: [-120, 120], gravity: 400
  },
  stone: {
    width: 3, height: 3, color: '#e2e8f0',
    minCount: 4, maxCount: 6, life: 0.3,
    speedX: [-80, 80], speedY: [-150, -50], gravity: 500
  },
  metal: {
    width: 2, height: 4, color: '#f97316',
    minCount: 6, maxCount: 10, life: 0.5,
    speedX: [-40, 40], speedY: [-250, -100], gravity: 600
  },
  wood: {
    width: 1, height: 6, color: '#92400e',
    minCount: 10, maxCount: 14, life: 0.8,
    speedX: [-70, 70], speedY: [-160, -40], gravity: 200
  }
};

const MAX_PARTICLES = 200;

export class ParticleSystem {
  particles: Particle[];

  constructor() {
    this.particles = [];
  }

  emit(x: number, y: number, type: MaterialType): void {
    const cfg = CONFIGS[type];
    const count = cfg.minCount + Math.floor(Math.random() * (cfg.maxCount - cfg.minCount + 1));

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= MAX_PARTICLES) break;

      const offset = 0.2;
      const baseVx = cfg.speedX[0] + Math.random() * (cfg.speedX[1] - cfg.speedX[0]);
      const baseVy = cfg.speedY[0] + Math.random() * (cfg.speedY[1] - cfg.speedY[0]);

      const vx = baseVx * (1 + (Math.random() * 2 - 1) * offset);
      const vy = baseVy * (1 + (Math.random() * 2 - 1) * offset);

      this.particles.push({
        x: x + (Math.random() - 0.5) * 20,
        y,
        vx,
        vy,
        life: cfg.life,
        maxLife: cfg.life,
        color: cfg.color,
        width: cfg.width,
        height: cfg.height,
        alpha: 1,
        gravity: cfg.gravity
      });
    }
  }

  update(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      p.alpha = Math.max(0, p.life / p.maxLife);

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.width / 2, p.y - p.height / 2, p.width, p.height);
      ctx.restore();
    }
  }

  getCount(): number {
    return this.particles.length;
  }

  clear(): void {
    this.particles = [];
  }
}
