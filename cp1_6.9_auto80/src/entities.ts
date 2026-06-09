export type CocoonColor = 'red' | 'green' | 'blue';
export type WormColor = CocoonColor | 'gold';

export interface Vec2 {
  x: number;
  y: number;
}

export const COCOON_COLORS: Record<CocoonColor, string> = {
  red: '#FF3333',
  green: '#33FF33',
  blue: '#3333FF'
};

export const WORM_COLORS: Record<WormColor, string> = {
  red: '#FF5555',
  green: '#55FF55',
  blue: '#5555FF',
  gold: '#FFD700'
};

export const CRYSTAL_COLOR = '#FFFFFF';

export const GRID_COLS = 10;
export const GRID_ROWS = 8;
export const CELL_SIZE = 40;
export const LOGICAL_W = GRID_COLS * CELL_SIZE;
export const LOGICAL_H = GRID_ROWS * CELL_SIZE;

export const MAX_COCOONS = 15;
export const MAX_PARTICLES = 300;
export const SILK_DISTANCE = 150;
export const CRYSTAL_RADIUS = 20;
export const TOTAL_WAVES = 10;

export const COCOON_COST = 30;
export const UPGRADE_COSTS: Record<number, number> = { 1: 20, 2: 40 };

export class LevelStats {
  public fireInterval: number;
  public rayLength: number;
  public haloRadius: number;
  public silkPulseHz: number;

  constructor(level: 1 | 2 | 3) {
    if (level === 1) {
      this.fireInterval = 0.20;
      this.rayLength = 120;
      this.haloRadius = 20;
      this.silkPulseHz = 1;
    } else if (level === 2) {
      this.fireInterval = 0.16;
      this.rayLength = 150;
      this.haloRadius = 25;
      this.silkPulseHz = 1.5;
    } else {
      this.fireInterval = 0.12;
      this.rayLength = 180;
      this.haloRadius = 30;
      this.silkPulseHz = 2;
    }
  }
}

export class LightCocoon {
  public id: number;
  public position: Vec2;
  public color: CocoonColor;
  public level: 1 | 2 | 3;
  public stats: LevelStats;
  public lastFireTime: number;
  public rotation: number;
  public fadeInAlpha: number;
  public pulsePhase: number;
  public gridCell: { col: number; row: number };

  private static idCounter = 0;

  constructor(position: Vec2, color: CocoonColor, gridCell: { col: number; row: number }) {
    this.id = ++LightCocoon.idCounter;
    this.position = { ...position };
    this.color = color;
    this.level = 1;
    this.stats = new LevelStats(1);
    this.lastFireTime = 0;
    this.rotation = 0;
    this.fadeInAlpha = 0;
    this.pulsePhase = 0;
    this.gridCell = gridCell;
  }

  upgrade(): boolean {
    if (this.level >= 3) return false;
    this.level = (this.level + 1) as 1 | 2 | 3;
    this.stats = new LevelStats(this.level);
    return true;
  }

  update(dt: number) {
    this.rotation += (dt / 6) * Math.PI * 2;
    this.pulsePhase += dt * (1 / 1.5) * Math.PI * 2;
    if (this.fadeInAlpha < 1) {
      this.fadeInAlpha = Math.min(1, this.fadeInAlpha + dt / 0.5);
    }
  }
}

export class Worm {
  public id: number;
  public position: Vec2;
  public color: WormColor;
  public hp: number;
  public maxHp: number;
  public speed: number;
  public baseSpeed: number;
  public pathTarget: Vec2;
  public turnTimer: number;
  public slowTimer: number;
  public isElite: boolean;
  public hitFlashTimer: number;
  public dead: boolean;
  public reachedCrystal: boolean;

  private static idCounter = 0;

  constructor(position: Vec2, color: WormColor, waveMultiplier: number) {
    this.id = ++Worm.idCounter;
    this.position = { ...position };
    this.color = color;
    this.isElite = color === 'gold';
    this.baseSpeed = 40 * waveMultiplier;
    this.speed = this.baseSpeed;
    this.hp = this.isElite ? 30 : 10;
    this.maxHp = this.hp;
    this.turnTimer = 0;
    this.slowTimer = 0;
    this.hitFlashTimer = 0;
    this.dead = false;
    this.reachedCrystal = false;
    const cx = LOGICAL_W / 2;
    const cy = LOGICAL_H / 2;
    this.pathTarget = { x: cx, y: cy };
  }

  applySlow() {
    if (this.isElite) return;
    this.slowTimer = Math.max(this.slowTimer, 1);
    this.speed = this.baseSpeed * 0.5;
  }

  applyHitFlash() {
    this.hitFlashTimer = Math.max(this.hitFlashTimer, 0.2);
  }

  takeDamage(damage: number) {
    this.hp -= damage;
    if (this.hp <= 0) {
      this.hp = 0;
      this.dead = true;
    }
  }

