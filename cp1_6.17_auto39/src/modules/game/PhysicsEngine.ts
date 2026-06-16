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

    const steps = Math.max(Math.abs(newState.vx), Math.abs(newState.vy));
    if (steps < 1) {
      newState = this.moveSingleAxis(newState, 'x', newState.vx);
      newState = this.moveSingleAxis(newState, 'y', newState.vy);
    } else {
      const stepX = newState.vx / steps;
      const stepY = newState.vy / steps;
      for (let i = 0; i < steps; i++) {
        newState = this.moveSingleAxis(newState, 'x', stepX);
        newState = this.moveSingleAxis(newState, 'y', stepY);
      }
    }

    return newState;
  }

  private moveSingleAxis(player: PlayerState, axis: 'x' | 'y', delta: number): PlayerState {
    if (delta === 0) return player;

    const moved = { ...player, [axis]: player[axis] + delta };

    if (axis === 'x') {
      return this.resolveXCollision(moved);
    } else {
      return this.resolveYCollision(moved);
    }
  }

  checkCollision(x: number, y: number, w: number, h: number): CollisionResult {
    const result: CollisionResult = { top: false, bottom: false, left: false, right: false };

    const left = x + 0.1;
    const right = x + w - 0.1;
    const top = y + 0.1;
    const bottom = y + h - 0.1;

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

        if (overlapLeft > 0) result.right = true;
        if (overlapRight > 0) result.left = true;
        if (overlapTop > 0) result.bottom = true;
        if (overlapBottom > 0) result.top = true;
      }
    }

    return result;
  }

  private resolveXCollision(player: PlayerState): PlayerState {
    const next = { ...player };
    const collision = this.checkCollision(next.x, next.y, next.width, next.height);

    if (next.vx > 0 && collision.right) {
      const tileCol = Math.floor((next.x + next.width) / this.tileSize);
      const tileLeft = tileCol * this.tileSize;
      next.x = tileLeft - next.width - 0.01;
      next.vx = 0;
    } else if (next.vx < 0 && collision.left) {
      const tileCol = Math.floor(next.x / this.tileSize);
      const tileRight = (tileCol + 1) * this.tileSize;
      next.x = tileRight + 0.01;
      next.vx = 0;
    }

    return next;
  }

  private resolveYCollision(player: PlayerState): PlayerState {
    const next = { ...player };
    const collision = this.checkCollision(next.x, next.y, next.width, next.height);

    if (next.vy > 0 && collision.bottom) {
      const tileRow = Math.floor((next.y + next.height) / this.tileSize);
      const tileTop = tileRow * this.tileSize;
      next.y = tileTop - next.height - 0.01;
      next.vy = 0;
      next.isGrounded = true;
    } else if (next.vy < 0 && collision.top) {
      const tileRow = Math.floor(next.y / this.tileSize);
      const tileBottom = (tileRow + 1) * this.tileSize;
      next.y = tileBottom + 0.01;
      next.vy = 0;
    }

    return next;
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
