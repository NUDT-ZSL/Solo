export interface Cell {
  x: number;
  y: number;
  walls: { top: boolean; right: boolean; bottom: boolean; left: boolean };
  visited: boolean;
}

export interface OrbPlacement {
  x: number;
  y: number;
}

export interface TentaclePlacement {
  startX: number;
  startY: number;
  path: { x: number; y: number }[];
}

export interface MazeData {
  cols: number;
  rows: number;
  cellSize: number;
  grid: Cell[][];
  orbs: OrbPlacement[];
  tentacles: TentaclePlacement[];
  lightPaths: { x1: number; y1: number; x2: number; y2: number; phase: number }[];
}

export class MazeGenerator {
  private cols: number;
  private rows: number;
  private cellSize: number;
  private grid: Cell[][];

  constructor(cols: number, rows: number, cellSize: number) {
    this.cols = cols;
    this.rows = rows;
    this.cellSize = cellSize;
    this.grid = [];
  }

  generate(): MazeData {
    this.initGrid();
    this.carveMaze();
    const orbs = this.placeOrbs();
    const tentacles = this.placeTentacles();
    const lightPaths = this.generateLightPaths();
    return {
      cols: this.cols,
      rows: this.rows,
      cellSize: this.cellSize,
      grid: this.grid,
      orbs,
      tentacles,
      lightPaths,
    };
  }

  private initGrid(): void {
    this.grid = [];
    for (let y = 0; y < this.rows; y++) {
      const row: Cell[] = [];
      for (let x = 0; x < this.cols; x++) {
        row.push({
          x,
          y,
          walls: { top: true, right: true, bottom: true, left: true },
          visited: false,
        });
      }
      this.grid.push(row);
    }
  }

