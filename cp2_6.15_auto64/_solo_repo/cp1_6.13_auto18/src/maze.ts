export const COLS = 20;
export const ROWS = 20;
export const CELL_SIZE = 40;
export const MAZE_WIDTH = COLS * CELL_SIZE;
export const MAZE_HEIGHT = ROWS * CELL_SIZE;

export interface WallSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  horizontal: boolean;
  normalX: number;
  normalY: number;
}

export interface Fragment {
  x: number;
  y: number;
  collected: boolean;
  radius: number;
}

export interface IMaze {
  readonly fragments: Fragment[];
  readonly exitX: number;
  readonly exitY: number;
  readonly exitRadius: number;
  getWalls(): WallSegment[];
  isWall(x: number, y: number): boolean;
  canMove(fromX: number, fromY: number, toX: number, toY: number): boolean;
  getWallNear(px: number, py: number, radius: number): WallSegment | null;
  collectFragment(px: number, py: number, radius: number): number;
  isAtExit(px: number, py: number): boolean;
}

export class Maze implements IMaze {
  private _hWalls: boolean[][];
  private _vWalls: boolean[][];
  private _wallPoints: Set<string>;
  private _wallSegments: WallSegment[];
  fragments: Fragment[];
  exitX: number;
  exitY: number;
  exitRadius: number;

  constructor() {
    this._hWalls = [];
    this._vWalls = [];
    for (let r = 0; r <= ROWS; r++) {
      this._hWalls[r] = [];
      for (let c = 0; c < COLS; c++) {
        this._hWalls[r][c] = true;
      }
    }
    for (let r = 0; r < ROWS; r++) {
      this._vWalls[r] = [];
      for (let c = 0; c <= COLS; c++) {
        this._vWalls[r][c] = true;
      }
    }

    this.exitX = Math.floor(COLS / 2) * CELL_SIZE + CELL_SIZE / 2;
    this.exitY = Math.floor(ROWS / 2) * CELL_SIZE + CELL_SIZE / 2;
    this.exitRadius = 15;

    this.fragments = [];
    this._wallPoints = new Set();
    this._wallSegments = [];

    this._generate();
    this._buildWallIndex();
    this._placeFragments();
  }

  getWalls(): WallSegment[] {
    return this._wallSegments;
  }

  isWall(x: number, y: number): boolean {
    const gx = Math.round(x);
    const gy = Math.round(y);
    return this._wallPoints.has(`${gx},${gy}`);
  }

