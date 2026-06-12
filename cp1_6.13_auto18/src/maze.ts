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
}

interface Fragment {
  x: number;
  y: number;
  collected: boolean;
}

export class Maze {
  hWalls: boolean[][];
  vWalls: boolean[][];
  fragments: Fragment[];
  exitX: number;
  exitY: number;
  exitRadius: number;

  constructor() {
    this.hWalls = [];
    this.vWalls = [];
    for (let r = 0; r <= ROWS; r++) {
      this.hWalls[r] = [];
      for (let c = 0; c < COLS; c++) {
        this.hWalls[r][c] = true;
      }
    }
    for (let r = 0; r < ROWS; r++) {
      this.vWalls[r] = [];
      for (let c = 0; c <= COLS; c++) {
        this.vWalls[r][c] = true;
      }
    }

    this.exitX = Math.floor(COLS / 2) * CELL_SIZE + CELL_SIZE / 2;
    this.exitY = Math.floor(ROWS / 2) * CELL_SIZE + CELL_SIZE / 2;
    this.exitRadius = 15;

    this.fragments = [];
    this.generate();
    this.placeFragments();
  }

  private generate(): void {
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

    const dirs: [number, number, string, string][] = [
      [-1, 0, 'top', 'bottom'],
      [1, 0, 'bottom', 'top'],
      [0, -1, 'left', 'right'],
      [0, 1, 'right', 'left'],
    ];

    while (stack.length > 0) {
      const [cr, cc] = stack[stack.length - 1];
      const neighbors: [number, number, string, string][] = [];

      for (const [dr, dc, wallA, wallB] of dirs) {
        const nr = cr + dr;
        const nc = cc + dc;
        if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && !visited[nr][nc]) {
          neighbors.push([nr, nc, wallA, wallB]);
        }
      }

      if (neighbors.length === 0) {
        stack.pop();
        continue;
      }

      const idx = Math.floor(Math.random() * neighbors.length);
      const [nr, nc, wallA] = neighbors[idx];
      this.removeWallBetween(cr, cc, nr, nc, wallA);
      visited[nr][nc] = true;
      stack.push([nr, nc]);
    }
  }

  private removeWallBetween(r1: number, c1: number, r2: number, c2: number, direction: string): void {
    switch (direction) {
      case 'top':
        this.hWalls[r1][c1] = false;
        break;
      case 'bottom':
        this.hWalls[r1 + 1][c1] = false;
        break;
      case 'left':
        this.vWalls[r1][c1] = false;
        break;
      case 'right':
        this.vWalls[r1][c1 + 1] = false;
        break;
    }
  }

  private placeFragments(): void {
    const count = 10;
    const placed: Set<string> = new Set();
    const centerR = Math.floor(ROWS / 2);
    const centerC = Math.floor(COLS / 2);

    while (this.fragments.length < count) {
      const r = Math.floor(Math.random() * ROWS);
      const c = Math.floor(Math.random() * COLS);
      const key = `${r},${c}`;
      if (placed.has(key)) continue;
      if (r === 0 && c === 0) continue;
      if (r === centerR && c === centerC) continue;

      if (this.hasAdjacentWall(r, c)) {
        placed.add(key);
        this.fragments.push({
          x: c * CELL_SIZE + CELL_SIZE / 2,
          y: r * CELL_SIZE + CELL_SIZE / 2,
          collected: false,
        });
      }
    }
  }

  private hasAdjacentWall(r: number, c: number): boolean {
    if (r > 0 && this.hWalls[r][c]) return true;
    if (r < ROWS - 1 && this.hWalls[r + 1][c]) return true;
    if (c > 0 && this.vWalls[r][c]) return true;
    if (c < COLS - 1 && this.vWalls[r][c + 1]) return true;
    return false;
  }

  getWallSegments(): WallSegment[] {
    const segments: WallSegment[] = [];

    for (let r = 0; r <= ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (this.hWalls[r][c]) {
          segments.push({
            x1: c * CELL_SIZE,
            y1: r * CELL_SIZE,
            x2: (c + 1) * CELL_SIZE,
            y2: r * CELL_SIZE,
          });
        }
      }
    }

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c <= COLS; c++) {
        if (this.vWalls[r][c]) {
          segments.push({
            x1: c * CELL_SIZE,
            y1: r * CELL_SIZE,
            x2: c * CELL_SIZE,
            y2: (r + 1) * CELL_SIZE,
          });
        }
      }
    }

    return segments;
  }

  canMove(fromX: number, fromY: number, toX: number, toY: number): boolean {
    const margin = 12;
    const points = [
      [toX - margin, toY - margin],
      [toX + margin, toY - margin],
      [toX - margin, toY + margin],
      [toX + margin, toY + margin],
    ];

    for (const [px, py] of points) {
      if (px < 0 || px >= MAZE_WIDTH || py < 0 || py >= MAZE_HEIGHT) {
        return false;
      }
    }

    const fromR = Math.floor(fromY / CELL_SIZE);
    const fromC = Math.floor(fromX / CELL_SIZE);
    const toR = Math.floor(toY / CELL_SIZE);
    const toC = Math.floor(toX / CELL_SIZE);

    if (fromR === toR && fromC === toC) return true;

    const minR = Math.min(fromR, toR);
    const maxR = Math.max(fromR, toR);
    const minC = Math.min(fromC, toC);
    const maxC = Math.max(fromC, toC);

    for (let r = minR; r <= maxR; r++) {
      for (let c = minC; c <= maxC; c++) {
        if (r < 0 || r >= ROWS || c < 0 || c >= COLS) continue;

        if (r > minR && this.hWalls[r][c]) {
          return false;
        }
        if (r < maxR && this.hWalls[r + 1][c] && maxR > minR) {
          const wallY = (r + 1) * CELL_SIZE;
          if (toY < fromY && fromY >= wallY && toY < wallY) return false;
          if (toY > fromY && fromY <= wallY && toY > wallY) return false;
        }
        if (c > minC && this.vWalls[r][c]) {
          return false;
        }
        if (c < maxC && this.vWalls[r][c + 1] && maxC > minC) {
          const wallX = (c + 1) * CELL_SIZE;
          if (toX < fromX && fromX >= wallX && toX < wallX) return false;
          if (toX > fromX && fromX <= wallX && toX > wallX) return false;
        }
      }
    }

    return true;
  }

  isWallAt(px: number, py: number): boolean {
    for (let r = 0; r <= ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (this.hWalls[r][c]) {
          const wy = r * CELL_SIZE;
          const wx1 = c * CELL_SIZE;
          const wx2 = (c + 1) * CELL_SIZE;
          if (py >= wy - 2 && py <= wy + 2 && px >= wx1 && px <= wx2) return true;
        }
      }
    }
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c <= COLS; c++) {
        if (this.vWalls[r][c]) {
          const wx = c * CELL_SIZE;
          const wy1 = r * CELL_SIZE;
          const wy2 = (r + 1) * CELL_SIZE;
          if (px >= wx - 2 && px <= wx + 2 && py >= wy1 && py <= wy2) return true;
        }
      }
    }
    return false;
  }

  getWallNear(px: number, py: number, radius: number): WallSegment | null {
    const segments = this.getWallSegments();
    for (const seg of segments) {
      const dist = this.distToSegment(px, py, seg.x1, seg.y1, seg.x2, seg.y2);
      if (dist <= radius) return seg;
    }
    return null;
  }

  private distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
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

  collectFragment(px: number, py: number, radius: number): number {
    let count = 0;
    for (const frag of this.fragments) {
      if (frag.collected) continue;
      const dist = Math.hypot(px - frag.x, py - frag.y);
      if (dist < radius + 12) {
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
