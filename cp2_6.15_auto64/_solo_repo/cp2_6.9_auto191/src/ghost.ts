import { TILE_SIZE } from './map';
import { PLAYER_SIZE } from './player';

const GHOST_SIZE = 16;
const GHOST_SPEED = 50;
const WOBBLE_PERIOD = 0.2;

export class Ghost {
  public x: number;
  public y: number;
  private path: { x: number; y: number }[];
  private targetIndex: number;
  private direction: 1 | -1;
  private wobbleTimer: number;
  private phaseOffset: number;

  constructor(path: { x: number; y: number }[], phaseOffset: number = 0) {
    this.path = path.map(p => ({
      x: p.x * TILE_SIZE + (TILE_SIZE - GHOST_SIZE) / 2,
      y: p.y * TILE_SIZE + (TILE_SIZE - GHOST_SIZE) / 2,
    }));
    this.x = this.path[0].x;
    this.y = this.path[0].y;
    this.targetIndex = this.path.length > 1 ? 1 : 0;
    this.direction = 1;
    this.wobbleTimer = 0;
    this.phaseOffset = phaseOffset;
  }

  public getWobbleOffset(): number {
    const phase = ((this.wobbleTimer + this.phaseOffset) % WOBBLE_PERIOD) / WOBBLE_PERIOD;
    return Math.sin(phase * Math.PI * 2) * 1.5;
  }

  public update(dt: number): void {
    this.wobbleTimer += dt;
    if (this.path.length <= 1) return;
    const target = this.path[this.targetIndex];
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const moveDist = GHOST_SPEED * dt;
    if (dist <= moveDist) {
      this.x = target.x;
      this.y = target.y;
      if (this.targetIndex === this.path.length - 1) {
        this.direction = -1;
      } else if (this.targetIndex === 0) {
        this.direction = 1;
      }
      this.targetIndex += this.direction;
    } else {
      this.x += (dx / dist) * moveDist;
      this.y += (dy / dist) * moveDist;
    }
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    const wobbleOffset = this.getWobbleOffset();
    const px = Math.round(this.x);
    const py = Math.round(this.y + wobbleOffset);
    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = '#00FF00';
    ctx.beginPath();
    ctx.arc(px + 8, py + 6, 7, Math.PI, 0, false);
    ctx.lineTo(px + 15, py + 15);
    ctx.lineTo(px + 12, py + 12);
    ctx.lineTo(px + 9, py + 15);
    ctx.lineTo(px + 6, py + 12);
    ctx.lineTo(px + 3, py + 15);
    ctx.lineTo(px + 1, py + 15);
    ctx.lineTo(px + 1, py + 6);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(px + 4, py + 4, 3, 3);
    ctx.fillRect(px + 9, py + 4, 3, 3);
    ctx.fillStyle = '#000000';
    ctx.fillRect(px + 5, py + 5, 2, 2);
    ctx.fillRect(px + 10, py + 5, 2, 2);
    ctx.restore();
  }

  public getCenterX(): number {
    return this.x + GHOST_SIZE / 2;
  }

  public getCenterY(): number {
    return this.y + GHOST_SIZE / 2;
  }

  public checkCollision(playerX: number, playerY: number): boolean {
    const px = playerX + PLAYER_SIZE / 2;
    const py = playerY + PLAYER_SIZE / 2;
    const gx = this.getCenterX();
    const gy = this.getCenterY();
    const distX = Math.abs(px - gx);
    const distY = Math.abs(py - gy);
    return distX < 9 && distY < 9;
  }
}
