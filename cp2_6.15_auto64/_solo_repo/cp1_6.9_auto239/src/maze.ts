export interface Cell {
  x: number;
  y: number;
  walls: { top: boolean; right: boolean; bottom: boolean; left: boolean };
  visited: boolean;
}

export interface WallPosition {
  x: number;
  z: number;
  isHorizontal: boolean;
}

export class Maze {
  readonly size: number;
  readonly cellSize: number;
  private grid: Cell[][];

  constructor(size: number = 10, cellSize: number = 4) {
    this.size = size;
    this.cellSize = cellSize;
    this.grid = [];
    this.initialize();
    this.generate();
  }

  private initialize(): void {
    for (let y = 0; y < this.size; y++) {
      this.grid[y] = [];
      for (let x = 0; x < this.size; x++) {
        this.grid[y][x] = {
          x,
          y,
          walls: { top: true, right: true, bottom: true, left: true },
          visited: false,
        };
      }
    }
  }

  private generate(): void {
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
  }

  private getUnvisitedNeighbors(cell: Cell): Cell[] {
    const neighbors: Cell[] = [];
    const { x, y } = cell;

    if (y > 0 && !this.grid[y - 1][x].visited) neighbors.push(this.grid[y - 1][x]);
    if (x < this.size - 1 && !this.grid[y][x + 1].visited) neighbors.push(this.grid[y][x + 1]);
    if (y < this.size - 1 && !this.grid[y + 1][x].visited) neighbors.push(this.grid[y + 1][x]);
    if (x > 0 && !this.grid[y][x - 1].visited) neighbors.push(this.grid[y][x - 1]);

    return neighbors;
  }

  private removeWall(a: Cell, b: Cell): void {
    const dx = b.x - a.x;
    const dy = b.y - a.y;

    if (dx === 1) {
      a.walls.right = false;
      b.walls.left = false;
    } else if (dx === -1) {
      a.walls.left = false;
      b.walls.right = false;
    } else if (dy === 1) {
      a.walls.bottom = false;
      b.walls.top = false;
    } else if (dy === -1) {
      a.walls.top = false;
      b.walls.bottom = false;
    }
  }

  getCell(x: number, y: number): Cell | null {
    if (x < 0 || x >= this.size || y < 0 || y >= this.size) return null;
    return this.grid[y][x];
  }

  getGrid(): Cell[][] {
    return this.grid;
  }

  getWallPositions(): WallPosition[] {
    const walls: WallPosition[] = [];

    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        const cell = this.grid[y][x];
        const wx = x * this.cellSize;
        const wz = y * this.cellSize;

        if (cell.walls.top) {
          walls.push({ x: wx + this.cellSize / 2, z: wz, isHorizontal: true });
        }
        if (cell.walls.left) {
          walls.push({ x: wx, z: wz + this.cellSize / 2, isHorizontal: false });
        }
        if (y === this.size - 1 && cell.walls.bottom) {
          walls.push({ x: wx + this.cellSize / 2, z: wz + this.cellSize, isHorizontal: true });
        }
        if (x === this.size - 1 && cell.walls.right) {
          walls.push({ x: wx + this.cellSize, z: wz + this.cellSize / 2, isHorizontal: false });
        }
      }
    }

    return walls;
  }

  getRandomCorridorPositions(count: number, excludeStart: boolean = true): { x: number; z: number }[] {
    const positions: { x: number; z: number }[] = [];
    const corridorCells: { x: number; y: number }[] = [];

    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        if (excludeStart && x === 0 && y === 0) continue;
        if (x === this.size - 1 && y === this.size - 1) continue;
        corridorCells.push({ x, y });
      }
    }

    for (let i = corridorCells.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [corridorCells[i], corridorCells[j]] = [corridorCells[j], corridorCells[i]];
    }

    for (let i = 0; i < Math.min(count, corridorCells.length); i++) {
      const cell = corridorCells[i];
      positions.push({
        x: cell.x * this.cellSize + this.cellSize / 2,
        z: cell.y * this.cellSize + this.cellSize / 2,
      });
    }

    return positions;
  }

  getRandomPath(maxSteps: number = 15): { x: number; z: number }[] {
    const path: { x: number; z: number }[] = [];
    let startCell: { x: number; y: number };

    do {
      startCell = {
        x: Math.floor(Math.random() * this.size),
        y: Math.floor(Math.random() * this.size),
      };
    } while (
      (startCell.x === 0 && startCell.y === 0) ||
      (startCell.x === this.size - 1 && startCell.y === this.size - 1)
    );

    let currentX = startCell.x;
    let currentY = startCell.y;
    const visited = new Set<string>();
    visited.add(`${currentX},${currentY}`);

    path.push({
      x: currentX * this.cellSize + this.cellSize / 2,
      z: currentY * this.cellSize + this.cellSize / 2,
    });

    for (let step = 0; step < maxSteps; step++) {
      const cell = this.grid[currentY][currentX];
      const directions: { dx: number; dy: number; wall: keyof Cell['walls'] }[] = [
        { dx: 0, dy: -1, wall: 'top' },
        { dx: 1, dy: 0, wall: 'right' },
        { dx: 0, dy: 1, wall: 'bottom' },
        { dx: -1, dy: 0, wall: 'left' },
      ];

      const available = directions.filter(
        (d) =>
          !cell.walls[d.wall] &&
          !visited.has(`${currentX + d.dx},${currentY + d.dy}`)
      );

      if (available.length === 0) {
        const anyDir = directions.filter((d) => !cell.walls[d.wall]);
        if (anyDir.length === 0) break;
        const dir = anyDir[Math.floor(Math.random() * anyDir.length)];
        currentX += dir.dx;
        currentY += dir.dy;
      } else {
        const dir = available[Math.floor(Math.random() * available.length)];
        currentX += dir.dx;
        currentY += dir.dy;
        visited.add(`${currentX},${currentY}`);
      }

      path.push({
        x: currentX * this.cellSize + this.cellSize / 2,
        z: currentY * this.cellSize + this.cellSize / 2,
      });
    }

    return path;
  }

  worldToCell(wx: number, wz: number): { x: number; y: number } {
    return {
      x: Math.floor(wx / this.cellSize),
      y: Math.floor(wz / this.cellSize),
    };
  }

  cellToWorld(cx: number, cy: number): { x: number; z: number } {
    return {
      x: cx * this.cellSize + this.cellSize / 2,
      z: cy * this.cellSize + this.cellSize / 2,
    };
  }

  checkCollision(wx: number, wz: number, radius: number): boolean {
    const cellX = Math.floor(wx / this.cellSize);
    const cellZ = Math.floor(wz / this.cellSize);
    const cell = this.getCell(cellX, cellZ);

    if (!cell) return true;

    const localX = wx - cellX * this.cellSize;
    const localZ = wz - cellZ * this.cellSize;

    if (cell.walls.top && localZ < radius) return true;
    if (cell.walls.bottom && localZ > this.cellSize - radius) return true;
    if (cell.walls.left && localX < radius) return true;
    if (cell.walls.right && localX > this.cellSize - radius) return true;

    return false;
  }
}
