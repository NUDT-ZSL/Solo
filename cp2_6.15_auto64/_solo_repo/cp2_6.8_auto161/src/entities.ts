export interface Vec2 {
  x: number;
  y: number;
}

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;

export const COLORS = {
  TURRET_BASE: '#9B59B6',
  LASER: '#00FF41',
  ENEMY_TRIANGLE: '#2ECC71',
  ENEMY_DIAMOND: '#3498DB',
  HUD_BG: '#2D3748',
  HUD_TEXT: '#FFFFFF',
  TEXT_SHADOW: '#000000',
  LIGHTNING: '#FFF3E0',
  FLASH: '#FFFFFF',
  BG_TOP: '#0B0E1A',
  BG_BOTTOM: '#1A1A2E',
  PANEL_BG: '#1A202C',
  ENERGY_GRAD_START: '#00FF41',
  ENERGY_GRAD_END: '#FFD700'
} as const;

export const PARTICLE_COLORS = ['#FF6B6B', '#FFE66D', '#A29BFE'];

export type EnemyType = 'triangle' | 'diamond';

export interface Poolable {
  active: boolean;
  reset(...args: any[]): void;
}

export class ObjectPool<T extends Poolable> {
  private pool: T[] = [];
  private factory: () => T;
  private maxSize: number;

  constructor(factory: () => T, maxSize = 60) {
    this.factory = factory;
    this.maxSize = maxSize;
  }

  acquire(): T {
    const existing = this.pool.find(obj => !obj.active);
    if (existing) {
      existing.active = true;
      return existing;
    }
    if (this.pool.length < this.maxSize) {
      const obj = this.factory();
      obj.active = true;
      this.pool.push(obj);
      return obj;
    }
    const oldest = this.pool.find(obj => obj.active);
    if (oldest) {
      oldest.active = true;
      return oldest;
    }
    return this.factory();
  }

  getActive(): T[] {
    return this.pool.filter(obj => obj.active);
  }

  getAll(): T[] {
    return this.pool;
  }

  clear(): void {
    this.pool.forEach(obj => obj.active = false);
  }
}

export class Turret {
  x: number;
  y: number;
  angle: number;
  targetAngle: number;
  baseWidth: number;
  baseHeight: number;
  barrelLength: number;
  barrelWidth: number;
  fireCooldown: number;
  fireRate: number;
  collectRadius: number;

  constructor() {
    this.x = CANVAS_WIDTH / 2;
    this.y = CANVAS_HEIGHT - 40;
    this.angle = -Math.PI / 2;
    this.targetAngle = -Math.PI / 2;
    this.baseWidth = 50;
    this.baseHeight = 30;
    this.barrelLength = 25;
    this.barrelWidth = 4;
    this.fireCooldown = 0;
    this.fireRate = 200;
    this.collectRadius = 120;
  }

  update(dt: number, enemies: Enemy[]): Laser | null {
    let nearestEnemy: Enemy | null = null;
    let nearestDist = Infinity;
    for (const e of enemies) {
      if (!e.active) continue;
      const dx = e.x - this.x;
      const dy = e.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestEnemy = e;
      }
    }

    if (nearestEnemy) {
      this.targetAngle = Math.atan2(nearestEnemy.y - this.y, nearestEnemy.x - this.x);
    }

    let diff = this.targetAngle - this.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const maxRot = 0.08;
    if (Math.abs(diff) <= maxRot) {
      this.angle = this.targetAngle;
    } else {
      this.angle += Math.sign(diff) * maxRot;
    }

    this.fireCooldown -= dt;
    if (this.fireCooldown <= 0 && nearestEnemy) {
      this.fireCooldown = this.fireRate;
      const barrelTipX = this.x + Math.cos(this.angle) * this.barrelLength;
      const barrelTipY = this.y + Math.sin(this.angle) * this.barrelLength;
      return new Laser(barrelTipX, barrelTipY, this.angle);
    }
    return null;
  }

  reset(): void {
    this.x = CANVAS_WIDTH / 2;
    this.y = CANVAS_HEIGHT - 40;
    this.angle = -Math.PI / 2;
    this.targetAngle = -Math.PI / 2;
    this.fireCooldown = 0;
  }
}

