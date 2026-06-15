export interface Cell {
  x: number;
  y: number;
  walls: {
    top: boolean;
    right: boolean;
    bottom: boolean;
    left: boolean;
  };
  visited: boolean;
  hasKey?: boolean;
  hasTrap?: boolean;
  isExit?: boolean;
  isStart?: boolean;
}

export class MazeGenerator {
  private size: number;
  private grid: Cell[][];

  constructor(size: number) {
    this.size = size;
    this.grid = this.createGrid();
  }

  private createGrid(): Cell[][] {
    const grid: Cell[][] = [];
    for (let y = 0; y < this.size; y++) {
      grid[y] = [];
      for (let x = 0; x < this.size; x++) {
        grid[y][x] = {
          x,
          y,
          walls: {
            top: true,
            right: true,
            bottom: true,
            left: true,
          },
          visited: false,
        };
      }
    }
    return grid;
  }

  private getUnvisitedNeighbors(cell: Cell): Cell[] {
    const neighbors: Cell[] = [];
    const { x, y } = cell;

    if (y > 0 && !this.grid[y - 1][x].visited) {
      neighbors.push(this.grid[y - 1][x]);
    }
    if (x < this.size - 1 && !this.grid[y][x + 1].visited) {
      neighbors.push(this.grid[y][x + 1]);
    }
    if (y < this.size - 1 && !this.grid[y + 1][x].visited) {
      neighbors.push(this.grid[y + 1][x]);
    }
    if (x > 0 && !this.grid[y][x - 1].visited) {
      neighbors.push(this.grid[y][x - 1]);
    }

    return neighbors;
  }

  private removeWall(current: Cell, next: Cell): void {
    const dx = next.x - current.x;
    const dy = next.y - current.y;

    if (dx === 1) {
      current.walls.right = false;
      next.walls.left = false;
    } else if (dx === -1) {
      current.walls.left = false;
      next.walls.right = false;
    } else if (dy === 1) {
      current.walls.bottom = false;
      next.walls.top = false;
    } else if (dy === -1) {
      current.walls.top = false;
      next.walls.bottom = false;
    }
  }

  public generate(): Cell[][] {
    const stack: Cell[] = [];
    const startCell = this.grid[0][0];
    startCell.visited = true;
    stack.push(startCell);

    while (stack.length > 0) {
      const current = stack[stack.length - 1];
      const neighbors = this.getUnvisitedNeighbors(current);

      if (neighbors.length === 0) {
        stack.pop();
      } else {
        const next = neighbors[Math.floor(Math.random() * neighbors.length)];
        next.visited = true;
        this.removeWall(current, next);
        stack.push(next);
      }
    }

    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        this.grid[y][x].visited = false;
      }
    }

    this.grid[0][0].isStart = true;
    this.grid[this.size - 1][this.size - 1].isExit = true;

    return this.grid;
  }

  public placeItems(keyCount: number, trapCount: number): void {
    const availableCells: Cell[] = [];

    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        const cell = this.grid[y][x];
        if (!cell.isStart && !cell.isExit) {
          availableCells.push(cell);
        }
      }
    }

    for (let i = availableCells.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [availableCells[i], availableCells[j]] = [availableCells[j], availableCells[i]];
    }

    let index = 0;
    for (let i = 0; i < keyCount && index < availableCells.length; i++) {
      availableCells[index].hasKey = true;
      index++;
    }

    for (let i = 0; i < trapCount && index < availableCells.length; i++) {
      availableCells[index].hasTrap = true;
      index++;
    }
  }

  public getGrid(): Cell[][] {
    return this.grid;
  }

  public getSize(): number {
    return this.size;
  }
}
