export interface Vec2 {
  x: number;
  y: number;
}

export interface TrailPoint extends Vec2 {
  life: number;
  maxLife: number;
}

export type PlayerId = 1 | 2;

export const SHIP_RADIUS = 15;
export const SHIP_SPEED = 200;
export const BULLET_SPEED = 400;
export const BULLET_FIRE_INTERVAL = 0.3;
export const MAX_SHIELD_LAYERS = 3;
export const SHIELD_DURATION = 5;
export const INITIAL_LIVES = 5;
export const SHARD_LIFETIME = 15;
export const SHARD_SPAWN_INTERVAL = 3;
export const HIT_FLASH_DURATION = 0.2;
export const EXPLOSION_PARTICLE_COUNT = 30;
export const EXPLOSION_RADIUS = 80;
export const EXPLOSION_DURATION = 1;
export const WIN_DISPLAY_DURATION = 3;
export const TRAIL_MAX_LIFE = 0.5;
export const HUD_FLASH_DURATION = 0.3;

export class Ship {
  pos: Vec2;
  vel: Vec2;
  id: PlayerId;
  lives: number = INITIAL_LIVES;
  shieldLayers: number = 0;
  shieldTimers: number[] = [];
  trail: TrailPoint[] = [];
  fireCooldown: number = 0;
  hitFlashTimer: number = 0;
  alive: boolean = true;
  angle: number = 0;

  constructor(id: PlayerId, x: number, y: number) {
    this.id = id;
    this.pos = { x, y };
    this.vel = { x: 0, y: 0 };
    this.angle = id === 1 ? 0 : Math.PI;
  }

  get color(): string {
    return this.id === 1 ? '#ff3366' : '#3399ff';
  }

  get glowColor(): string {
    return this.id === 1 ? 'rgba(255, 51, 102, 0.6)' : 'rgba(51, 153, 255, 0.6)';
  }

  update(dt: number, canvasWidth: number, canvasHeight: number) {
    this.pos.x += this.vel.x * dt;
    this.pos.y += this.vel.y * dt;

    if (this.vel.x !== 0 || this.vel.y !== 0) {
      this.angle = Math.atan2(this.vel.y, this.vel.x);
    }

    if (this.pos.x - SHIP_RADIUS < 0) {
      this.pos.x = SHIP_RADIUS;
      this.vel.x = -this.vel.x;
    } else if (this.pos.x + SHIP_RADIUS > canvasWidth) {
      this.pos.x = canvasWidth - SHIP_RADIUS;
      this.vel.x = -this.vel.x;
    }
    if (this.pos.y - SHIP_RADIUS < 0) {
      this.pos.y = SHIP_RADIUS;
      this.vel.y = -this.vel.y;
    } else if (this.pos.y + SHIP_RADIUS > canvasHeight) {
      this.pos.y = canvasHeight - SHIP_RADIUS;
      this.vel.y = -this.vel.y;
    }

    this.trail.unshift({ x: this.pos.x, y: this.pos.y, life: TRAIL_MAX_LIFE, maxLife: TRAIL_MAX_LIFE });
    if (this.trail.length > 60) {
      this.trail.pop();
    }
    for (let i = this.trail.length - 1; i >= 0; i--) {
      this.trail[i].life -= dt;
      if (this.trail[i].life <= 0) {
        this.trail.splice(i, 1);
      }
    }

    if (this.fireCooldown > 0) {
      this.fireCooldown -= dt;
      if (this.fireCooldown < 0) this.fireCooldown = 0;
    }

    if (this.hitFlashTimer > 0) {
      this.hitFlashTimer -= dt;
      if (this.hitFlashTimer < 0) this.hitFlashTimer = 0;
    }

    for (let i = this.shieldTimers.length - 1; i >= 0; i--) {
      this.shieldTimers[i] -= dt;
      if (this.shieldTimers[i] <= 0) {
        this.shieldTimers.splice(i, 1);
        this.shieldLayers = this.shieldTimers.length;
      }
    }
  }

  addShield() {
    if (this.shieldLayers < MAX_SHIELD_LAYERS) {
      this.shieldTimers.push(SHIELD_DURATION);
      this.shieldLayers = this.shieldTimers.length;
    }
  }

  canFire(): boolean {
    return this.fireCooldown <= 0 && this.alive;
  }

