import { GameMap } from './map';

export const PLAYER_SPEED = 120;
export const BULLET_SPEED = 300;
export const BULLET_COST = 2;
export const INITIAL_LANTERN_TIME = 100;
export const PLAYER_HEAD_RADIUS = 10;
export const PLAYER_BODY_LENGTH = 20;

export interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  trail: { x: number; y: number }[];
  alive: boolean;
}

export class Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  displayVx: number;
  displayVy: number;
  lanternTime: number;
  maxLanternTime: number;
  bullets: Bullet[];
  keys: Set<string>;
  mouseX: number;
  mouseY: number;
  facingAngle: number;
  pulseTime: number;
  collectedMushrooms: number;
  defeatedCreatures: number;
  maxBullets: number;
  usedBullets: number;

  constructor(startX: number, startY: number) {
    this.x = startX;
    this.y = startY;
    this.vx = 0;
    this.vy = 0;
    this.displayVx = 0;
    this.displayVy = 0;
    this.lanternTime = INITIAL_LANTERN_TIME;
    this.maxLanternTime = INITIAL_LANTERN_TIME;
    this.bullets = [];
    this.keys = new Set();
    this.mouseX = 0;
    this.mouseY = 0;
    this.facingAngle = 0;
    this.pulseTime = 0;
    this.collectedMushrooms = 0;
    this.defeatedCreatures = 0;
    this.maxBullets = Math.floor(INITIAL_LANTERN_TIME / BULLET_COST);
    this.usedBullets = 0;
  }

  reset(startX: number, startY: number): void {
    this.x = startX;
    this.y = startY;
    this.vx = 0;
    this.vy = 0;
    this.displayVx = 0;
    this.displayVy = 0;
    this.lanternTime = INITIAL_LANTERN_TIME;
    this.maxLanternTime = INITIAL_LANTERN_TIME;
    this.bullets = [];
    this.pulseTime = 0;
    this.collectedMushrooms = 0;
    this.defeatedCreatures = 0;
    this.usedBullets = 0;
    this.maxBullets = Math.floor(INITIAL_LANTERN_TIME / BULLET_COST);
  }

  handleKeyDown(code: string): void {
    this.keys.add(code);
  }

  handleKeyUp(code: string): void {
    this.keys.delete(code);
  }

  handleMouseMove(x: number, y: number): void {
    this.mouseX = x;
    this.mouseY = y;
  }

  handleClick(clickX: number, clickY: number): boolean {
    if (this.lanternTime <= BULLET_COST) return false;

    const headX = this.x;
    const headY = this.y - PLAYER_BODY_LENGTH;
    const dx = clickX - headX;
    const dy = clickY - headY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist === 0) return false;

    this.lanternTime -= BULLET_COST;
    this.usedBullets++;

    this.bullets.push({
      x: headX,
      y: headY,
      vx: (dx / dist) * BULLET_SPEED,
      vy: (dy / dist) * BULLET_SPEED,
      radius: 6,
      trail: [],
      alive: true,
    });

    return true;
  }

  update(dt: number, map: GameMap): void {
    if (this.lanternTime <= 0) return;

    this.pulseTime += dt;

    this.vx = 0;
    this.vy = 0;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) this.vy -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) this.vy += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) this.vx -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) this.vx += 1;

    const mag = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (mag > 0) {
      this.vx = (this.vx / mag) * PLAYER_SPEED;
      this.vy = (this.vy / mag) * PLAYER_SPEED;
      this.facingAngle = Math.atan2(this.vy, this.vx);
    }

    this.displayVx += (this.vx - this.displayVx) * Math.min(1, dt * 10);
    this.displayVy += (this.vy - this.displayVy) * Math.min(1, dt * 10);

    const moveX = this.vx * dt;
    const moveY = this.vy * dt;

    const newX = this.x + moveX;
    if (!map.checkCollision(newX, this.y, PLAYER_HEAD_RADIUS) &&
        !map.checkCollision(newX, this.y - PLAYER_BODY_LENGTH, PLAYER_HEAD_RADIUS) &&
        !map.checkCollision(newX, this.y - PLAYER_BODY_LENGTH / 2, PLAYER_HEAD_RADIUS * 0.5)) {
      this.x = newX;
    }

    const newY = this.y + moveY;
    if (!map.checkCollision(this.x, newY, PLAYER_HEAD_RADIUS) &&
        !map.checkCollision(this.x, newY - PLAYER_BODY_LENGTH, PLAYER_HEAD_RADIUS) &&
        !map.checkCollision(this.x, newY - PLAYER_BODY_LENGTH / 2, PLAYER_HEAD_RADIUS * 0.5)) {
      this.y = newY;
    }

    this.lanternTime -= dt;
    if (this.lanternTime < 0) this.lanternTime = 0;

    this.updateBullets(dt, map);
  }

  updateBullets(dt: number, map: GameMap): void {
    for (const bullet of this.bullets) {
      if (!bullet.alive) continue;

      bullet.trail.unshift({ x: bullet.x, y: bullet.y });
      if (bullet.trail.length > 5) bullet.trail.pop();

      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;

      if (map.isWallAt(bullet.x, bullet.y)) {
        bullet.alive = false;
      }
      if (bullet.x < 0 || bullet.y < 0 || bullet.x > 800 || bullet.y > 600) {
        bullet.alive = false;
      }
    }
    this.bullets = this.bullets.filter(b => b.alive);
  }

  addLanternTime(seconds: number): void {
    this.lanternTime += seconds;
    if (this.lanternTime > this.maxLanternTime) {
      this.maxLanternTime = this.lanternTime;
    }
    this.maxBullets = Math.floor(this.maxLanternTime / BULLET_COST);
  }

  getLanternGlowRadius(): number {
    const ratio = this.lanternTime / this.maxLanternTime;
    const base = 15 + (40 - 15) * ratio;
    const pulse = this.getPulseAmount() * 3;
    return Math.max(10, base + pulse);
  }

  getPulseAmount(): number {
    const ratio = this.lanternTime / this.maxLanternTime;
    const freq = ratio < 0.3 ? 8 : 2.5;
    return Math.sin(this.pulseTime * freq * Math.PI) * 0.5 + 0.5;
  }

  getLanternColor(): { r: number; g: number; b: number } {
    const ratio = this.lanternTime / this.maxLanternTime;
    if (ratio >= 0.5) {
      return { r: 255, g: 200, b: 80 };
    } else if (ratio >= 0.3) {
      const t = (ratio - 0.3) / 0.2;
      return {
        r: 255,
        g: Math.floor(160 + 40 * t),
        b: Math.floor(30 + 50 * t),
      };
    } else {
      const t = ratio / 0.3;
      return {
        r: 255,
        g: Math.floor(100 + 60 * t),
        b: Math.floor(20 + 10 * t),
      };
    }
  }

  getAvailableBullets(): number {
    return Math.max(0, Math.floor(this.lanternTime / BULLET_COST));
  }
}
