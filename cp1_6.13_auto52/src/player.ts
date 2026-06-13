import { Maze } from './maze';
import { ShadowCreature } from './entity';

export class Player {
  public x: number;
  public y: number;
  public radius: number;
  public maxLives: number;
  public lives: number;
  public lightRadius: number;
  public baseLightRadius: number;
  public lightDecayRate: number;
  public gemsCollected: number;
  public moveSpeed: number;
  public invulnerable: number;
  public lifeLostAnim: Map<number, number>;

  private keys: Set<string>;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.radius = 12;
    this.maxLives = 3;
    this.lives = 3;
    this.baseLightRadius = 120;
    this.lightRadius = 120;
    this.lightDecayRate = 0.5;
    this.gemsCollected = 0;
    this.moveSpeed = 2;
    this.invulnerable = 0;
    this.lifeLostAnim = new Map();
    this.keys = new Set();

    window.addEventListener('keydown', (e) => {
      this.keys.add(e.key.toLowerCase());
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key.toLowerCase());
    });
  }

  public update(maze: Maze, dt: number, creatures: ShadowCreature[]): void {
    let dx = 0;
    let dy = 0;

    if (this.keys.has('w') || this.keys.has('arrowup')) dy -= 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) dy += 1;
    if (this.keys.has('a') || this.keys.has('arrowleft')) dx -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) dx += 1;

    if (dx !== 0 && dy !== 0) {
      const len = Math.sqrt(dx * dx + dy * dy);
      dx /= len;
      dy /= len;
    }

    const moveX = dx * this.moveSpeed;
    const moveY = dy * this.moveSpeed;

    if (moveX !== 0 && !this.checkWallCollision(maze, this.x + moveX, this.y)) {
      this.x += moveX;
    }
    if (moveY !== 0 && !this.checkWallCollision(maze, this.x, this.y + moveY)) {
      this.y += moveY;
    }

    this.lightRadius = Math.max(
      40,
      this.lightRadius - this.lightDecayRate * dt
    );

    if (this.invulnerable > 0) {
      this.invulnerable -= dt;
    }

    for (let i = 0; i < this.maxLives; i++) {
      const t = this.lifeLostAnim.get(i);
      if (t !== undefined) {
        const nt = t + dt;
        if (nt >= 0.3) {
          this.lifeLostAnim.delete(i);
        } else {
          this.lifeLostAnim.set(i, nt);
        }
      }
    }

    this.checkCreatureCollision(creatures);
  }

  private checkWallCollision(maze: Maze, px: number, py: number): boolean {
    const corners = [
      [px - this.radius, py - this.radius],
      [px + this.radius, py - this.radius],
      [px - this.radius, py + this.radius],
      [px + this.radius, py + this.radius]
    ];
    for (const [cx, cy] of corners) {
      if (maze.isWallPixel(cx, cy)) return true;
    }
    return false;
  }

  private checkCreatureCollision(creatures: ShadowCreature[]): void {
    if (this.invulnerable > 0) return;
    for (const c of creatures) {
      const dx = c.x - this.x;
      const dy = c.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < this.radius + c.radius) {
        this.hit();
        break;
      }
    }
  }

  public hit(): void {
    if (this.invulnerable > 0) return;
    this.lives--;
    this.invulnerable = 1.5;
    this.lifeLostAnim.set(this.lives, 0);
  }

  public isDead(): boolean {
    return this.lives <= 0;
  }

  public collectGem(): void {
    this.gemsCollected++;
    this.lightRadius = Math.min(this.lightRadius + 15, this.baseLightRadius + 100);
  }
}
