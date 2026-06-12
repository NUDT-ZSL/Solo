export const TILE_SIZE = 64;
export const ROOM_SIZE = 5;
export const BPM = 120;
export const BEAT_INTERVAL = 60000 / BPM;

export type Direction = 'up' | 'down' | 'left' | 'right';

export type EnemyType = 'slime' | 'bat';
export type ItemType = 'rhythm_shield' | 'speed_boots' | 'rhythm_bomb';

export interface Vec2 {
  x: number;
  y: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface RhythmState {
  beatProgress: number;
  lastBeatTime: number;
  isOnBeat: boolean;
  beatWindow: number;
  perfectCombo: number;
  rhythmAccuracy: number;
}

export class Player {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  hp: number;
  maxHp: number;
  attack: number;
  exp: number;
  expToNext: number;
  level: number;
  direction: Direction;
  isAttacking: boolean;
  attackTimer: number;
  attackDuration: number;
  baseSpeed: number;
  speedMultiplier: number;
  moveCooldown: number;
  inventory: Map<ItemType, number>;
  activeShield: boolean;
  shieldTimer: number;
  shieldCooldown: number;
  selectedItem: ItemType | null;
  invincible: boolean;
  invincibleTimer: number;
  displayHp: number;
  lastDamageTime: number;
  isMoving: boolean;
  moveProgress: number;
  fromX: number;
  fromY: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.targetX = x;
    this.targetY = y;
    this.fromX = x;
    this.fromY = y;
    this.hp = 100;
    this.maxHp = 100;
    this.displayHp = 100;
    this.attack = 10;
    this.exp = 0;
    this.expToNext = 200;
    this.level = 1;
    this.direction = 'down';
    this.isAttacking = false;
    this.attackTimer = 0;
    this.attackDuration = 200;
    this.baseSpeed = 1;
    this.speedMultiplier = 1;
    this.moveCooldown = 0;
    this.inventory = new Map();
    this.activeShield = false;
    this.shieldTimer = 0;
    this.shieldCooldown = 0;
    this.selectedItem = null;
    this.invincible = false;
    this.invincibleTimer = 0;
    this.lastDamageTime = 0;
    this.isMoving = false;
    this.moveProgress = 1;
  }

  get moveDuration(): number {
    return BEAT_INTERVAL / this.speedMultiplier;
  }

  takeDamage(amount: number): boolean {
    if (this.invincible) return false;
    this.hp = Math.max(0, this.hp - amount);
    this.lastDamageTime = performance.now();
    this.invincible = true;
    this.invincibleTimer = 500;
    return true;
  }

