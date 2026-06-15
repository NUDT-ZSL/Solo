import { Block } from './material';

export type ParticleType = 'fire' | 'steam' | 'debris' | 'shockwave';

export class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  life: number;
  maxLife: number;
  type: ParticleType;
  alive: boolean = true;
  startRadius?: number;
  endRadius?: number;

  constructor(
    x: number,
    y: number,
    vx: number,
    vy: number,
    radius: number,
    color: string,
    life: number,
    type: ParticleType
  ) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.radius = radius;
    this.color = color;
    this.life = life;
    this.maxLife = life;
    this.type = type;
  }

  update(dt: number = 1): void {
    if (!this.alive) return;

    if (this.type === 'fire') {
      this.vy += -0.05 * dt;
      this.vx += (Math.random() - 0.5) * 0.1 * dt;
      this.vy = Math.max(this.vy, -3);
      this.radius *= 0.985;
      if (this.radius < 0.5) this.radius = 0.5;
    } else if (this.type === 'steam') {
      this.vy += -0.08 * dt;
      this.vx += (Math.random() - 0.5) * 0.15 * dt;
      this.radius *= 1.02;
    } else if (this.type === 'debris') {
      this.vy += 0.15 * dt;
    } else if (this.type === 'shockwave') {
      const t = 1 - this.life / this.maxLife;
      this.radius = (this.startRadius || 5) + ((this.endRadius || 40) - (this.startRadius || 5)) * t;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    this.life -= dt;
    if (this.life <= 0) {
      this.alive = false;
    }
  }

  getAlpha(): number {
    const t = this.life / this.maxLife;
    if (this.type === 'shockwave') {
      return Math.max(0, t * 0.6);
    }
    if (this.type === 'steam') {
      return Math.max(0, t * 0.5);
    }
    return Math.max(0, Math.min(1, t));
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (!this.alive) return;
    const alpha = this.getAlpha();

    if (this.type === 'shockwave') {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.lineWidth = 3;
      ctx.stroke();
      return;
    }

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);

    if (this.type === 'fire') {
      const gradient = ctx.createRadialGradient(
        this.x,
        this.y,
        0,
        this.x,
        this.y,
        this.radius
      );
      gradient.addColorStop(0, `rgba(255, 255, 150, ${alpha})`);
      gradient.addColorStop(0.4, `${this.color}`.replace(')', `, ${alpha})`).replace('rgb', 'rgba'));
      gradient.addColorStop(1, `rgba(255, 69, 0, 0)`);
      ctx.fillStyle = gradient;
    } else if (this.type === 'steam') {
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    } else if (this.type === 'debris') {
      ctx.fillStyle = this.color;
      ctx.globalAlpha = alpha;
    }

    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

export function createFireParticle(x: number, y: number): Particle {
  const radius = 2 + Math.random() * 2;
  const r = 255;
  const g = Math.floor(69 + Math.random() * 140);
  const b = Math.floor(Math.random() * 50);
  const color = `rgb(${r}, ${g}, ${b})`;
  const vx = (Math.random() - 0.5) * 1.5;
  const vy = -(0.5 + Math.random() * 1.5);
  const life = 30 + Math.random() * 30;
  return new Particle(x, y, vx, vy, radius, color, life, 'fire');
}

export function createSteamParticle(x: number, y: number): Particle {
  const radius = 2 + Math.random() * 2;
  const vx = (Math.random() - 0.5) * 1;
  const vy = -(0.5 + Math.random() * 1);
  return new Particle(x, y, vx, vy, radius, 'rgba(255,255,255,0.5)', 20, 'steam');
}

export function createDebrisParticle(x: number, y: number): Particle {
  const radius = 1 + Math.random() * 2;
  const r = 255;
  const g = Math.floor(Math.random() * 140);
  const b = 0;
  const color = `rgb(${r}, ${g}, ${b})`;
  const angle = Math.random() * Math.PI * 2;
  const speed = 2 + Math.random() * 3;
  const vx = Math.cos(angle) * speed;
  const vy = Math.sin(angle) * speed - 1;
  return new Particle(x, y, vx, vy, radius, color, 10, 'debris');
}

export function createShockwave(x: number, y: number): Particle {
  const p = new Particle(x, y, 0, 0, 5, 'rgba(255,255,255,0.8)', 8, 'shockwave');
  p.startRadius = 5;
  p.endRadius = 40;
  return p;
}

export function checkParticleBlockCollision(
  particle: Particle,
  blocks: Map<string, Block>,
  blockSize: number
): Block | null {
  const gx = Math.floor(particle.x / blockSize);
  const gy = Math.floor(particle.y / blockSize);

  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const key = `${gx + dx},${gy + dy}`;
      const block = blocks.get(key);
      if (!block) continue;
      if (block.isBurnt()) continue;

      const closestX = Math.max(block.x, Math.min(particle.x, block.x + block.size));
      const closestY = Math.max(block.y, Math.min(particle.y, block.y + block.size));
      const distX = particle.x - closestX;
      const distY = particle.y - closestY;
      const distSq = distX * distX + distY * distY;

      if (distSq < particle.radius * particle.radius) {
        return block;
      }
    }
  }
  return null;
}