  private carveMaze(): void {
    const stack: Cell[] = [];
    const start = this.grid[0][0];
    start.visited = true;
    stack.push(start);

    while (stack.length > 0) {
      const current = stack[stack.length - 1];
      const neighbors = this.getUnvisitedNeighbors(current);

      if (neighbors.length === 0) {
        stack.pop();
      } else {
        const next = neighbors[Math.floor(Math.random() * neighbors.length)];
        this.removeWall(current, next);
        next.visited = true;
        stack.push(next);
      }
    }

    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        if (Math.random() < 0.15) {
          const cell = this.grid[y][x];
          const dirs = ['top', 'right', 'bottom', 'left'] as const;
          const dir = dirs[Math.floor(Math.random() * dirs.length)];
          const nx = x + (dir === 'right' ? 1 : dir === 'left' ? -1 : 0);
          const ny = y + (dir === 'bottom' ? 1 : dir === 'top' ? -1 : 0);
          if (nx >= 0 && nx < this.cols && ny >= 0 && ny < this.rows) {
            this.removeWall(cell, this.grid[ny][nx]);
          }
        }
      }
    }
  }

  private getUnvisitedNeighbors(cell: Cell): Cell[] {
    const { x, y } = cell;
    const neighbors: Cell[] = [];
    if (y > 0 && !this.grid[y - 1][x].visited) neighbors.push(this.grid[y - 1][x]);
    if (x < this.cols - 1 && !this.grid[y][x + 1].visited) neighbors.push(this.grid[y][x + 1]);
    if (y < this.rows - 1 && !this.grid[y + 1][x].visited) neighbors.push(this.grid[y + 1][x]);
    if (x > 0 && !this.grid[y][x - 1].visited) neighbors.push(this.grid[y][x - 1]);
    return neighbors;
  }

  private removeWall(a: Cell, b: Cell): void {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    if (dx === 1) { a.walls.right = false; b.walls.left = false; }
    else if (dx === -1) { a.walls.left = false; b.walls.right = false; }
    else if (dy === 1) { a.walls.bottom = false; b.walls.top = false; }
    else if (dy === -1) { a.walls.top = false; b.walls.bottom = false; }
  }

  private placeOrbs(): OrbPlacement[] {
    const orbs: OrbPlacement[] = [];
    const count = Math.floor(this.cols * this.rows * 0.15);
    const used = new Set<string>();

    while (orbs.length < count) {
      const x = Math.floor(Math.random() * this.cols);
      const y = Math.floor(Math.random() * this.rows);
      const key = `${x},${y}`;
      if (!used.has(key) && !(x === 0 && y === 0)) {
        used.add(key);
        orbs.push({
          x: x * this.cellSize + this.cellSize / 2,
          y: y * this.cellSize + this.cellSize / 2,
        });
      }
    }
    return orbs;
  }

  private placeTentacles(): TentaclePlacement[] {
    const tentacles: TentaclePlacement[] = [];
    const count = Math.max(3, Math.floor(this.cols * this.rows * 0.03));

    for (let i = 0; i < count; i++) {
      const sx = Math.floor(Math.random() * this.cols);
      const sy = Math.floor(Math.random() * this.rows);
      const path = this.generateTentaclePath(sx, sy);
      tentacles.push({
        startX: sx * this.cellSize + this.cellSize / 2,
        startY: sy * this.cellSize + this.cellSize / 2,
        path,
      });
    }
    return tentacles;
  }

  private generateTentaclePath(sx: number, sy: number): { x: number; y: number }[] {
    const path: { x: number; y: number }[] = [];
    let cx = sx;
    let cy = sy;
    const pathLen = 8 + Math.floor(Math.random() * 12);

    path.push({ x: cx * this.cellSize + this.cellSize / 2, y: cy * this.cellSize + this.cellSize / 2 });

    for (let i = 0; i < pathLen; i++) {
      const moves = this.getAvailableMoves(cx, cy);
      if (moves.length === 0) break;
      const move = moves[Math.floor(Math.random() * moves.length)];
      cx = move.x;
      cy = move.y;
      path.push({ x: cx * this.cellSize + this.cellSize / 2, y: cy * this.cellSize + this.cellSize / 2 });
    }
    return path;
  }

  private getAvailableMoves(x: number, y: number): { x: number; y: number }[] {
    const moves: { x: number; y: number }[] = [];
    const cell = this.grid[y][x];
    if (!cell.walls.top && y > 0) moves.push({ x, y: y - 1 });
    if (!cell.walls.right && x < this.cols - 1) moves.push({ x: x + 1, y });
    if (!cell.walls.bottom && y < this.rows - 1) moves.push({ x, y: y + 1 });
    if (!cell.walls.left && x > 0) moves.push({ x: x - 1, y });
    return moves;
  }

  private generateLightPaths(): MazeData['lightPaths'] {
    const paths: MazeData['lightPaths'] = [];
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const cell = this.grid[y][x];
        const cx = x * this.cellSize;
        const cy = y * this.cellSize;
        const cs = this.cellSize;
        const phase = Math.random() * Math.PI * 2;

        if (!cell.walls.right && x < this.cols - 1) {
          paths.push({ x1: cx + cs, y1: cy + cs / 2, x2: cx + cs, y2: cy + cs / 2, phase });
        }
        if (!cell.walls.bottom && y < this.rows - 1) {
          paths.push({ x1: cx + cs / 2, y1: cy + cs, x2: cx + cs / 2, y2: cy + cs, phase });
        }
      }
    }
    return paths;
  }

  isWallAt(px: number, py: number): boolean {
    const cellX = Math.floor(px / this.cellSize);
    const cellY = Math.floor(py / this.cellSize);
    if (cellX < 0 || cellX >= this.cols || cellY < 0 || cellY >= this.rows) return true;

    const localX = px - cellX * this.cellSize;
    const localY = py - cellY * this.cellSize;
    const cell = this.grid[cellY][cellX];
    const wallThick = 3;

    if (cell.walls.top && localY < wallThick) return true;
    if (cell.walls.bottom && localY > this.cellSize - wallThick) return true;
    if (cell.walls.left && localX < wallThick) return true;
    if (cell.walls.right && localX > this.cellSize - wallThick) return true;
    return false;
  }

  canMoveBetween(fromX: number, fromY: number, toX: number, toY: number): boolean {
    const fcx = Math.floor(fromX / this.cellSize);
    const fcy = Math.floor(fromY / this.cellSize);
    const tcx = Math.floor(toX / this.cellSize);
    const tcy = Math.floor(toY / this.cellSize);

    if (fcx === tcx && fcy === tcy) return true;
    if (tcx < 0 || tcx >= this.cols || tcy < 0 || tcy >= this.rows) return false;

    const fromCell = this.grid[fcy][fcx];
    const dx = tcx - fcx;
    const dy = tcy - fcy;

    if (dx === 1 && dy === 0) return !fromCell.walls.right;
    if (dx === -1 && dy === 0) return !fromCell.walls.left;
    if (dx === 0 && dy === 1) return !fromCell.walls.bottom;
    if (dx === 0 && dy === -1) return !fromCell.walls.top;
    return false;
  }
}
