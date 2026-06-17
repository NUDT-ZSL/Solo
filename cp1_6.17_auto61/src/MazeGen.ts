export interface Wall {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Cell {
  row: number;
  col: number;
  walls: { top: boolean; right: boolean; bottom: boolean; left: boolean };
  visited: boolean;
}

export interface Gem {
  id: number;
  x: number;
  y: number;
  type: 'blue' | 'green' | 'purple';
  score: number;
  collected: boolean;
  glowStartTime: number | null;
}

export const GRID_SIZE = 11;
export const CELL_SIZE = 28;
export const PATH_WIDTH = 20;
export const WALL_THICKNESS = (CELL_SIZE - PATH_WIDTH) / 2;
export const MAZE_SIZE = GRID_SIZE * CELL_SIZE;

export class MazeGenerator {
  private grid: Cell[][] = [];
  private walls: Wall[] = [];
  private gems: Gem[] = [];

  generate(): { walls: Wall[]; gems: Gem[]; startX: number; startY: number } {
    this.initGrid();
    this.carveMaze(0, 0);
    this.buildWalls();
    this.placeGems();
    const startX = CELL_SIZE / 2;
    const startY = CELL_SIZE / 2;
    return { walls: this.walls, gems: this.gems, startX, startY };
  }

  private initGrid(): void {
    this.grid = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      const row: Cell[] = [];
      for (let c = 0; c < GRID_SIZE; c++) {
        row.push({
          row: r,
          col: c,
          walls: { top: true, right: true, bottom: true, left: true },
          visited: false
        });
      }
      this.grid.push(row);
    }
  }

  private carveMaze(startRow: number, startCol: number): void {
    const stack: [number, number][] = [];
    this.grid[startRow][startCol].visited = true;
    stack.push([startRow, startCol]);

    while (stack.length > 0) {
      const [row, col] = stack[stack.length - 1];
      const neighbors = this.getUnvisitedNeighbors(row, col);

      if (neighbors.length === 0) {
        stack.pop();
        continue;
      }

      const idx = Math.floor(Math.random() * neighbors.length);
      const [nextRow, nextCol] = neighbors[idx];
      this.removeWall(row, col, nextRow, nextCol);
      this.grid[nextRow][nextCol].visited = true;
      stack.push([nextRow, nextCol]);
    }
  }

  private getUnvisitedNeighbors(row: number, col: number): [number, number][] {
    const neighbors: [number, number][] = [];
    if (row > 0 && !this.grid[row - 1][col].visited) neighbors.push([row - 1, col]);
    if (row < GRID_SIZE - 1 && !this.grid[row + 1][col].visited) neighbors.push([row + 1, col]);
    if (col > 0 && !this.grid[row][col - 1].visited) neighbors.push([row, col - 1]);
    if (col < GRID_SIZE - 1 && !this.grid[row][col + 1].visited) neighbors.push([row, col + 1]);
    return neighbors;
  }

  private removeWall(r1: number, c1: number, r2: number, c2: number): void {
    if (r1 === r2) {
      if (c1 < c2) {
        this.grid[r1][c1].walls.right = false;
        this.grid[r2][c2].walls.left = false;
      } else {
        this.grid[r1][c1].walls.left = false;
        this.grid[r2][c2].walls.right = false;
      }
    } else {
      if (r1 < r2) {
        this.grid[r1][c1].walls.bottom = false;
        this.grid[r2][c2].walls.top = false;
      } else {
        this.grid[r1][c1].walls.top = false;
        this.grid[r2][c2].walls.bottom = false;
      }
    }
  }

  private buildWalls(): void {
    this.walls = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const cell = this.grid[r][c];
        const x = c * CELL_SIZE;
        const y = r * CELL_SIZE;

        if (cell.walls.top && r === 0) {
          this.walls.push({ x, y, width: CELL_SIZE, height: WALL_THICKNESS });
        }
        if (cell.walls.left && c === 0) {
          this.walls.push({ x, y, width: WALL_THICKNESS, height: CELL_SIZE });
        }
        if (cell.walls.right) {
          this.walls.push({
            x: x + CELL_SIZE - WALL_THICKNESS,
            y,
            width: WALL_THICKNESS,
            height: CELL_SIZE
          });
        }
        if (cell.walls.bottom) {
          this.walls.push({
            x,
            y: y + CELL_SIZE - WALL_THICKNESS,
            width: CELL_SIZE,
            height: WALL_THICKNESS
          });
        }
      }
    }
  }

  private placeGems(): void {
    this.gems = [];
    const pathCells: { row: number; col: number }[] = [];

    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (!(r === 0 && c === 0)) {
          pathCells.push({ row: r, col: c });
        }
      }
    }

    for (let i = pathCells.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pathCells[i], pathCells[j]] = [pathCells[j], pathCells[i]];
    }

    const gemConfigs: { type: 'blue' | 'green' | 'purple'; count: number; score: number }[] = [
      { type: 'blue', count: 3, score: 10 },
      { type: 'green', count: 3, score: 20 },
      { type: 'purple', count: 2, score: 50 }
    ];

    let gemId = 0;
    let cellIdx = 0;

    for (const config of gemConfigs) {
      for (let i = 0; i < config.count && cellIdx < pathCells.length; i++) {
        const cell = pathCells[cellIdx++];
        const cx = cell.col * CELL_SIZE + CELL_SIZE / 2;
        const cy = cell.row * CELL_SIZE + CELL_SIZE / 2;
        this.gems.push({
          id: gemId++,
          x: cx,
          y: cy,
          type: config.type,
          score: config.score,
          collected: false,
          glowStartTime: null
        });
      }
    }
  }

  checkWallCollision(x: number, y: number, radius: number = 0): boolean {
    for (const wall of this.walls) {
      const closestX = Math.max(wall.x, Math.min(x, wall.x + wall.width));
      const closestY = Math.max(wall.y, Math.min(y, wall.y + wall.height));
      const dx = x - closestX;
      const dy = y - closestY;
      if (dx * dx + dy * dy < radius * radius) {
        return true;
      }
    }
    return false;
  }

  isPointInWall(px: number, py: number): boolean {
    for (const wall of this.walls) {
      if (
        px >= wall.x &&
        px <= wall.x + wall.width &&
        py >= wall.y &&
        py <= wall.y + wall.height
      ) {
        return true;
      }
    }
    return false;
  }

  getWalls(): Wall[] {
    return this.walls;
  }

  getGems(): Gem[] {
    return this.gems;
  }
}
