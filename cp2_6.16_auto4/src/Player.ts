import { Cell } from './MazeGenerator';

export interface PlayerControls {
  up: string;
  down: string;
  left: string;
  right: string;
}

export interface PlayerConfig {
  id: number;
  name: string;
  color: string;
  startX: number;
  startY: number;
  controls: PlayerControls;
  speed: number;
  size: number;
}

export class Player {
  public id: number;
  public name: string;
  public color: string;
  public x: number;
  public y: number;
  public angle: number;
  public speed: number;
  public baseSpeed: number;
  public size: number;
  public keysCollected: number;
  public isSlowed: boolean;
  public slowEndTime: number;
  public keyAnimationTime: number;
  public controls: PlayerControls;
  public finished: boolean;
  public finishTime: number;
  public animationFrame: number;
  public isMoving: boolean;

  private velocityX: number;
  private velocityY: number;
  private lastFootstepTime: number;
  private footstepInterval: number;

  constructor(config: PlayerConfig) {
    this.id = config.id;
    this.name = config.name;
    this.color = config.color;
    this.x = config.startX;
    this.y = config.startY;
    this.angle = 0;
    this.speed = config.speed;
    this.baseSpeed = config.speed;
    this.size = config.size;
    this.keysCollected = 0;
    this.isSlowed = false;
    this.slowEndTime = 0;
    this.keyAnimationTime = 0;
    this.controls = config.controls;
    this.finished = false;
    this.finishTime = 0;
    this.animationFrame = 0;
    this.isMoving = false;
    this.velocityX = 0;
    this.velocityY = 0;
    this.lastFootstepTime = 0;
    this.footstepInterval = 200;
  }

  public update(deltaTime: number, keys: Set<string>, currentTime: number, maze: Cell[][], cellSize: number): boolean {
    if (this.finished) {
      return false;
    }

    if (this.isSlowed && currentTime >= this.slowEndTime) {
      this.isSlowed = false;
      this.speed = this.baseSpeed;
    }

    if (this.keyAnimationTime > 0) {
      this.keyAnimationTime -= deltaTime;
    }

    let dx = 0;
    let dy = 0;

    if (keys.has(this.controls.up)) dy -= 1;
    if (keys.has(this.controls.down)) dy += 1;
    if (keys.has(this.controls.left)) dx -= 1;
    if (keys.has(this.controls.right)) dx += 1;

    this.isMoving = dx !== 0 || dy !== 0;

    if (this.isMoving) {
      const length = Math.sqrt(dx * dx + dy * dy);
      if (length > 0) {
        dx /= length;
        dy /= length;
      }

      this.velocityX = dx * this.speed;
      this.velocityY = dy * this.speed;
      this.angle = Math.atan2(dy, dx);

      const newX = this.x + this.velocityX * (deltaTime / 1000);
      const newY = this.y + this.velocityY * (deltaTime / 1000);

      // #region debug-point H5:slow-effect
      const oldX = this.x;
      const oldY = this.y;
      const oldSpeed = this.speed;
      const isSlowed = this.isSlowed;
      // #endregion

      if (!this.checkCollision(newX, this.y, maze, cellSize)) {
        this.x = newX;
      }
      if (!this.checkCollision(this.x, newY, maze, cellSize)) {
        this.y = newY;
      }

      // #region debug-point H5:slow-effect
      if (Math.random() < 0.03) {
        const DEBUG_URL = 'http://127.0.0.1:7777/event';
        const SESSION_ID = 'maze-race-multi-bug';
        const actualDx = Math.abs(this.x - oldX);
        const actualDy = Math.abs(this.y - oldY);
        const expectedDx = Math.abs(this.velocityX * (deltaTime / 1000));
        const expectedDy = Math.abs(this.velocityY * (deltaTime / 1000));
        fetch(DEBUG_URL, { method: 'POST', body: JSON.stringify({ sessionId: SESSION_ID, runId: 'pre', hypothesisId: 'H5', location: 'Player.ts:113', msg: '[DEBUG] Slow effect check', data: { playerId: this.id, isSlowed, currentSpeed: oldSpeed, baseSpeed: this.baseSpeed, expectedDx, expectedDy, actualDx, actualDy }, ts: Date.now() }) }).catch(() => {});
      }
      // #endregion

      this.animationFrame = (this.animationFrame + deltaTime * 0.01) % 4;

      if (currentTime - this.lastFootstepTime > this.footstepInterval) {
        this.lastFootstepTime = currentTime;
        return true;
      }
    } else {
      this.velocityX = 0;
      this.velocityY = 0;
    }

    return false;
  }