  heal(amount: number): void {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  gainExp(amount: number): boolean {
    this.exp += amount;
    if (this.exp >= this.expToNext) {
      this.exp -= this.expToNext;
      this.levelUp();
      return true;
    }
    return false;
  }

  levelUp(): void {
    this.level++;
    this.maxHp += 20;
    this.hp = this.maxHp;
    this.displayHp = this.maxHp;
    this.attack += 5;
    this.expToNext = Math.floor(this.expToNext * 1.3);
  }

  addItem(type: ItemType, count: number = 1): void {
    this.inventory.set(type, (this.inventory.get(type) || 0) + count);
    if (!this.selectedItem) {
      this.selectedItem = type;
    }
  }

  useItem(type: ItemType): boolean {
    const count = this.inventory.get(type) || 0;
    if (count <= 0) return false;

    switch (type) {
      case 'rhythm_shield':
        if (this.shieldCooldown > 0) return false;
        this.activeShield = true;
        this.shieldTimer = 3000;
        this.inventory.set(type, count - 1);
        return true;
      case 'speed_boots':
        this.speedMultiplier = 1.15;
        this.inventory.set(type, count - 1);
        return true;
      case 'rhythm_bomb':
        this.inventory.set(type, count - 1);
        return true;
    }
    return false;
  }

  update(dt: number): void {
    if (this.displayHp > this.hp) {
      this.displayHp = Math.max(this.hp, this.displayHp - dt * 0.05);
    }

    if (this.isMoving) {
      this.moveProgress += dt / this.moveDuration;
      if (this.moveProgress >= 1) {
        this.moveProgress = 1;
        this.isMoving = false;
        this.x = this.targetX;
        this.y = this.targetY;
      } else {
        const t = this.easeOutCubic(this.moveProgress);
        this.x = this.fromX + (this.targetX - this.fromX) * t;
        this.y = this.fromY + (this.targetY - this.fromY) * t;
      }
    }

    if (this.isAttacking) {
      this.attackTimer -= dt;
      if (this.attackTimer <= 0) {
        this.isAttacking = false;
      }
    }

    if (this.moveCooldown > 0) {
      this.moveCooldown -= dt;
    }

    if (this.activeShield) {
      this.shieldTimer -= dt;
      if (this.shieldTimer <= 0) {
        this.activeShield = false;
        this.shieldCooldown = 15000;
      }
    }

    if (this.shieldCooldown > 0) {
      this.shieldCooldown -= dt;
    }

    if (this.invincible) {
      this.invincibleTimer -= dt;
      if (this.invincibleTimer <= 0) {
        this.invincible = false;
      }
    }
  }

  easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  canMove(): boolean {
    return !this.isMoving && this.moveCooldown <= 0;
  }

  startMove(dx: number, dy: number): boolean {
    if (!this.canMove()) return false;
    const newTx = this.targetX + dx;
    const newTy = this.targetY + dy;
    if (newTx < 0 || newTx >= ROOM_SIZE || newTy < 0 || newTy >= ROOM_SIZE) {
      return false;
    }
    this.fromX = this.x;
    this.fromY = this.y;
    this.targetX = newTx;
    this.targetY = newTy;
    this.isMoving = true;
    this.moveProgress = 0;
    if (dx > 0) this.direction = 'right';
    else if (dx < 0) this.direction = 'left';
    else if (dy > 0) this.direction = 'down';
    else if (dy < 0) this.direction = 'up';
    return true;
  }

  startAttack(): void {
    this.isAttacking = true;
    this.attackTimer = this.attackDuration;
  }

  getAttackHitbox(): { x: number; y: number; w: number; h: number } {
    const px = this.x * TILE_SIZE + TILE_SIZE / 2;
    const py = this.y * TILE_SIZE + TILE_SIZE / 2;
    const range = TILE_SIZE * 1.2;
    let hx = px, hy = py, hw = range, hh = range * 0.6;
    switch (this.direction) {
      case 'up':
        hx = px - range / 2;
        hy = py - range;
        hw = range;
        hh = range * 0.8;
        break;
      case 'down':
        hx = px - range / 2;
        hy = py + range * 0.2;
        hw = range;
        hh = range * 0.8;
        break;
      case 'left':
        hx = px - range;
        hy = py - range / 2;
        hw = range * 0.8;
        hh = range;
        break;
      case 'right':
        hx = px + range * 0.2;
        hy = py - range / 2;
        hw = range * 0.8;
        hh = range;
        break;
    }
    return { x: hx, y: hy, w: hw, h: hh };
  }
}

export class Enemy {
  id: number;
  type: EnemyType;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  hp: number;
  maxHp: number;
  displayHp: number;
  direction: Direction;
  moveTimer: number;
  moveInterval: number;
  attackTimer: number;
  attackInterval: number;
  isDiving: boolean;
  diveTimer: number;
  diveDuration: number;
  afterimages: Array<{ x: number; y: number; alpha: number }>;
  dying: boolean;
  deathTimer: number;
  hitFlash: number;
  beatPulse: number;

  constructor(id: number, type: EnemyType, x: number, y: number) {
    this.id = id;
    this.type = type;
    this.x = x;
    this.y = y;
    this.targetX = x;
    this.targetY = y;
    if (type === 'slime') {
      this.hp = 30;
      this.maxHp = 30;
      this.moveInterval = 2000;
      this.attackInterval = BEAT_INTERVAL * 2;
    } else {
      this.hp = 15;
      this.maxHp = 15;
      this.moveInterval = 1000;
      this.attackInterval = BEAT_INTERVAL;
    }
    this.displayHp = this.hp;
    this.direction = 'down';
    this.moveTimer = Math.random() * this.moveInterval;
    this.attackTimer = Math.random() * this.attackInterval;
    this.isDiving = false;
    this.diveTimer = 0;
    this.diveDuration = 300;
    this.afterimages = [];
    this.dying = false;
    this.deathTimer = 0;
    this.hitFlash = 0;
    this.beatPulse = 0;
  }

