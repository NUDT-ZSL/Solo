import { Dungeon, TILE_SIZE } from './dungeon';

export class Player {
  public x: number;
  public y: number;
  public w: number = 16;
  public h: number = 16;
  public speed: number = 2;
  public health: number = 10;
  public maxHealth: number = 10;
  public keysCollected: number = 0;
  public totalKeys: number = 3;
  public flashTimer: number = 0;
  public flashDuration: number = 0;
  public lavaDamageTimer: number = 0;
  public color: string = '#ED8936';

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  public reset(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.health = this.maxHealth;
    this.keysCollected = 0;
    this.flashTimer = 0;
    this.flashDuration = 0;
    this.lavaDamageTimer = 0;
  }

  public update(input: { up: boolean; down: boolean; left: boolean; right: boolean }, dungeon: Dungeon): void {
    let dx = 0;
    let dy = 0;

    if (input.up) dy -= 1;
    if (input.down) dy += 1;
    if (input.left) dx -= 1;
    if (input.right) dx += 1;

    if (dx !== 0 && dy !== 0) {
      const len = Math.sqrt(2);
      dx /= len;
      dy /= len;
    }

    const newX = this.x + dx * this.speed;
    const newY = this.y + dy * this.speed;

    if (this.canMoveTo(newX, this.y, dungeon)) {
      this.x = newX;
    }
    if (this.canMoveTo(this.x, newY, dungeon)) {
      this.y = newY;
    }

    if (this.flashDuration > 0) {
      this.flashTimer++;
      if (this.flashTimer >= this.flashDuration) {
        this.flashTimer = 0;
        this.flashDuration = 0;
      }
    }

    const centerTX = Math.floor((this.x + this.w / 2) / TILE_SIZE);
    const centerTY = Math.floor((this.y + this.h / 2) / TILE_SIZE);

    if (dungeon.isLava(centerTX, centerTY)) {
      this.lavaDamageTimer++;
      if (this.lavaDamageTimer >= 10) {
        this.lavaDamageTimer = 0;
        this.takeDamage(1, 12);
      }
    } else {
      this.lavaDamageTimer = 0;
    }

    for (const key of dungeon.keys) {
      if (!key.collected) {
        const kx = key.x * TILE_SIZE + TILE_SIZE / 2 - 6;
        const ky = key.y * TILE_SIZE + TILE_SIZE / 2 - 8;
        if (this.x < kx + 12 && this.x + this.w > kx &&
            this.y < ky + 16 && this.y + this.h > ky) {
          key.collected = true;
          this.keysCollected++;
        }
      }
    }

    if (dungeon.checkRockCollision(this.x, this.y, this.w, this.h)) {
      this.takeDamage(2, 18);
    }
  }

  private canMoveTo(nx: number, ny: number, dungeon: Dungeon): boolean {
    const corners = [
      { x: nx + 1, y: ny + 1 },
      { x: nx + this.w - 2, y: ny + 1 },
      { x: nx + 1, y: ny + this.h - 2 },
      { x: nx + this.w - 2, y: ny + this.h - 2 }
    ];

    for (const corner of corners) {
      const tx = Math.floor(corner.x / TILE_SIZE);
      const ty = Math.floor(corner.y / TILE_SIZE);
      if (!dungeon.isWalkable(tx, ty)) {
        return false;
      }
    }
    return true;
  }

  public takeDamage(amount: number, flashFrames: number): void {
    if (this.flashDuration > 0) return;
    this.health = Math.max(0, this.health - amount);
    this.flashTimer = 0;
    this.flashDuration = flashFrames;
  }

  public isAtExit(dungeon: Dungeon): boolean {
    if (!dungeon.exitActive) return false;
    const centerTX = Math.floor((this.x + this.w / 2) / TILE_SIZE);
    const centerTY = Math.floor((this.y + this.h / 2) / TILE_SIZE);
    return centerTX === dungeon.exit.x && centerTY === dungeon.exit.y;
  }

  public isDead(): boolean {
    return this.health <= 0;
  }

  public render(ctx: CanvasRenderingContext2D): void {
    const isFlashing = this.flashDuration > 0 && Math.floor(this.flashTimer / 3) % 2 === 0;

    ctx.fillStyle = isFlashing ? '#E53E3E' : this.color;
    ctx.fillRect(this.x, this.y, this.w, this.h);

    ctx.fillStyle = isFlashing ? '#9B2C2C' : '#C05621';
    ctx.fillRect(this.x + 2, this.y + 2, 3, 3);
    ctx.fillRect(this.x + 11, this.y + 2, 3, 3);

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(this.x + 4, this.y + 5, 2, 2);
    ctx.fillRect(this.x + 10, this.y + 5, 2, 2);

    ctx.fillStyle = '#1A202C';
    ctx.fillRect(this.x + 5, this.y + 5, 1, 2);
    ctx.fillRect(this.x + 11, this.y + 5, 1, 2);

    ctx.fillStyle = isFlashing ? '#9B2C2C' : '#C05621';
    ctx.fillRect(this.x + 5, this.y + 10, 6, 2);

    const borderColor = isFlashing ? '#742A2A' : '#9C4221';
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(this.x + 1, this.y + 1, this.w - 2, this.h - 2);
  }
}
