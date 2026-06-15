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
  rotation: number;
  rotationSpeed: number;
}

interface ParticleConfig {
  width: number;
  height: number;
  color: string;
  minCount: number;
  maxCount: number;
  life: number;
  baseSpeedMin: number;
  baseSpeedMax: number;
  angleMin: number;
  angleMax: number;
  gravity: number;
}

const CONFIGS: Record<MaterialType, ParticleConfig> = {
  grass: {
    width: 4,
    height: 8,
    color: '#22c55e',
    minCount: 12,
    maxCount: 18,
    life: 0.6,
    baseSpeedMin: 80,
    baseSpeedMax: 200,
    angleMin: -Math.PI * 0.8,
    angleMax: -Math.PI * 0.2,
    gravity: 200
  },
  sand: {
    width: 2,
    height: 2,
    color: '#eab308',
    minCount: 8,
    maxCount: 12,
    life: 0.4,
    baseSpeedMin: 60,
    baseSpeedMax: 120,
    angleMin: 0,
    angleMax: Math.PI * 2,
    gravity: 300
  },
  stone: {
    width: 3,
    height: 3,
    color: '#e2e8f0',
    minCount: 4,
    maxCount: 6,
    life: 0.3,
    baseSpeedMin: 50,
    baseSpeedMax: 150,
    angleMin: -Math.PI * 0.7,
    angleMax: -Math.PI * 0.3,
    gravity: 500
  },
  metal: {
    width: 2,
    height: 4,
    color: '#f97316',
    minCount: 6,
    maxCount: 10,
    life: 0.5,
    baseSpeedMin: 100,
    baseSpeedMax: 250,
    angleMin: -Math.PI * 0.65,
    angleMax: -Math.PI * 0.35,
    gravity: 600
  },
  wood: {
    width: 1,
    height: 6,
    color: '#92400e',
    minCount: 10,
    maxCount: 14,
    life: 0.8,
    baseSpeedMin: 40,
    baseSpeedMax: 160,
    angleMin: -Math.PI * 0.75,
    angleMax: -Math.PI * 0.25,
    gravity: 150
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

      const speed = cfg.baseSpeedMin + Math.random() * (cfg.baseSpeedMax - cfg.baseSpeedMin);
      const speedWithOffset = speed * (1 + (Math.random() * 2 - 1) * 0.2);

      const angleRange = cfg.angleMax - cfg.angleMin;
      const angle = cfg.angleMin + Math.random() * angleRange;
      const angleWithOffset = angle + (Math.random() * 2 - 1) * 0.2 * angleRange;

      const vx = Math.cos(angleWithOffset) * speedWithOffset;
      const vy = Math.sin(angleWithOffset) * speedWithOffset;

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
        gravity: cfg.gravity,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 8
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
      p.rotation += p.rotationSpeed * dt;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.width / 2, -p.height / 2, p.width, p.height);
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