  get gridX(): number { return Math.round(this.x); }
  get gridY(): number { return Math.round(this.y); }

  takeDamage(amount: number): boolean {
    this.hp -= amount;
    this.hitFlash = 150;
    if (this.hp <= 0 && !this.dying) {
      this.dying = true;
      this.deathTimer = 400;
      return true;
    }
    return false;
  }

  update(dt: number, player: Player): void {
    if (this.displayHp > this.hp) {
      this.displayHp = Math.max(this.hp, this.displayHp - dt * 0.08);
    }

    if (this.hitFlash > 0) {
      this.hitFlash -= dt;
    }

    if (this.dying) {
      this.deathTimer -= dt;
      return;
    }

    if (this.type === 'bat' && this.isDiving) {
      this.diveTimer -= dt;
      this.afterimages.unshift({ x: this.x, y: this.y, alpha: 0.6 });
      if (this.afterimages.length > 5) this.afterimages.pop();
      this.afterimages.forEach(img => img.alpha *= 0.85);
      if (this.diveTimer <= 0) {
        this.isDiving = false;
      }
    } else {
      if (this.afterimages.length > 0) {
        this.afterimages.forEach(img => img.alpha *= 0.9);
        this.afterimages = this.afterimages.filter(img => img.alpha > 0.05);
      }
    }

    this.moveTimer -= dt;
    if (this.moveTimer <= 0) {
      this.moveTimer = this.moveInterval;
      this.aiMove(player);
    }

    if (this.type === 'bat') {
      this.attackTimer -= dt;
      if (this.attackTimer <= 0 && !this.isDiving) {
        this.attackTimer = this.attackInterval;
        this.startDive(player);
      }
    }

    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const moveSpeed = (this.type === 'slime' ? 0.5 : 1) * dt / 1000;
    this.x += Math.sign(dx) * Math.min(Math.abs(dx), moveSpeed);
    this.y += Math.sign(dy) * Math.min(Math.abs(dy), moveSpeed);
  }

  aiMove(player: Player): void {
    const px = player.targetX;
    const py = player.targetY;
    const dx = px - this.gridX;
    const dy = py - this.gridY;

    let moveX = 0, moveY = 0;

    if (this.type === 'slime') {
      if (Math.random() < 0.7) {
        if (Math.abs(dx) > Math.abs(dy)) {
          moveX = Math.sign(dx);
        } else {
          moveY = Math.sign(dy);
        }
      } else {
        const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [0, 0]];
        const [rx, ry] = dirs[Math.floor(Math.random() * dirs.length)];
        moveX = rx;
        moveY = ry;
      }
    } else {
      if (Math.random() < 0.85) {
        if (Math.abs(dx) > Math.abs(dy)) {
          moveX = Math.sign(dx);
        } else {
          moveY = Math.sign(dy);
        }
      } else {
        const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        const [rx, ry] = dirs[Math.floor(Math.random() * dirs.length)];
        moveX = rx;
        moveY = ry;
      }
    }

    const newX = Math.max(0, Math.min(ROOM_SIZE - 1, this.gridX + moveX));
    const newY = Math.max(0, Math.min(ROOM_SIZE - 1, this.gridY + moveY));
    this.targetX = newX;
    this.targetY = newY;
    if (moveX > 0) this.direction = 'right';
    else if (moveX < 0) this.direction = 'left';
    else if (moveY > 0) this.direction = 'down';
    else if (moveY < 0) this.direction = 'up';
  }

