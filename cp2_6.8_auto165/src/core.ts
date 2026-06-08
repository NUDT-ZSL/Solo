import { lerpColor, clamp, easeOutQuad, lerp, ParticlePool, Particle } from './utils';

export interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  color: string;
  alive: boolean;
}

export interface CorePulse {
  active: boolean;
  time: number;
  duration: number;
  maxRadius: number;
}

export interface EdgePulse {
  active: boolean;
  time: number;
  duration: number;
  width: number;
  speed: number;
  dots: EdgePulseDot[];
}

export interface EdgePulseDot {
  x: number;
  y: number;
  life: number;
  maxLife: number;
  size: number;
}

export interface Enemy {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  color: string;
  alive: boolean;
  age: number;
  speed: number;
  waveIndex: number;
}

export class Core {
  x: number;
  y: number;
  baseRadius: number;
  radius: number;
  energy: number = 0;
  glowRadius: number = 0;
  highlightAngle: number = 0;
  pulsePhase: number = 0;
  bullets: Bullet[] = [];
  bulletSpeed: number = 400;
  corePulse: CorePulse = { active: false, time: 0, duration: 0.6, maxRadius: 600 };
  edgePulse: EdgePulse = { active: false, time: 0, duration: 1, width: 8, speed: 200, dots: [] };
  particlePool: ParticlePool;

  static readonly COLOR_START = '#00FFB9';
  static readonly COLOR_END = '#A78BFA';

  constructor(x: number, y: number, radius: number, particlePool: ParticlePool) {
    this.x = x;
    this.y = y;
    this.baseRadius = radius;
    this.radius = radius;
    this.particlePool = particlePool;
  }

  getColor(): string {
    return lerpColor(Core.COLOR_START, Core.COLOR_END, this.energy / 100);
  }

  getDamage(): number {
    return 1 + this.energy / 25;
  }

  addEnergy(amount: number): void {
    this.energy = clamp(this.energy + amount, 0, 100);
    if (this.energy >= 100) {
      this.triggerCorePulse();
    }
  }

  triggerCorePulse(): void {
    this.corePulse.active = true;
    this.corePulse.time = 0;
  }

