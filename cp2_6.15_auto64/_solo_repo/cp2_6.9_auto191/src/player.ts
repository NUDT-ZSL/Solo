import { TILE_SIZE, isWallPixel } from './map';

export const PLAYER_SIZE = 16;
const PLAYER_SPEED = 100;
const BOB_PERIOD = 0.25;
const INVINCIBLE_DURATION = 0.5;
const INVINCIBLE_BLINK_PERIOD = 0.1;

export class Player {
  public x: number;
  public y: number;
  public score: number;
  public lives: number;
  public invincibleTimer: number;
  public bobTimer: number;
  public knockbackDx: number;
  public knockbackDy: number;
  public knockbackTimer: number;
  private keys: Set<string>;

  constructor(startTileX: number, startTileY: number) {
    this.x = startTileX * TILE_SIZE + (TILE_SIZE - PLAYER_SIZE) / 2;
    this.y = startTileY * TILE_SIZE + (TILE_SIZE - PLAYER_SIZE) / 2;
    this.score = 0;
    this.lives = 3;
    this.invincibleTimer = 0;
    this.bobTimer = 0;
    this.knockbackDx = 0;
    this.knockbackDy = 0;
    this.knockbackTimer = 0;
    this.keys = new Set();
  }

  public handleKeyDown(key: string): void {
    this.keys.add(key.toLowerCase());
  }

  public handleKeyUp(key: string): void {
    this.keys.delete(key.toLowerCase());
  }

  public getBobOffset(): number {
    const phase = (this.bobTimer % BOB_PERIOD) / BOB_PERIOD;
    return Math.sin(phase * Math.PI * 2) * 1;
  }

  public isVisible(): boolean {
    if (this.invincibleTimer <= 0) return true;
    const phase = Math.floor(this.invincibleTimer / INVINCIBLE_BLINK_PERIOD);
    return phase % 2 === 0;
  }

  public takeDamage(ghostX: number, ghostY: number): boolean {
    if (this.invincibleTimer > 0) return false;
    this.lives--;
    this.invincibleTimer = INVINCIBLE_DURATION;
    const dx = this.x - ghostX;
    const dy = this.y - ghostY;
    const len = Math.max(1, Math.sqrt(dx * dx + dy * dy));
    const knockbackDistance = TILE_SIZE * 2;
    this.knockbackDx = (dx / len) * knockbackDistance;
    this.knockbackDy = (dy / len) * knockbackDistance;
    this.knockbackTimer = 0.2;
    return true;
  }

  public addScore(amount: number): void {
    this.score += amount;
  }

  public update(dt: number): void {
    this.bobTimer += dt;
    if (this.invincibleTimer > 0) {
      this.invincibleTimer = Math.max(0, this.invincibleTimer - dt);
    }
    if (this.knockbackTimer > 0) {
      const kbProgress = Math.min(1, dt / 0.2);
      let newX = this.x + this.knockbackDx * kbProgress;
      let newY = this.y + this.knockbackDy * kbProgress;
      if (!isWallPixel(newX, this.y, 2)) this.x = newX;
      if (!isWallPixel(this.x, newY, 2)) this.y = newY;
      this.knockbackTimer = Math.max(0, this.knockbackTimer - dt);
      return;
    }
    let dx = 0;
    let dy = 0;
    if (this.keys.has('w') || this.keys.has('arrowup')) dy -= 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) dy += 1;
    if (this.keys.has('a') || this.keys.has('arrowleft')) dx -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) dx += 1;
    if (dx !== 0 && dy !== 0) {
      const inv = 1 / Math.sqrt(2);
      dx *= inv;
      dy *= inv;
    }
    const moveX = dx * PLAYER_SPEED * dt;
    const moveY = dy * PLAYER_SPEED * dt;
    if (!isWallPixel(this.x + moveX, this.y, 2)) {
      this.x += moveX;
    }
    if (!isWallPixel(this.x, this.y + moveY, 2)) {
      this.y += moveY;
    }
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    if (!this.isVisible()) return;
    const bobOffset = this.getBobOffset();
    const px = Math.round(this.x);
    const py = Math.round(this.y + bobOffset);
    ctx.fillStyle = '#0000FF';
    ctx.fillRect(px + 2, py + 6, 12, 10);
    ctx.fillStyle = '#FFE4C4';
    ctx.fillRect(px + 4, py + 4, 8, 4);
    ctx.fillStyle = '#800080';
    ctx.fillRect(px + 2, py + 2, 12, 3);
    ctx.fillRect(px + 3, py + 1, 10, 1);
    ctx.fillRect(px + 5, py, 6, 1);
    ctx.fillRect(px + 7, py - 1, 2, 1);
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(px + 7, py + 1, 2, 1);
    ctx.fillStyle = '#000000';
    ctx.fillRect(px + 5, py + 5, 1, 1);
    ctx.fillRect(px + 10, py + 5, 1, 1);
  }

  public getCenterX(): number {
    return this.x + PLAYER_SIZE / 2;
  }

  public getCenterY(): number {
    return this.y + PLAYER_SIZE / 2;
  }
}
