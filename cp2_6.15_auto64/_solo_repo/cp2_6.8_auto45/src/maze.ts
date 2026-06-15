export interface Cell {
  x: number;
  y: number;
}

export interface Coin {
  x: number;
  y: number;
  collected: boolean;
}

export interface Trap {
  x: number;
  y: number;
  triggered: boolean;
}

export class Maze {
  public readonly grid: number[][];
  public readonly rows: number;
  public readonly cols: number;
  public readonly cellSize: number;
  public readonly entrance: Cell;
  public readonly exit: Cell;
  public coins: Coin[];
  public traps: Trap[];
  private readonly brightnessMap: number[][];

  constructor(size: number, cellSize: number) {
    this.cols = size;
    this.rows = size;
    this.cellSize = cellSize;
    this.grid = this.generate(size, size);
    this.entrance = { x: 0, y: 0 };
    this.exit = { x: size - 1, y: size - 1 };
    this.brightnessMap = this.generateBrightnessMap();
    this.coins = this.placeCoins(5);
    this.traps = this.placeTraps(3);
  }

  private generateBrightnessMap(): number[][] {
    const map: number[][] = [];
    for (let y = 0; y < this.rows * 2 + 1; y++) {
      map[y] = [];
      for (let x = 0; x < this.cols * 2 + 1; x++) {
        map[y][x] = 0.9 + Math.random() * 0.2;
      }
    }
    return map;
  }

  public getBrightness(gx: number, gy: number): number {
    if (gx < 0 || gy < 0 || gy >= this.brightnessMap.length || gx >= this.brightnessMap[0].length) {
      return 1;
    }
    return this.brightnessMap[gy][gx];
  }

  private generate(cols: number, rows: number): number[][] {
    const gridCols = cols * 2 + 1;
    const gridRows = rows * 2 + 1;
    const grid: number[][] = [];

    for (let y = 0; y < gridRows; y++) {
      grid[y] = [];
      for (let x = 0; x < gridCols; x++) {
        grid[y][x] = 1;
      }
    }

    const visited: boolean[][] = [];
    for (let y = 0; y < rows; y++) {
      visited[y] = [];
      for (let x = 0; x < cols; x++) {
        visited[y][x] = false;
      }
    }

    const stack: Cell[] = [];
    const startX = 0;
    const startY = 0;
    visited[startY][startX] = true;
    grid[startY * 2 + 1][startX * 2 + 1] = 0;
    stack.push({ x: startX, y: startY });

    const dirs = [
      { dx: 0, dy: -1 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
      { dx: 1, dy: 0 }
    ];

    while (stack.length > 0) {
      const current = stack[stack.length - 1];
      const neighbors: { x: number; y: number; dx: number; dy: number }[] = [];

      for (const d of dirs) {
        const nx = current.x + d.dx;
        const ny = current.y + d.dy;
        if (nx >= 0 && nx < cols && ny >= 0 && ny < rows && !visited[ny][nx]) {
          neighbors.push({ x: nx, y: ny, dx: d.dx, dy: d.dy });
        }
      }

      if (neighbors.length > 0) {
        const next = neighbors[Math.floor(Math.random() * neighbors.length)];
        grid[current.y * 2 + 1 + next.dy][current.x * 2 + 1 + next.dx] = 0;
        grid[next.y * 2 + 1][next.x * 2 + 1] = 0;
        visited[next.y][next.x] = true;
        stack.push({ x: next.x, y: next.y });
      } else {
        stack.pop();
      }
    }

    return grid;
  }

  public isWall(px: number, py: number): boolean {
    const gx = Math.floor(px / this.cellSize);
    const gy = Math.floor(py / this.cellSize);
    if (gx < 0 || gy < 0 || gy >= this.grid.length || gx >= this.grid[0].length) {
      return true;
    }
    return this.grid[gy][gx] === 1;
  }

  public getGridCols(): number {
    return this.cols * 2 + 1;
  }

  public getGridRows(): number {
    return this.rows * 2 + 1;
  }

  private getEmptyCells(): Cell[] {
    const cells: Cell[] = [];
    for (let y = 0; y < this.getGridRows(); y++) {
      for (let x = 0; x < this.getGridCols(); x++) {
        if (this.grid[y][x] === 0) {
          const isEntrance = x === this.entrance.x * 2 + 1 && y === this.entrance.y * 2 + 1;
          const isExit = x === this.exit.x * 2 + 1 && y === this.exit.y * 2 + 1;
          if (!isEntrance && !isExit) {
            cells.push({ x, y });
          }
        }
      }
    }
    return cells;
  }

  private placeCoins(count: number): Coin[] {
    const empty = this.getEmptyCells();
    const coins: Coin[] = [];
    for (let i = 0; i < count && empty.length > 0; i++) {
      const idx = Math.floor(Math.random() * empty.length);
      const cell = empty.splice(idx, 1)[0];
      coins.push({
        x: cell.x * this.cellSize + this.cellSize / 2,
        y: cell.y * this.cellSize + this.cellSize / 2,
        collected: false
      });
    }
    return coins;
  }

  private placeTraps(count: number): Trap[] {
    const empty = this.getEmptyCells();
    const traps: Trap[] = [];
    for (let i = 0; i < count && empty.length > 0; i++) {
      const idx = Math.floor(Math.random() * empty.length);
      const cell = empty.splice(idx, 1)[0];
      traps.push({
        x: cell.x * this.cellSize + this.cellSize / 2,
        y: cell.y * this.cellSize + this.cellSize / 2,
        triggered: false
      });
    }
    return traps;
  }

  public getExitPixel(): { x: number; y: number } {
    return {
      x: (this.exit.x * 2 + 1) * this.cellSize + this.cellSize / 2,
      y: (this.exit.y * 2 + 1) * this.cellSize + this.cellSize / 2
    };
  }

  public getStartPixel(): { x: number; y: number } {
    return {
      x: (this.entrance.x * 2 + 1) * this.cellSize + this.cellSize / 2,
      y: (this.entrance.y * 2 + 1) * this.cellSize + this.cellSize / 2
    };
  }
}