export class Laser implements Poolable {
  active: boolean;
  x: number;
  y: number;
  angle: number;
  speed: number;
  length: number;
  life: number;
  maxLife: number;

  constructor(x = 0, y = 0, angle = 0) {
    this.active = false;
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.speed = 12;
    this.length = 20;
    this.life = 0;
    this.maxLife = 2000;
  }

  reset(x: number, y: number, angle: number): void {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.life = 0;
    this.active = true;
  }

  update(dt: number): void {
    this.x += Math.cos(this.angle) * this.speed;
    this.y += Math.sin(this.angle) * this.speed;
    this.life += dt;
    if (this.life > this.maxLife ||
        this.x < -50 || this.x > CANVAS_WIDTH + 50 ||
        this.y < -50 || this.y > CANVAS_HEIGHT + 50) {
      this.active = false;
    }
  }
}

export class Enemy implements Poolable {
  active: boolean;
  x: number;
  y: number;
  type: EnemyType;
  color: string;
  speed: number;
  size: number;
  sizeY: number;
  trail: Vec2[];
  hitFlash: number;

  constructor() {
    this.active = false;
    this.x = 0;
    this.y = 0;
    this.type = 'triangle';
    this.color = COLORS.ENEMY_TRIANGLE;
    this.speed = 1.5;
    this.size = 20;
    this.sizeY = 20;
    this.trail = [];
    this.hitFlash = 0;
  }

  reset(type: EnemyType, wave: number, turretX: number, turretY: number): void {
    this.type = type;
    this.color = type === 'triangle' ? COLORS.ENEMY_TRIANGLE : COLORS.ENEMY_DIAMOND;
    this.size = 20;
    this.sizeY = type === 'diamond' ? 14 : 20;
    this.speed = 1.5 + (wave - 1) * 0.3;
    if (this.speed > 3) this.speed = 3;

    const side = Math.floor(Math.random() * 3);
    if (side === 0) {
      this.x = Math.random() * CANVAS_WIDTH;
      this.y = -30;
    } else if (side === 1) {
      this.x = CANVAS_WIDTH + 30;
      this.y = Math.random() * (CANVAS_HEIGHT * 0.7);
    } else {
      this.x = -30;
      this.y = Math.random() * (CANVAS_HEIGHT * 0.7);
    }

    const dx = turretX - this.x;
    const dy = turretY - this.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    this.x = this.x;
    this.y = this.y;
    this.trail = [];
    for (let i = 0; i < 4; i++) {
      this.trail.push({ x: this.x, y: this.y });
    }
    this.hitFlash = 0;
    this.active = true;
  }

  update(dt: number, turretX: number, turretY: number): void {
    this.trail.unshift({ x: this.x, y: this.y });
    if (this.trail.length > 4) this.trail.pop();

    const dx = turretX - this.x;
    const dy = turretY - this.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    this.x += (dx / len) * this.speed;
    this.y += (dy / len) * this.speed;

    if (this.hitFlash > 0) this.hitFlash -= dt;
  }

  getBoundingRadius(): number {
    return this.size * 0.6;
  }
}

export class Fragment implements Poolable {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  life: number;
  maxLife: number;
  initialRadius: number;
  collected: boolean;

  constructor() {
    this.active = false;
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.radius = 0;
    this.color = '#FFFFFF';
    this.life = 0;
    this.maxLife = 5000;
    this.initialRadius = 0;
    this.collected = false;
  }

  reset(x: number, y: number, color: string): void {
    this.x = x;
    this.y = y;
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 3;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.radius = 2 + Math.random() * 2;
    this.initialRadius = this.radius;
    this.color = color;
    this.life = 0;
    this.collected = false;
    this.active = true;
  }

  update(dt: number, turret: Turret): boolean {
    this.life += dt;

    const dx = turret.x - this.x;
    const dy = turret.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < turret.collectRadius) {
      this.collected = true;
      const pullSpeed = 0.25;
      this.vx += (dx / (dist || 1)) * pullSpeed;
      this.vy += (dy / (dist || 1)) * pullSpeed;
    }

    this.x += this.vx;
    this.y += this.vy;
    this.vx *= 0.96;
    this.vy *= 0.96;