  fire() {
    this.fireCooldown = BULLET_FIRE_INTERVAL;
  }

  hit(): boolean {
    if (this.shieldLayers > 0) {
      this.shieldTimers.pop();
      this.shieldLayers = this.shieldTimers.length;
      this.hitFlashTimer = HIT_FLASH_DURATION;
      return false;
    }
    this.lives--;
    this.hitFlashTimer = HIT_FLASH_DURATION;
    if (this.lives <= 0) {
      this.lives = 0;
      this.alive = false;
    }
    return !this.alive;
  }

  render(ctx: CanvasRenderingContext2D) {
    for (const point of this.trail) {
      const alpha = (point.life / point.maxLife) * 0.6;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 2;
      ctx.shadowColor = this.glowColor;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(point.x, point.y, 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    if (!this.alive) return;

    ctx.save();
    ctx.translate(this.pos.x, this.pos.y);
    ctx.rotate(this.angle);

    const drawColor = this.hitFlashTimer > 0 ? '#ffffff' : this.color;

    ctx.shadowColor = this.glowColor;
    ctx.shadowBlur = 15;
    ctx.fillStyle = drawColor;
    ctx.strokeStyle = drawColor;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(SHIP_RADIUS, 0);
    ctx.lineTo(-SHIP_RADIUS * 0.7, SHIP_RADIUS * 0.7);
    ctx.lineTo(-SHIP_RADIUS * 0.4, 0);
    ctx.lineTo(-SHIP_RADIUS * 0.7, -SHIP_RADIUS * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    if (this.shieldLayers > 0) {
      ctx.rotate(-this.angle);
      for (let i = 0; i < this.shieldLayers; i++) {
        const r = SHIP_RADIUS + 5 + i * 4;
        ctx.globalAlpha = 0.7 - i * 0.15;
        ctx.strokeStyle = this.id === 1 ? '#ffaa44' : '#44aaff';
        ctx.lineWidth = 1;
        ctx.shadowColor = ctx.strokeStyle as string;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    ctx.restore();
  }
}

export class Bullet {
  pos: Vec2;
  vel: Vec2;
  owner: PlayerId;
  alive: boolean = true;
  radius: number = 4;

  constructor(owner: PlayerId, x: number, y: number, vx: number, vy: number) {
    this.owner = owner;
    this.pos = { x, y };
    this.vel = { x: vx, y: vy };
  }

  get color(): string {
    return this.owner === 1 ? '#ff3366' : '#3399ff';
  }

  get glowColor(): string {
    return this.owner === 1 ? 'rgba(255, 51, 102, 0.8)' : 'rgba(51, 153, 255, 0.8)';
  }

  update(dt: number, canvasWidth: number, canvasHeight: number) {
    this.pos.x += this.vel.x * dt;
    this.pos.y += this.vel.y * dt;
    if (
      this.pos.x < -this.radius ||
      this.pos.x > canvasWidth + this.radius ||
      this.pos.y < -this.radius ||
      this.pos.y > canvasHeight + this.radius
    ) {
      this.alive = false;
    }
  }

  render(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.glowColor;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(this.pos.x, this.pos.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export class EnergyShard {
  pos: Vec2;
  rotation: number;
  life: number = SHARD_LIFETIME;
  alive: boolean = true;
  radius: number = 14;
  flashPhase: number = 0;

  constructor(x: number, y: number) {
    this.pos = { x, y };
    this.rotation = Math.random() * Math.PI * 2;
  }

  update(dt: number) {
    this.rotation += dt * 2;
    this.flashPhase += dt * 8;
    this.life -= dt;
    if (this.life <= 0) {
      this.alive = false;
    }
  }

  render(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.pos.x, this.pos.y);
    ctx.rotate(this.rotation);

    const flash = 0.7 + 0.3 * Math.sin(this.flashPhase);
    const alpha = Math.min(1, this.life / 2) * flash;
    ctx.globalAlpha = alpha;

    ctx.shadowColor = 'rgba(255, 220, 50, 0.9)';
    ctx.shadowBlur = 20;
    ctx.fillStyle = '#ffdd33';
    ctx.strokeStyle = '#ffff88';
    ctx.lineWidth = 2;

    const sides = 6;
    const size = 12;
    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
      const angle = (i / sides) * Math.PI * 2;
      const px = Math.cos(angle) * size;
      const py = Math.sin(angle) * size;
      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }
}

const NEBULA_COLORS = [
  { r: 100, g: 50, b: 200 },
  { r: 200, g: 80, b: 180 },
  { r: 80, g: 200, b: 200 },
  { r: 150, g: 100, b: 255 },
  { r: 255, g: 120, b: 200 },
];

export class Nebula {
  pos: Vec2;
  vel: Vec2;
  radius: number;
  color: { r: number; g: number; b: number };
  alphaPhase: number;
  alphaPeriod: number;
  minAlpha: number = 0.1;
  maxAlpha: number = 0.4;

  constructor(x: number, y: number) {
    this.pos = { x, y };
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.2;
    this.vel = {
      x: Math.cos(angle) * speed,
      y: Math.sin(angle) * speed,
    };
    this.radius = 80 + Math.random() * 70;
    this.color = NEBULA_COLORS[Math.floor(Math.random() * NEBULA_COLORS.length)];
    this.alphaPhase = Math.random() * Math.PI * 2;
    this.alphaPeriod = 3 + Math.random() * 2;
  }

  get currentAlpha(): number {
    const t = this.alphaPhase;
    return this.minAlpha + ((this.maxAlpha - this.minAlpha) / 2) * (1 + Math.sin(t));
  }

  update(dt: number, canvasWidth: number, canvasHeight: number) {
    this.pos.x += this.vel.x;
    this.pos.y += this.vel.y;
    this.alphaPhase += (dt * Math.PI * 2) / this.alphaPeriod;

    if (this.pos.x < this.radius) {
      this.pos.x = this.radius;
      this.vel.x = -this.vel.x;
    } else if (this.pos.x > canvasWidth - this.radius) {
      this.pos.x = canvasWidth - this.radius;
      this.vel.x = -this.vel.x;
    }
    if (this.pos.y < this.radius) {
      this.pos.y = this.radius;
      this.vel.y = -this.vel.y;
    } else if (this.pos.y > canvasHeight - this.radius) {
      this.pos.y = canvasHeight - this.radius;
      this.vel.y = -this.vel.y;
    }
  }

  resolveCollision(other: Nebula) {
    const dx = other.pos.x - this.pos.x;
    const dy = other.pos.y - this.pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const minDist = this.radius + other.radius;
    if (dist < minDist && dist > 0) {
      const nx = dx / dist;
      const ny = dy / dist;
      const overlap = (minDist - dist) / 2;
      this.pos.x -= nx * overlap;
      this.pos.y -= ny * overlap;
      other.pos.x += nx * overlap;
      other.pos.y += ny * overlap;

      const tempVx = this.vel.x;
      const tempVy = this.vel.y;
      this.vel.x = other.vel.x;
      this.vel.y = other.vel.y;
      other.vel.x = tempVx;
      other.vel.y = tempVy;
    }
  }

  render(ctx: CanvasRenderingContext2D) {
    const { r, g, b } = this.color;
    const alpha = this.currentAlpha;
    const gradient = ctx.createRadialGradient(
      this.pos.x, this.pos.y, 0,
      this.pos.x, this.pos.y, this.radius
    );
    gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha})`);
    gradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${alpha * 0.4})`);
    gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

    ctx.save();
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.pos.x, this.pos.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export class Particle {
  pos: Vec2;
  vel: Vec2;
  color: string;
  life: number;
  maxLife: number;
  size: number;
  alive: boolean = true;

  constructor(x: number, y: number, angle: number, speed: number, color: string, life: number) {
    this.pos = { x, y };
    this.vel = {
      x: Math.cos(angle) * speed,
      y: Math.sin(angle) * speed,
    };
    this.color = color;
    this.life = life;
    this.maxLife = life;
    this.size = 2 + Math.random() * 3;
  }

  update(dt: number) {
    this.pos.x += this.vel.x * dt;
    this.pos.y += this.vel.y * dt;
    this.life -= dt;
    if (this.life <= 0) {
      this.alive = false;
    }
  }

  render(ctx: CanvasRenderingContext2D) {
    const alpha = Math.max(0, this.life / this.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(this.pos.x, this.pos.y, this.size * alpha, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
