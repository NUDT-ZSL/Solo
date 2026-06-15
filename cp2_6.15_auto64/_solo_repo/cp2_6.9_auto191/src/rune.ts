import { TILE_SIZE } from './map';
import { PLAYER_SIZE } from './player';

const RUNE_SIZE = 12;
const BLINK_PERIOD = 0.4;

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

export class Rune {
  public tileX: number;
  public tileY: number;
  public collected: boolean;
  public blinkTimer: number;

  constructor(tileX: number, tileY: number) {
    this.tileX = tileX;
    this.tileY = tileY;
    this.collected = false;
    this.blinkTimer = 0;
  }

  public getPixelX(): number {
    return this.tileX * TILE_SIZE + (TILE_SIZE - RUNE_SIZE) / 2;
  }

  public getPixelY(): number {
    return this.tileY * TILE_SIZE + (TILE_SIZE - RUNE_SIZE) / 2;
  }

  public getCenterX(): number {
    return this.tileX * TILE_SIZE + TILE_SIZE / 2;
  }

  public getCenterY(): number {
    return this.tileY * TILE_SIZE + TILE_SIZE / 2;
  }

  public update(dt: number): void {
    this.blinkTimer += dt;
  }

  public getBlinkScale(): number {
    const phase = (this.blinkTimer % BLINK_PERIOD) / BLINK_PERIOD;
    return 0.85 + Math.sin(phase * Math.PI * 2) * 0.15;
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    if (this.collected) return;
    const scale = this.getBlinkScale();
    const size = RUNE_SIZE * scale;
    const offset = (RUNE_SIZE - size) / 2;
    const px = this.getPixelX() + offset;
    const py = this.getPixelY() + offset;
    ctx.save();
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 4;
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(px + size / 2, py + size / 2, size / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(px + size / 2, py + size / 2, size / 4, 0, Math.PI * 2);
    ctx.fill();
  }

  public checkCollision(playerX: number, playerY: number): boolean {
    if (this.collected) return false;
    const px = playerX + PLAYER_SIZE / 2;
    const py = playerY + PLAYER_SIZE / 2;
    const rx = this.getCenterX();
    const ry = this.getCenterY();
    const distX = Math.abs(px - rx);
    const distY = Math.abs(py - ry);
    return distX < 10 && distY < 10;
  }

  public collect(): { score: number; particles: Particle[] } {
    this.collected = true;
    const particles: Particle[] = [];
    const numParticles = 8;
    const cx = this.getCenterX();
    const cy = this.getCenterY();
    for (let i = 0; i < numParticles; i++) {
      const angle = (i / numParticles) * Math.PI * 2;
      const speed = 100;
      particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.3,
        maxLife: 0.3,
      });
    }
    return { score: 10, particles };
  }
}