  startDive(player: Player): void {
    this.isDiving = true;
    this.diveTimer = this.diveDuration;
    const px = player.x;
    const py = player.y;
    const dx = px - this.x;
    const dy = py - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 0) {
      const speed = 3 * dt => dt;
      this.targetX = Math.max(0, Math.min(ROOM_SIZE - 1, this.gridX + Math.sign(dx) * 2));
      this.targetY = Math.max(0, Math.min(ROOM_SIZE - 1, this.gridY + Math.sign(dy) * 2));
    }
  }

  shouldFire(): boolean {
    if (this.type !== 'slime') return false;
    this.attackTimer -= 16;
    if (this.attackTimer <= 0) {
      this.attackTimer = this.attackInterval;
      return true;
    }
    return false;
  }

  getCenter(): Vec2 {
    return {
      x: this.x * TILE_SIZE + TILE_SIZE / 2,
      y: this.y * TILE_SIZE + TILE_SIZE / 2
    };
  }
}

export class Bullet {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetX: number;
  targetY: number;
  speed: number;
  radius: number;
  damage: number;
  life: number;
  maxLife: number;
  isHoming: boolean;
  isEnemy: boolean;
  trail: Vec2[];

  constructor(id: number, x: number, y: number, isEnemy: boolean = true) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.targetX = 0;
    this.targetY = 0;
    this.speed = 200 / 1000;
    this.radius = 4;
    this.damage = 10;
    this.life = 5000;
    this.maxLife = 5000;
    this.isHoming = true;
    this.isEnemy = isEnemy;
    this.trail = [];
  }

  setTarget(tx: number, ty: number): void {
    this.targetX = tx;
    this.targetY = ty;
    const dx = tx - this.x;
    const dy = ty - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 0) {
      this.vx = (dx / dist) * this.speed;
      this.vy = (dy / dist) * this.speed;
    }
  }

  update(dt: number, playerX: number, playerY: number): void {
    this.trail.unshift({ x: this.x, y: this.y });
    if (this.trail.length > 8) this.trail.pop();

    if (this.isHoming && this.isEnemy) {
      const dx = playerX - this.x;
      const dy = playerY - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0) {
        const targetVx = (dx / dist) * this.speed;
        const targetVy = (dy / dist) * this.speed;
        this.vx += (targetVx - this.vx) * 0.02;
        this.vy += (targetVy - this.vy) * 0.02;
        const mag = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        if (mag > 0) {
          this.vx = (this.vx / mag) * this.speed;
          this.vy = (this.vy / mag) * this.speed;
        }
      }
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
  }

  isExpired(): boolean {
    return this.life <= 0;
  }
}

export class Chest {
  id: number;
  x: number;
  y: number;
  rotation: number;
  opened: boolean;
  contents: ItemType;
  pulsePhase: number;

  constructor(id: number, x: number, y: number) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.rotation = 0;
    this.opened = false;
    this.contents = this.rollContents();
    this.pulsePhase = Math.random() * Math.PI * 2;
  }

  rollContents(): ItemType {
    const items: ItemType[] = ['rhythm_shield', 'speed_boots', 'rhythm_bomb'];
    const weights = [0.4, 0.3, 0.3];
    const r = Math.random();
    let acc = 0;
    for (let i = 0; i < items.length; i++) {
      acc += weights[i];
      if (r < acc) return items[i];
    }
    return items[0];
  }

  update(dt: number, beatProgress: number): void {
    this.rotation += 5 * (dt / BEAT_INTERVAL);
    this.pulsePhase = beatProgress * Math.PI * 2;
  }
}

export class Portal {
  x: number;
  y: number;
  rotation: number;
  active: boolean;
  pulsePhase: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.rotation = 0;
    this.active = false;
    this.pulsePhase = 0;
  }

  update(dt: number, beatProgress: number): void {
    this.rotation += 360 * (dt / BEAT_INTERVAL);
    this.pulsePhase = beatProgress * Math.PI * 2;
  }
}

export class Bomb {
  id: number;
  x: number;
  y: number;
  timer: number;
  maxTimer: number;
  exploded: boolean;
  explosionRadius: number;
  damage: number;
  shakeTime: number;

  constructor(id: number, x: number, y: number) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.timer = 1000;
    this.maxTimer = 1000;
    this.exploded = false;
    this.explosionRadius = TILE_SIZE * 2;
    this.damage = 40;
    this.shakeTime = 200;
  }

  update(dt: number): void {
    this.timer -= dt;
    if (this.timer <= 0 && !this.exploded) {
      this.exploded = true;
    }
  }
}