  update(dt: number) {
    if (this.slowTimer > 0) {
      this.slowTimer -= dt;
      if (this.slowTimer <= 0) {
        this.speed = this.baseSpeed;
        this.slowTimer = 0;
      }
    }
    if (this.hitFlashTimer > 0) {
      this.hitFlashTimer -= dt;
      if (this.hitFlashTimer < 0) this.hitFlashTimer = 0;
    }

    const dx = this.pathTarget.x - this.position.x;
    const dy = this.pathTarget.y - this.position.y;
    const dist = Math.hypot(dx, dy);

    if (dist < 2) {
      this.turnTimer = 0;
    } else {
      const moveDist = this.speed * dt;
      this.position.x += (dx / dist) * moveDist;
      this.position.y += (dy / dist) * moveDist;
    }

    this.turnTimer += dt;
    if (this.turnTimer * this.speed >= 50) {
      this.turnTimer = 0;
      this.retargetToCrystal();
    }
  }

  private retargetToCrystal() {
    const cx = LOGICAL_W / 2;
    const cy = LOGICAL_H / 2;
    const dx = cx - this.position.x;
    const dy = cy - this.position.y;
    const baseAngle = Math.atan2(dy, dx);
    const offset = (Math.random() - 0.5) * 2 * (Math.PI / 4);
    const newAngle = baseAngle + offset;
    const newDist = Math.hypot(dx, dy);
    this.pathTarget = {
      x: this.position.x + Math.cos(newAngle) * Math.min(newDist, 80),
      y: this.position.y + Math.sin(newAngle) * Math.min(newDist, 80)
    };
  }
}

export class Ray {
  public start: Vec2;
  public end: Vec2;
  public color: CocoonColor;
  public lifetime: number;
  public hitWorms: Set<number>;

  constructor(start: Vec2, end: Vec2, color: CocoonColor) {
    this.start = { ...start };
    this.end = { ...end };
    this.color = color;
    this.lifetime = 0.12;
    this.hitWorms = new Set();
  }

  update(dt: number) {
    this.lifetime -= dt;
  }

  get isDead(): boolean {
    return this.lifetime <= 0;
  }
}

export class Particle {
  public position: Vec2;
  public velocity: Vec2;
  public color: string;
  public radius: number;
  public lifetime: number;
  public maxLifetime: number;
  public trail: Array<{ x: number; y: number }>;

  constructor(position: Vec2, direction: Vec2, color: string, speed: number, radius: number, lifetime: number) {
    this.position = { ...position };
    this.velocity = { x: direction.x * speed, y: direction.y * speed };
    this.color = color;
    this.radius = radius;
    this.lifetime = lifetime;
    this.maxLifetime = lifetime;
    this.trail = [];
  }

  update(dt: number) {
    this.trail.push({ x: this.position.x, y: this.position.y });
    const maxTrail = 6;
    if (this.trail.length > maxTrail) {
      this.trail.shift();
    }
    this.position.x += this.velocity.x * dt;
    this.position.y += this.velocity.y * dt;
    this.velocity.x *= Math.pow(0.02, dt / 0.3);
    this.velocity.y *= Math.pow(0.02, dt / 0.3);
    this.lifetime -= dt;
  }

  get isDead(): boolean {
    return this.lifetime <= 0;
  }

  get alpha(): number {
    return Math.max(0, this.lifetime / this.maxLifetime);
  }
}

export class SilkThread {
  public fromCocoonId: number;
  public toCocoonId: number;
  public from: Vec2;
  public to: Vec2;
  public level: number;
  public pulsePhase: number;
  public opacity: number;
  public hitWorms: Map<number, number>;
  private pulseHz: number;

  constructor(from: LightCocoon, to: LightCocoon) {
    this.fromCocoonId = from.id;
    this.toCocoonId = to.id;
    this.from = from.position;
    this.to = to.position;
    this.level = Math.max(from.level, to.level);
    this.pulsePhase = 0;
    this.opacity = 0.5;
    this.hitWorms = new Map();
    this.pulseHz = new LevelStats(Math.min(3, this.level) as 1 | 2 | 3).silkPulseHz;
  }

  update(dt: number) {
    this.pulsePhase += dt * this.pulseHz * Math.PI * 2;
  }

  getPulseOpacity(): number {
    return 0.35 + 0.15 * Math.abs(Math.sin(this.pulsePhase));
  }
}

export class Vortex {
  public position: Vec2;
  public rotation: number;
  public radius: number;
  public cocoonCount: number;

  constructor() {
    this.position = { x: LOGICAL_W / 2, y: LOGICAL_H / 2 };
    this.rotation = 0;
    this.radius = 60;
    this.cocoonCount = 0;
  }

  update(dt: number, cocoonCount: number) {
    this.cocoonCount = cocoonCount;
    this.rotation += dt * Math.PI * 0.8;
    this.radius = 50 + Math.min(cocoonCount, 10) * 6;
  }
}
