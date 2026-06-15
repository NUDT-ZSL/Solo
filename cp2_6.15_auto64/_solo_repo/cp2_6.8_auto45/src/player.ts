import { Maze } from './maze';

export interface FlashlightConfig {
  normalAngle: number;
  normalDistance: number;
  focusAngle: number;
  focusDistance: number;
}

export class Player {
  public x: number;
  public y: number;
  public angle: number;
  public speed: number;
  public radius: number;
  public flashlight: FlashlightConfig;
  public isFocused: boolean;

  constructor(startX: number, startY: number) {
    this.x = startX;
    this.y = startY;
    this.angle = Math.PI / 4;
    this.speed = 120;
    this.radius = 7;
    this.flashlight = {
      normalAngle: Math.PI / 3,
      normalDistance: 320,
      focusAngle: Math.PI / 6,
      focusDistance: 480
    };
    this.isFocused = false;
  }

  public getFlashlightAngle(): number {
    return this.isFocused ? this.flashlight.focusAngle : this.flashlight.normalAngle;
  }

  public getFlashlightDistance(): number {
    return this.isFocused ? this.flashlight.focusDistance : this.flashlight.normalDistance;
  }

  public update(dt: number, keys: Set<string>, maze: Maze): { collided: boolean } {
    let dx = 0;
    let dy = 0;

    if (keys.has('w') || keys.has('W')) {
      dx += Math.cos(this.angle);
      dy += Math.sin(this.angle);
    }
    if (keys.has('s') || keys.has('S')) {
      dx -= Math.cos(this.angle);
      dy -= Math.sin(this.angle);
    }
    if (keys.has('a') || keys.has('A')) {
      dx += Math.cos(this.angle - Math.PI / 2);
      dy += Math.sin(this.angle - Math.PI / 2);
    }
    if (keys.has('d') || keys.has('D')) {
      dx += Math.cos(this.angle + Math.PI / 2);
      dy += Math.sin(this.angle + Math.PI / 2);
    }

    this.isFocused = keys.has('Shift');

    let collided = false;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 0) {
      dx = (dx / len) * this.speed * dt;
      dy = (dy / len) * this.speed * dt;

      const newX = this.x + dx;
      if (!this.checkCollision(newX, this.y, maze)) {
        this.x = newX;
      } else {
        collided = true;
      }

      const newY = this.y + dy;
      if (!this.checkCollision(this.x, newY, maze)) {
        this.y = newY;
      } else {
        collided = true;
      }
    }

    const mouseRotSpeed = 0.003;
    if (keys.has('arrowleft')) {
      this.angle -= mouseRotSpeed * 60 * dt;
    }
    if (keys.has('arrowright')) {
      this.angle += mouseRotSpeed * 60 * dt;
    }

    return { collided };
  }

  private checkCollision(px: number, py: number, maze: Maze): boolean {
    const r = this.radius;
    const checkPoints = [
      { x: px - r, y: py - r },
      { x: px + r, y: py - r },
      { x: px - r, y: py + r },
      { x: px + r, y: py + r },
      { x: px, y: py - r },
      { x: px, y: py + r },
      { x: px - r, y: py },
      { x: px + r, y: py }
    ];
    for (const p of checkPoints) {
      if (maze.isWall(p.x, p.y)) {
        return true;
      }
    }
    return false;
  }

  public rotate(deltaAngle: number): void {
    this.angle += deltaAngle;
  }
}
