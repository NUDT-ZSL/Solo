import { MazeMap, TOTAL_COLS, TOTAL_ROWS } from './map';

export const SPORE_SPEED = 120;
export const SPORE_MAX_COUNT = 20;
export const SPORE_RADIUS = 7;
export const EXPLOSION_RADIUS = 20;
export const EXPLOSION_DURATION = 0.5;
export const VISION_RADIUS = 7;
export const MOVE_SPEED = 4;

export interface Spore {
  x: number;
  y: number;
  dx: number;
  dy: number;
  distance: number;
  alive: boolean;
  color: { r: number; g: number; b: number };
}

export interface Explosion {
  x: number;
  y: number;
  timeLeft: number;
  duration: number;
  radius: number;
}

export class Player {
  public gridX: number;
  public gridY: number;
  public targetGridX: number;
  public targetGridY: number;
  public moving: boolean;
  public keysCollected: number;
  public spores: Spore[];
  public explosions: Explosion[];
  public isInBrightArea: boolean;

  constructor(spawnX: number, spawnY: number) {
    this.gridX = spawnX;
    this.gridY = spawnY;
    this.targetGridX = spawnX;
    this.targetGridY = spawnY;
    this.moving = false;
    this.keysCollected = 0;
    this.spores = [];
    this.explosions = [];
    this.isInBrightArea = false;
  }

  public setTarget(x: number, y: number, map: MazeMap): void {
    if (x >= 0 && x < TOTAL_COLS && y >= 0 && y < TOTAL_ROWS && map.isPassage(x, y)) {
      this.targetGridX = x;
      this.targetGridY = y;
      this.moving = true;
    }
  }

  public fireSpore(fromX: number, fromY: number, targetX: number, targetY: number): void {
    if (this.spores.length >= SPORE_MAX_COUNT) return;

    const dx = targetX - fromX;
    const dy = targetY - fromY;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 0.001) return;

    const nx = dx / len;
    const ny = dy / len;

    this.spores.push({
      x: fromX,
      y: fromY,
      dx: nx,
      dy: ny,
      distance: 0,
      alive: true,
      color: { r: 0, g: 255, b: 136 }
    });
  }

  public update(dt: number, map: MazeMap): void {
    if (this.moving) {
      const diffX = this.targetGridX - this.gridX;
      const diffY = this.targetGridY - this.gridY;
      const dist = Math.sqrt(diffX * diffX + diffY * diffY);

      if (dist < 0.1) {
        this.gridX = this.targetGridX;
        this.gridY = this.targetGridY;
        this.moving = false;
      } else {
        const step = MOVE_SPEED * dt;
        const moveX = (diffX / dist) * step;
        const moveY = (diffY / dist) * step;

        const newX = this.gridX + moveX;
        const newY = this.gridY + moveY;

        if (map.isPassage(Math.round(newX), Math.round(this.gridY))) {
          this.gridX = newX;
        }
        if (map.isPassage(Math.round(this.gridX), Math.round(newY))) {
          this.gridY = newY;
        }
      }
    }

    this.isInBrightArea = false;
    for (const exp of this.explosions) {
      const px = this.gridX;
      const py = this.gridY;
      const edx = px - (exp.x / 40);
      const edy = py - (exp.y / 40);
      const eDist = Math.sqrt(edx * edx + edy * edy);
      if (eDist < 0.8) {
        this.isInBrightArea = true;
        break;
      }
    }

    for (const spore of this.spores) {
      if (!spore.alive) continue;

      const moveDist = SPORE_SPEED * dt;
      spore.x += spore.dx * moveDist;
      spore.y += spore.dy * moveDist;
      spore.distance += moveDist;

      const colorShift = Math.min(spore.distance / 10, 50);
      const shiftRatio = colorShift * 0.02;
      spore.color.r = Math.floor(0 + (255 - 0) * shiftRatio);
      spore.color.g = Math.floor(255 + (136 - 255) * shiftRatio);
      spore.color.b = Math.floor(136 + (0 - 136) * shiftRatio);

      const checkGridX = Math.round(spore.x / 40);
      const checkGridY = Math.round(spore.y / 40);

      if (map.isWall(checkGridX, checkGridY) ||
          spore.x < 0 || spore.x >= TOTAL_COLS * 40 ||
          spore.y < 0 || spore.y >= TOTAL_ROWS * 40) {
        spore.alive = false;
        this.createExplosion(spore.x, spore.y, map);
      }
    }

    this.spores = this.spores.filter(s => s.alive);

    for (const exp of this.explosions) {
      exp.timeLeft -= dt;
    }
    this.explosions = this.explosions.filter(e => e.timeLeft > 0);

    for (const chest of map.chests) {
      if (!chest.collected) {
        const cdx = this.gridX - chest.gridX;
        const cdy = this.gridY - chest.gridY;
        const cdist = Math.sqrt(cdx * cdx + cdy * cdy);
        if (cdist < 0.8) {
          chest.collected = true;
          this.keysCollected++;
        }
      }
    }
  }

  private createExplosion(x: number, y: number, map: MazeMap): void {
    this.explosions.push({
      x,
      y,
      timeLeft: EXPLOSION_DURATION,
      duration: EXPLOSION_DURATION,
      radius: EXPLOSION_RADIUS
    });

    const gx = Math.round(x / 40);
    const gy = Math.round(y / 40);
    const radius = 1;

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const tx = gx + dx;
        const ty = gy + dy;
        if (tx >= 0 && tx < TOTAL_COLS && ty >= 0 && ty < TOTAL_ROWS && map.isWall(tx, ty)) {
          map.addLitCell(tx, ty, 1.5);
        }
      }
    }
  }
}