  triggerEdgePulse(enemies: Enemy[], canvasWidth: number, canvasHeight: number): void {
    this.edgePulse.active = true;
    this.edgePulse.time = 0;
    this.edgePulse.dots = [];
    for (let i = 0; i < 40; i++) {
      const side = Math.floor(Math.random() * 4);
      let x: number, y: number;
      switch (side) {
        case 0:
          x = Math.random() * canvasWidth;
          y = 0;
          break;
        case 1:
          x = canvasWidth;
          y = Math.random() * canvasHeight;
          break;
        case 2:
          x = Math.random() * canvasWidth;
          y = canvasHeight;
          break;
        default:
          x = 0;
          y = Math.random() * canvasHeight;
      }
      this.edgePulse.dots.push({
        x,
        y,
        life: 2,
        maxLife: 2,
        size: 1 + Math.random()
      });
    }
    for (const e of enemies) {
      if (!e.alive) continue;
      const dx = e.x - this.x;
      const dy = e.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0) {
        e.x += (dx / dist) * 50;
        e.y += (dy / dist) * 50;
      }
    }
  }

  fireBullet(targetX: number, targetY: number): void {
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist === 0) return;
    const color = this.getColor();
    this.bullets.push({
      x: this.x,
      y: this.y,
      vx: (dx / dist) * this.bulletSpeed,
      vy: (dy / dist) * this.bulletSpeed,
      radius: 6,
      damage: this.getDamage(),
      color,
      alive: true
    });
  }

  update(dt: number, enemies: Enemy[], canvasWidth: number, canvasHeight: number, onEnemyAbsorbed: () => void): void {
    this.pulsePhase += dt * 3;
    this.highlightAngle += dt * 1.5;
    const pulse = Math.sin(this.pulsePhase) * 0.05 * (this.energy / 100 + 0.3);
    this.radius = this.baseRadius * (1 + pulse) + this.energy * 0.1;
    this.glowRadius = 8 + this.energy * 0.4;

    for (const b of this.bullets) {
      if (!b.alive) continue;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.x < -20 || b.x > canvasWidth + 20 || b.y < -20 || b.y > canvasHeight + 20) {
        b.alive = false;
        continue;
      }
      for (const e of enemies) {
        if (!e.alive) continue;
        const ddx = b.x - e.x;
        const ddy = b.y - e.y;
        if (ddx * ddx + ddy * ddy < (b.radius + e.size) * (b.radius + e.size)) {
          b.alive = false;
          e.alive = false;
          onEnemyAbsorbed();
          break;
        }
      }
    }
    this.bullets = this.bullets.filter((b) => b.alive);

    if (this.corePulse.active) {
      this.corePulse.time += dt;
      const progress = this.corePulse.time / this.corePulse.duration;
      const currentRadius = this.corePulse.maxRadius * easeOutQuad(progress);
      for (const e of enemies) {
        if (!e.alive) continue;
        const ddx = e.x - this.x;
        const ddy = e.y - this.y;
        if (ddx * ddx + ddy * ddy < currentRadius * currentRadius) {
          e.alive = false;
          onEnemyAbsorbed();
        }
      }
      if (this.corePulse.time >= this.corePulse.duration) {
        this.corePulse.active = false;
        this.corePulse.time = 0;
        this.energy = 0;
      }
    }

    if (this.edgePulse.active) {
      this.edgePulse.time += dt;
      for (const d of this.edgePulse.dots) {
        d.life -= dt;
      }
      this.edgePulse.dots = this.edgePulse.dots.filter((d) => d.life > 0);
      if (this.edgePulse.time >= this.edgePulse.duration) {
        this.edgePulse.active = false;
        this.edgePulse.time = 0;
      }
    }
  }

  render(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number): void {
    for (const b of this.bullets) {
      ctx.save();
      ctx.shadowColor = b.color;
      ctx.shadowBlur = 15;
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    if (this.corePulse.active) {
      const progress = this.corePulse.time / this.corePulse.duration;
      const alpha = 0.6 * (1 - progress);
      const currentRadius = this.corePulse.maxRadius * easeOutQuad(progress);
      ctx.save();
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.lineWidth = 6;
      ctx.shadowColor = '#FFFFFF';
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(this.x, this.y, currentRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    if (this.edgePulse.active) {
      const progress = this.edgePulse.time / this.edgePulse.duration;
      const diagonal = Math.sqrt(canvasWidth * canvasWidth + canvasHeight * canvasHeight);
      const startRadius = diagonal;
      const endRadius = 0;
      const currentRadius = lerp(startRadius, endRadius, easeOutQuad(progress));
      ctx.save();
      ctx.strokeStyle = `rgba(0, 212, 255, ${0.6 * (1 - progress)})`;
      ctx.lineWidth = this.edgePulse.width;
      ctx.shadowColor = '#00D4FF';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(this.x, this.y, currentRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      for (const d of this.edgePulse.dots) {
        const dp = d.life / d.maxLife;
        ctx.save();
        ctx.globalAlpha = dp;
        ctx.fillStyle = '#00D4FF';
        ctx.shadowColor = '#00D4FF';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    const color = this.getColor();
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = this.glowRadius + 8;
    const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius * 1.5);
    gradient.addColorStop(0, color);
    gradient.addColorStop(0.5, color + '80');
    gradient.addColorStop(1, color + '00');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = this.glowRadius;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.highlightAngle);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      ctx.rotate((Math.PI * 2) / 3);
      ctx.beginPath();
      ctx.arc(0, 0, this.radius * 0.7, -0.4, 0.4);
      ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.shadowColor = '#FFFFFF';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  renderParticles(ctx: CanvasRenderingContext2D): void {
    const particles = this.particlePool.getParticles();
    for (const p of particles) {
      const lifeRatio = p.life / p.maxLife;
      const alpha = easeOutQuad(lifeRatio);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * lifeRatio, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  absorbParticlesToCore(dt: number): void {
    const particles = this.particlePool.getParticles();
    for (const p of particles) {
      const dx = this.x - p.x;
      const dy = this.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0) {
        const attraction = 200 * dt;
        p.vx += (dx / dist) * attraction;
        p.vy += (dy / dist) * attraction;
      }
    }
  }
}