  private checkCollision(newX: number, newY: number, maze: Cell[][], cellSize: number): boolean {
    const halfSize = this.size / 2;
    const corners = [
      { x: newX - halfSize + 2, y: newY - halfSize + 2 },
      { x: newX + halfSize - 2, y: newY - halfSize + 2 },
      { x: newX - halfSize + 2, y: newY + halfSize - 2 },
      { x: newX + halfSize - 2, y: newY + halfSize - 2 },
    ];

    // #region debug-point H2:collision-detection
    let detectedWall = false;
    let wallInfo: { corner: string; cell: string; wall: string } | null = null;
    // #endregion

    for (let i = 0; i < corners.length; i++) {
      const corner = corners[i];
      const cellX = Math.floor(corner.x / cellSize);
      const cellY = Math.floor(corner.y / cellSize);

      if (cellX < 0 || cellX >= maze[0].length || cellY < 0 || cellY >= maze.length) {
        // #region debug-point H2:collision-detection
        detectedWall = true;
        wallInfo = { corner: `corner${i}`, cell: 'out_of_bounds', wall: 'boundary' };
        // #endregion
        return true;
      }

      const cell = maze[cellY][cellX];
      const localX = corner.x - cellX * cellSize;
      const localY = corner.y - cellY * cellSize;
      const wallThickness = 3;

      if (cell.walls.top && localY < wallThickness) {
        // #region debug-point H2:collision-detection
        detectedWall = true;
        wallInfo = { corner: `corner${i}`, cell: `${cellX},${cellY}`, wall: 'top' };
        // #endregion
        return true;
      }
      if (cell.walls.bottom && localY > cellSize - wallThickness) {
        // #region debug-point H2:collision-detection
        detectedWall = true;
        wallInfo = { corner: `corner${i}`, cell: `${cellX},${cellY}`, wall: 'bottom' };
        // #endregion
        return true;
      }
      if (cell.walls.left && localX < wallThickness) {
        // #region debug-point H2:collision-detection
        detectedWall = true;
        wallInfo = { corner: `corner${i}`, cell: `${cellX},${cellY}`, wall: 'left' };
        // #endregion
        return true;
      }
      if (cell.walls.right && localX > cellSize - wallThickness) {
        // #region debug-point H2:collision-detection
        detectedWall = true;
        wallInfo = { corner: `corner${i}`, cell: `${cellX},${cellY}`, wall: 'right' };
        // #endregion
        return true;
      }
    }

    // #region debug-point H2:collision-detection
    if (Math.random() < 0.02) {
      const DEBUG_URL = 'http://127.0.0.1:7777/event';
      const SESSION_ID = 'maze-race-multi-bug';
      fetch(DEBUG_URL, { method: 'POST', body: JSON.stringify({ sessionId: SESSION_ID, runId: 'pre', hypothesisId: 'H2', location: 'Player.ts:158', msg: '[DEBUG] Collision check', data: { playerId: this.id, playerX: this.x, playerY: this.y, newX, newY, halfSize, detectedWall, wallInfo, playerSize: this.size }, ts: Date.now() }) }).catch(() => {});
    }
    // #endregion

    return false;
  }

  public getCurrentCell(maze: Cell[][], cellSize: number): Cell | null {
    const cellX = Math.floor(this.x / cellSize);
    const cellY = Math.floor(this.y / cellSize);

    if (cellX >= 0 && cellX < maze[0].length && cellY >= 0 && cellY < maze.length) {
      return maze[cellY][cellX];
    }
    return null;
  }

  public collectKey(_currentTime: number): void {
    this.keysCollected++;
    this.keyAnimationTime = 500;
  }

  public triggerSlow(currentTime: number, duration: number): void {
    this.isSlowed = true;
    this.slowEndTime = currentTime + duration;
    this.speed = this.baseSpeed * 0.5;
  }

  public finish(currentTime: number): void {
    this.finished = true;
    this.finishTime = currentTime;
  }

  public getCenter(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }
}
