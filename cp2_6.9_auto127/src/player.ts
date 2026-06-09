import { DungeonMap, TILE_SIZE, MAP_COLS, MAP_ROWS } from './map';

export const DIRECTION = {
  UP: 'up',
  DOWN: 'down',
  LEFT: 'left',
  RIGHT: 'right'
} as const;

export type Direction = typeof DIRECTION[keyof typeof DIRECTION];

export class Player {
  public x: number;
  public y: number;
  public pixelX: number;
  public pixelY: number;
  public speed: number = 2;
  public fuel: number = 100;
  public gems: number = 0;
  public steps: number = 0;
  public direction: Direction = DIRECTION.DOWN;

  private targetX: number;
  private targetY: number;
  private isMoving: boolean = false;
  private moveProgress: number = 0;
  private prevTileX: number;
  private prevTileY: number;

  constructor(map: DungeonMap) {
    this.x = map.entrance.x;
    this.y = map.entrance.y;
    this.pixelX = this.x * TILE_SIZE + TILE_SIZE / 2;
    this.pixelY = this.y * TILE_SIZE + TILE_SIZE / 2;
    this.targetX = this.x;
    this.targetY = this.y;
    this.prevTileX = this.x;
    this.prevTileY = this.y;
  }

  public reset(map: DungeonMap): void {
    this.x = map.entrance.x;
    this.y = map.entrance.y;
    this.pixelX = this.x * TILE_SIZE + TILE_SIZE / 2;
    this.pixelY = this.y * TILE_SIZE + TILE_SIZE / 2;
    this.targetX = this.x;
    this.targetY = this.y;
    this.prevTileX = this.x;
    this.prevTileY = this.y;
    this.fuel = 100;
    this.gems = 0;
    this.steps = 0;
    this.direction = DIRECTION.DOWN;
    this.isMoving = false;
    this.moveProgress = 0;
  }

  public getLightRadius(): number {
    const t = this.fuel / 100;
    return 20 + t * 60;
  }

  public getDirectionAngle(): number {
    switch (this.direction) {
      case DIRECTION.UP: return -Math.PI / 2;
      case DIRECTION.DOWN: return Math.PI / 2;
      case DIRECTION.LEFT: return Math.PI;
      case DIRECTION.RIGHT: return 0;
    }
  }

  public startMove(direction: Direction, map: DungeonMap): boolean {
    if (this.isMoving) return false;

    this.direction = direction;

    let newX = this.x;
    let newY = this.y;

    switch (direction) {
      case DIRECTION.UP: newY--; break;
      case DIRECTION.DOWN: newY++; break;
      case DIRECTION.LEFT: newX--; break;
      case DIRECTION.RIGHT: newX++; break;
    }

    if (newX < 0 || newX >= MAP_COLS || newY < 0 || newY >= MAP_ROWS) return false;
    if (map.isWall(newX, newY)) return false;

    this.prevTileX = this.x;
    this.prevTileY = this.y;
    this.targetX = newX;
    this.targetY = newY;
    this.isMoving = true;
    this.moveProgress = 0;

    this.fuel = Math.max(0, this.fuel - 0.5);
    this.steps++;

    return true;
  }

  public update(map: DungeonMap): { movedToNewTile: boolean; gemCollected: boolean; reachedExit: boolean } {
    let movedToNewTile = false;
    let gemCollected = false;
    let reachedExit = false;

    if (this.isMoving) {
      this.moveProgress += this.speed / TILE_SIZE;

      if (this.moveProgress >= 1) {
        this.moveProgress = 1;
        this.x = this.targetX;
        this.y = this.targetY;
        this.pixelX = this.x * TILE_SIZE + TILE_SIZE / 2;
        this.pixelY = this.y * TILE_SIZE + TILE_SIZE / 2;
        this.isMoving = false;
        movedToNewTile = true;

        map.markExplored(this.x, this.y);

        const gem = map.getGemAt(this.x, this.y);
        if (gem) {
          gem.collected = true;
          this.gems++;
          this.fuel = Math.min(100, this.fuel + 20);
          gemCollected = true;
        }

        if (map.isExit(this.x, this.y)) {
          reachedExit = true;
        }
      } else {
        const startPixelX = this.prevTileX * TILE_SIZE + TILE_SIZE / 2;
        const startPixelY = this.prevTileY * TILE_SIZE + TILE_SIZE / 2;
        const endPixelX = this.targetX * TILE_SIZE + TILE_SIZE / 2;
        const endPixelY = this.targetY * TILE_SIZE + TILE_SIZE / 2;

        this.pixelX = startPixelX + (endPixelX - startPixelX) * this.moveProgress;
        this.pixelY = startPixelY + (endPixelY - startPixelY) * this.moveProgress;

        const currentTileX = Math.floor(this.pixelX / TILE_SIZE);
        const currentTileY = Math.floor(this.pixelY / TILE_SIZE);
        if (currentTileX !== this.x || currentTileY !== this.y) {
          map.markExplored(currentTileX, currentTileY);
        }
      }
    } else {
      map.markExplored(this.x, this.y);
    }

    return { movedToNewTile, gemCollected, reachedExit };
  }

  public isCurrentlyMoving(): boolean {
    return this.isMoving;
  }
}