    const lifeRatio = 1 - this.life / this.maxLife;
    this.radius = this.initialRadius * Math.max(0, lifeRatio);

    if (this.life > this.maxLife || this.radius < 0.3) {
      this.active = false;
      return false;
    }

    if (this.collected && dist < 15) {
      this.active = false;
      return true;
    }
    return false;
  }
}

export class Particle implements Poolable {
  active: boolean;
  x: number;
  y: number;
  radius: number;
  color: string;
  life: number;
  maxLife: number;

  constructor() {
    this.active = false;
    this.x = 0;
    this.y = 0;
    this.radius = 0;
    this.color = '#FFFFFF';
    this.life = 0;
    this.maxLife = 300;
  }

  reset(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.radius = 3 + Math.random() * 2;
    this.color = PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)];
    this.life = 0;
    this.active = true;
  }

  update(dt: number): void {
    this.life += dt;
    if (this.life > this.maxLife) {
      this.active = false;
    }
  }

  getAlpha(): number {
    return 1 - this.life / this.maxLife;
  }
}

export class LightningBolt implements Poolable {
  active: boolean;
  x: number;
  startY: number;
  length: number;
  width: number;
  branches: { points: Vec2[]; width: number }[];
  life: number;
  maxLife: number;

  constructor() {
    this.active = false;
    this.x = 0;
    this.startY = 0;
    this.length = 200;
    this.width = 4;
    this.branches = [];
    this.life = 0;
    this.maxLife = 800;
  }

  reset(x: number): void {
    this.x = x;
    this.startY = -20;
    this.length = 200;
    this.width = 4;
    this.life = 0;
    this.branches = [];

    const mainPoints: Vec2[] = [];
    let cx = x;
    let cy = this.startY;
    mainPoints.push({ x: cx, y: cy });
    const segments = 10;
    for (let i = 0; i < segments; i++) {
      cy += this.length / segments;
      cx += (Math.random() - 0.5) * 30;
      mainPoints.push({ x: cx, y: cy });
    }
    this.branches.push({ points: mainPoints, width: this.width });

    const numSubBranches = 2 + Math.floor(Math.random() * 2);
    for (let b = 0; b < numSubBranches; b++) {
      const startIdx = 2 + Math.floor(Math.random() * (segments - 3));
      const startPt = mainPoints[startIdx];
      const subPoints: Vec2[] = [];
      let sx = startPt.x;
      let sy = startPt.y;
      subPoints.push({ x: sx, y: sy });
      const subLen = 60 + Math.random() * 60;
      const subSegs = 5;
      const subAngle = (Math.random() - 0.5) * Math.PI * 0.6;
      const baseDx = Math.cos(subAngle);
      const baseDy = Math.abs(Math.sin(subAngle)) + 0.3;
      for (let i = 0; i < subSegs; i++) {
        sx += (baseDx + (Math.random() - 0.5) * 0.5) * (subLen / subSegs);
        sy += (baseDy + (Math.random() - 0.5) * 0.3) * (subLen / subSegs);
        subPoints.push({ x: sx, y: sy });
      }
      this.branches.push({ points: subPoints, width: this.width * 0.5 });
    }

    this.active = true;
  }

  update(dt: number): void {
    this.life += dt;
    if (this.life > this.maxLife) {
      this.active = false;
    }
  }

  getAlpha(): number {
    const lifeRatio = this.life / this.maxLife;
    if (lifeRatio < 0.2) return lifeRatio / 0.2;
    if (lifeRatio > 0.7) return Math.max(0, 1 - (lifeRatio - 0.7) / 0.3);
    return 1;
  }
}

export class Star {
  x: number;
  y: number;
  radius: number;
  baseAlpha: number;
  phase: number;
  period: number;

  constructor() {
    this.x = Math.random() * CANVAS_WIDTH;
    this.y = Math.random() * CANVAS_HEIGHT;
    this.radius = 1 + Math.random();
    this.baseAlpha = 0.2 + Math.random() * 0.6;
    this.phase = Math.random() * Math.PI * 2;
    this.period = 3000 + Math.random() * 3000;
  }

  getAlpha(time: number): number {
    return this.baseAlpha + Math.sin(time / this.period * Math.PI * 2 + this.phase) * 0.2;
  }
}
