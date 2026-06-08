import { Position, DungeonMap } from './map';

export interface PlayerState {
  x: number;
  y: number;
  renderX: number;
  renderY: number;
  coinCount: number;
  isMoving: boolean;
}

export class Player {
  private gridX: number;
  private gridY: number;
  private renderX: number;
  private renderY: number;
  private targetX: number;
  private targetY: number;
  private coinCount: number;
  private moving: boolean;
  private moveProgress: number;
  private readonly moveDuration: number = 0.15;
  private readonly visionRadius: number = 5;
  private readonly tileSize: number;
  private startX: number;
  private startY: number;

  constructor(startX: number, startY: number, tileSize: number, initialCoins: number = 0) {
    this.gridX = startX;
    this.gridY = startY;
    this.renderX = startX * tileSize;
    this.renderY = startY * tileSize;
    this.targetX = startX;
    this.targetY = startY;
    this.startX = startX;
    this.startY = startY;
    this.coinCount = initialCoins;
    this.moving = false;
    this.moveProgress = 0;
    this.tileSize = tileSize;
  }

  public move(dx: number, dy: number, map: DungeonMap): boolean {
    if (this.moving) {
      return false;
    }
    const newX = this.gridX + dx;
    const newY = this.gridY + dy;
    if (map.isWalkable(newX, newY)) {
      this.startX = this.gridX;
      this.startY = this.gridY;
      this.targetX = newX;
      this.targetY = newY;
      this.moving = true;
      this.moveProgress = 0;
      return true;
    }
    return false;
  }

  public update(deltaTime: number, map: DungeonMap): void {
    if (this.moving) {
      this.moveProgress += deltaTime;
      const t = Math.min(this.moveProgress / this.moveDuration, 1);
      const easeT = t * t * (3 - 2 * t);
      this.renderX = (this.startX + (this.targetX - this.startX) * easeT) * this.tileSize;
      this.renderY = (this.startY + (this.targetY - this.startY) * easeT) * this.tileSize;

      if (t >= 1) {
        this.gridX = this.targetX;
        this.gridY = this.targetY;
        this.renderX = this.gridX * this.tileSize;
        this.renderY = this.gridY * this.tileSize;
        this.moving = false;
        this.checkCoinPickup(map);
      }
    }
  }

  private checkCoinPickup(map: DungeonMap): void {
    if (map.removeCoin(this.gridX, this.gridY)) {
      this.coinCount++;
    }
  }

  public checkPortal(map: DungeonMap): boolean {
    return map.isPortal(this.gridX, this.gridY);
  }

  public isInVision(x: number, y: number): boolean {
    const dist = Math.sqrt(Math.pow(x - this.gridX, 2) + Math.pow(y - this.gridY, 2));
    return dist <= this.visionRadius;
  }

  public resetPosition(pos: Position): void {
    this.gridX = pos.x;
    this.gridY = pos.y;
    this.renderX = pos.x * this.tileSize;
    this.renderY = pos.y * this.tileSize;
    this.targetX = pos.x;
    this.targetY = pos.y;
    this.startX = pos.x;
    this.startY = pos.y;
    this.moving = false;
    this.moveProgress = 0;
  }

  public getGridPosition(): Position {
    return { x: this.gridX, y: this.gridY };
  }

  public getState(): PlayerState {
    return {
      x: this.gridX,
      y: this.gridY,
      renderX: this.renderX,
      renderY: this.renderY,
      coinCount: this.coinCount,
      isMoving: this.moving
    };
  }
}