  private _generate(): void {
    const visited: boolean[][] = [];
    for (let r = 0; r < ROWS; r++) {
      visited[r] = [];
      for (let c = 0; c < COLS; c++) {
        visited[r][c] = false;
      }
    }

    const stack: [number, number][] = [];
    const startR = 0;
    const startC = 0;
    visited[startR][startC] = true;
    stack.push([startR, startC]);

    const dirs: [number, number, string][] = [
      [-1, 0, 'top'],
      [1, 0, 'bottom'],
      [0, -1, 'left'],
      [0, 1, 'right'],
    ];

    while (stack.length > 0) {
      const [cr, cc] = stack[stack.length - 1];
      const neighbors: [number, number, string][] = [];

      for (const [dr, dc, wallA] of dirs) {
        const nr = cr + dr;
        const nc = cc + dc;
        if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && !visited[nr][nc]) {
          neighbors.push([nr, nc, wallA]);
        }
      }

      if (neighbors.length === 0) {
        stack.pop();
        continue;
      }

      const idx = Math.floor(Math.random() * neighbors.length);
      const [nr, nc, wallA] = neighbors[idx];
      this._removeWallBetween(cr, cc, wallA);
      visited[nr][nc] = true;
      stack.push([nr, nc]);
    }
  }

  private _removeWallBetween(r: number, c: number, direction: string): void {
    switch (direction) {
      case 'top':
        this._hWalls[r][c] = false;
        break;
      case 'bottom':
        this._hWalls[r + 1][c] = false;
        break;
      case 'left':
        this._vWalls[r][c] = false;
        break;
      case 'right':
        this._vWalls[r][c + 1] = false;
        break;
    }
  }

  private _buildWallIndex(): void {
    this._wallSegments = [];
    this._wallPoints = new Set();

    for (let r = 0; r <= ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (this._hWalls[r][c]) {
          const x1 = c * CELL_SIZE;
          const y1 = r * CELL_SIZE;
          const x2 = (c + 1) * CELL_SIZE;
          const y2 = r * CELL_SIZE;

          this._wallSegments.push({
            x1, y1, x2, y2,
            horizontal: true,
            normalX: 0,
            normalY: 1,
          });

          for (let x = x1; x <= x2; x++) {
            this._wallPoints.add(`${x},${y1}`);
          }
        }
      }
    }

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c <= COLS; c++) {
        if (this._vWalls[r][c]) {
          const x1 = c * CELL_SIZE;
          const y1 = r * CELL_SIZE;
          const x2 = c * CELL_SIZE;
          const y2 = (r + 1) * CELL_SIZE;

          this._wallSegments.push({
            x1, y1, x2, y2,
            horizontal: false,
            normalX: 1,
            normalY: 0,
          });

          for (let y = y1; y <= y2; y++) {
            this._wallPoints.add(`${x1},${y}`);
          }
        }
      }
    }
  }

  private _placeFragments(): void {
    const count = 10;
    const placed: Set<string> = new Set();
    const centerR = Math.floor(ROWS / 2);
    const centerC = Math.floor(COLS / 2);
    const fragRadius = 6;
    const minWallDist = fragRadius + 4;

    let attempts = 0;
    const maxAttempts = 5000;

    while (this.fragments.length < count && attempts < maxAttempts) {
      attempts++;
      const r = Math.floor(Math.random() * ROWS);
      const c = Math.floor(Math.random() * COLS);
      const key = `${r},${c}`;
      if (placed.has(key)) continue;
      if (r === 0 && c === 0) continue;
      if (r === centerR && c === centerC) continue;

      const cellCenterX = c * CELL_SIZE + CELL_SIZE / 2;
      const cellCenterY = r * CELL_SIZE + CELL_SIZE / 2;

      const offsets: [number, number][] = [];
      const numSamples = 8;
      for (let i = 0; i < numSamples; i++) {
        const angle = (Math.PI * 2 * i) / numSamples;
        offsets.push([
          Math.cos(angle) * (CELL_SIZE * 0.3),
          Math.sin(angle) * (CELL_SIZE * 0.3),
        ]);
      }
      offsets.push([0, 0]);

      for (const [ox, oy] of offsets) {
        const fx = cellCenterX + ox;
        const fy = cellCenterY + oy;

        if (fx < minWallDist || fx > MAZE_WIDTH - minWallDist ||
            fy < minWallDist || fy > MAZE_HEIGHT - minWallDist) {
          continue;
        }

        if (this._distanceToNearestWall(fx, fy) < minWallDist) {
          continue;
        }

        placed.add(key);
        this.fragments.push({
          x: fx,
          y: fy,
          collected: false,
          radius: fragRadius,
        });
        break;
      }
    }
  }

  private _distanceToNearestWall(px: number, py: number): number {
    let minDist = Infinity;
    for (const seg of this._wallSegments) {
      const d = this._distToSegment(px, py, seg.x1, seg.y1, seg.x2, seg.y2);
      if (d < minDist) minDist = d;
    }
    return minDist;
  }

  private _distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const projX = x1 + t * dx;
    const projY = y1 + t * dy;
    return Math.hypot(px - projX, py - projY);
  }

  canMove(fromX: number, fromY: number, toX: number, toY: number): boolean {
    const margin = 12;
    const corners = [
      [toX - margin, toY - margin],
      [toX + margin, toY - margin],
      [toX - margin, toY + margin],
      [toX + margin, toY + margin],
    ];

    for (const [px, py] of corners) {
      if (px < margin || px >= MAZE_WIDTH - margin || py < margin || py >= MAZE_HEIGHT - margin) {
        return false;
      }
    }

    const steps = Math.ceil(Math.hypot(toX - fromX, toY - fromY) / 4);
    if (steps === 0) return true;

    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const sx = fromX + (toX - fromX) * t;
      const sy = fromY + (toY - fromY) * t;

      for (const [ox, oy] of corners) {
        const cx = sx + (ox - toX);
        const cy = sy + (oy - toY);
        if (this.isWall(cx, cy)) return false;
      }
    }

    return true;
  }

  getWallNear(px: number, py: number, radius: number): WallSegment | null {
    let closest: WallSegment | null = null;
    let closestDist = Infinity;
    for (const seg of this._wallSegments) {
      const d = this._distToSegment(px, py, seg.x1, seg.y1, seg.x2, seg.y2);
      if (d <= radius && d < closestDist) {
        closestDist = d;
        closest = seg;
      }
    }
    return closest;
  }

  collectFragment(px: number, py: number, radius: number): number {
    let count = 0;
    for (const frag of this.fragments) {
      if (frag.collected) continue;
      const dist = Math.hypot(px - frag.x, py - frag.y);
      if (dist < radius + frag.radius) {
        frag.collected = true;
        count++;
      }
    }
    return count;
  }

  isAtExit(px: number, py: number): boolean {
    const dist = Math.hypot(px - this.exitX, py - this.exitY);
    return dist < this.exitRadius + 12;
  }
}
