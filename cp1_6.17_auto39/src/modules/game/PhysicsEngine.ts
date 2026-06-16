import { MapData, PlayerState, InputState, CollisionResult, TILE_SIZE, GRID_COLS, GRID_ROWS } from '../../types';

export class PhysicsEngine {
  private gravity: number = 0.5;
  private jumpVelocity: number = -10;
  private moveSpeed: number = 5;
  private friction: number = 0.8;
  private mapData: MapData;
  private tileSize: number;

  constructor(mapData: MapData, tileSize?: number) {
    this.mapData = mapData;
    this.tileSize = tileSize || TILE_SIZE;
  }

  updateMapData(mapData: MapData): void {
    this.mapData = mapData;
  }

  applyGravity(player: PlayerState): PlayerState {
    return {
      ...player,
      vy: player.vy + this.gravity,
    };
  }

  applyInput(player: PlayerState, input: InputState): PlayerState {
    let vx = player.vx;
    if (input.left) {
      vx = -this.moveSpeed;
    } else if (input.right) {
      vx = this.moveSpeed;
    } else {
      vx = player.isGrounded ? player.vx * this.friction : player.vx * 0.95;
      if (Math.abs(vx) < 0.1) vx = 0;
    }

    let vy = player.vy;
    if (input.up && player.isGrounded) {
      vy = this.jumpVelocity;
    }

    return {
      ...player,
      vx,
      vy,
      isGrounded: false,
    };
  }

  update(player: PlayerState, input: InputState): PlayerState {
    let newState = this.applyInput(player, input);
    newState = this.applyGravity(newState);

    newState = this.moveAxis(newState, 'x', newState.vx);
    newState = this.moveAxis(newState, 'y', newState.vy);

    return newState;
  }

  private moveAxis(player: PlayerState, axis: 'x' | 'y', velocity: number): PlayerState {
    if (velocity === 0) return player;

    const newPos = {
      ...player,
      [axis]: player[axis] + velocity,
    };

    const collision = this.checkCollision(newPos.x, newPos.y, newPos.width, newPos.height);

    if (axis === 'x') {
      if (velocity > 0 && collision.right) {
        const rightEdge = Math.floor((newPos.x + newPos.width) / this.tileSize) * this.tileSize;
        newPos.x = rightEdge - newPos.width - 0.01;
        newPos.vx = 0;
      } else if (velocity < 0 && collision.left) {
        const leftEdge = Math.ceil(newPos.x / this.tileSize) * this.tileSize;
        newPos.x = leftEdge + 0.01;
        newPos.vx = 0;
      }
    }

    if (axis === 'y') {
      if (velocity > 0 && collision.bottom) {
        const bottomEdge = Math.floor((newPos.y + newPos.height) / this.tileSize) * this.tileSize;
        newPos.y = bottomEdge - newPos.height - 0.01;
        newPos.vy = 0;
        newPos.isGrounded = true;
      } else if (velocity < 0 && collision.top) {
        const topEdge = Math.ceil(newPos.y / this.tileSize) * this.tileSize;
        newPos.y = topEdge + 0.01;
        newPos.vy = 0;
      }
    }

    return newPos;
  }

  checkCollision(x: number, y: number, w: number, h: number): CollisionResult {
    const result: CollisionResult = { top: false, bottom: false, left: false, right: false };

    const margin = 0.5;

    const left = x + margin;
    const right = x + w - margin;
    const top = y + margin;
    const bottom = y + h - margin;

    const startCol = Math.max(0, Math.floor(left / this.tileSize));
    const endCol = Math.min(GRID_COLS - 1, Math.floor(right / this.tileSize));
    const startRow = Math.max(0, Math.floor(top / this.tileSize));
    const endRow = Math.min(GRID_ROWS - 1, Math.floor(bottom / this.tileSize));

    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        const tile = this.mapData[row]?.[col];
        if (tile !== 1 && tile !== 2) continue;

        const tileLeft = col * this.tileSize;
        const tileRight = tileLeft + this.tileSize;
        const tileTop = row * this.tileSize;
        const tileBottom = tileTop + this.tileSize;

        if (right <= tileLeft || left >= tileRight || bottom <= tileTop || top >= tileBottom) {
          continue;
        }

        const overlapLeft = right - tileLeft;
        const overlapRight = tileRight - left;
        const overlapTop = bottom - tileTop;
        const overlapBottom = tileBottom - top;

        const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

        if (minOverlap === overlapTop) {
          result.bottom = true;
        } else if (minOverlap === overlapBottom) {
          result.top = true;
        } else if (minOverlap === overlapLeft) {
          result.right = true;
        } else if (minOverlap === overlapRight) {
          result.left = true;
        }
      }
    }

    return result;
  }

  checkSpikeCollision(x: number, y: number, w: number, h: number): boolean {
    const margin = 2;
    const left = x + margin;
    const right = x + w - margin;
    const top = y + margin;
    const bottom = y + h - margin;

    const startCol = Math.max(0, Math.floor(left / this.tileSize));
    const endCol = Math.min(GRID_COLS - 1, Math.floor(right / this.tileSize));
    const startRow = Math.max(0, Math.floor(top / this.tileSize));
    const endRow = Math.min(GRID_ROWS - 1, Math.floor(bottom / this.tileSize));

    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        if (this.mapData[row]?.[col] === 3) {
          const tileLeft = col * this.tileSize;
          const tileRight = tileLeft + this.tileSize;
          const tileTop = row * this.tileSize;
          const tileBottom = tileTop + this.tileSize;

          if (right > tileLeft && left < tileRight && bottom > tileTop && top < tileBottom) {
            return true;
          }
        }
      }
    }
    return false;
  }

  checkCoinCollision(x: number, y: number, w: number, h: number): { row: number; col: number } | null {
    const left = x;
    const right = x + w;
    const top = y;
    const bottom = y + h;

    const startCol = Math.max(0, Math.floor(left / this.tileSize));
    const endCol = Math.min(GRID_COLS - 1, Math.floor(right / this.tileSize));
    const startRow = Math.max(0, Math.floor(top / this.tileSize));
    const endRow = Math.min(GRID_ROWS - 1, Math.floor(bottom / this.tileSize));

    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        if (this.mapData[row]?.[col] === 4) {
          const tileLeft = col * this.tileSize;
          const tileRight = tileLeft + this.tileSize;
          const tileTop = row * this.tileSize;
          const tileBottom = tileTop + this.tileSize;

          if (right > tileLeft && left < tileRight && bottom > tileTop && top < tileBottom) {
            return { row, col };
          }
        }
      }
    }
    return null;
  }

  findSpawnPoint(): { x: number; y: number } {
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        if (this.mapData[row][col] === 0) {
          const hasGroundBelow = row + 1 < GRID_ROWS && (this.mapData[row + 1][col] === 1 || this.mapData[row + 1][col] === 2);
          if (hasGroundBelow || row === GRID_ROWS - 1) {
            return {
              x: col * this.tileSize + (this.tileSize - 16) / 2,
              y: row * this.tileSize + (this.tileSize - 16),
            };
          }
        }
      }
    }
    return { x: this.tileSize, y: 0 };
  }
}
