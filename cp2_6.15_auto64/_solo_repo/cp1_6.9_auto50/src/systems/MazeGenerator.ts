export interface Cell {
  x: number;
  y: number;
  walls: { top: boolean; right: boolean; bottom: boolean; left: boolean };
  visited: boolean;
}

export interface Exit {
  x: number;
  y: number;
  discovered: boolean;
}

export interface MazeData {
  width: number;
  height: number;
  cells: Cell[][];
  exits: Exit[];
  startX: number;
  startY: number;
}

export class MazeGenerator {
  private width: number;
  private height: number;
  private cells: Cell[][];
  private exits: Exit[];
  private exitCount: number;

  constructor(width: number, height: number, exitCount: number) {
    this.width = width;
    this.height = height;
    this.exitCount = Math.min(exitCount, 7);
    this.cells = [];
    this.exits = [];
  }

  public generate(): MazeData {
    this.initializeCells();
    this.recursiveBacktrack(0, 0);
    this.placeExits();

    return {
      width: this.width,
      height: this.height,
      cells: this.cells,
      exits: this.exits,
      startX: 0,
      startY: 0
    };
  }

  private initializeCells(): void {
    this.cells = [];
    for (let y = 0; y < this.height; y++) {
      const row: Cell[] = [];
      for (let x = 0; x < this.width; x++) {
        row.push({
          x,
          y,
          walls: { top: true, right: true, bottom: true, left: true },
          visited: false
        });
      }
      this.cells.push(row);
    }
  }

  private recursiveBacktrack(x: number, y: number): void {
    const stack: Cell[] = [];
    const start = this.cells[y][x];
    start.visited = true;
    stack.push(start);

    while (stack.length > 0) {
      const current = stack[stack.length - 1];
      const neighbors = this.getUnvisitedNeighbors(current.x, current.y);

      if (neighbors.length === 0) {
        stack.pop();
        continue;
      }

      const next = neighbors[Math.floor(Math.random() * neighbors.length)];
      this.removeWall(current, next);
      next.visited = true;
      stack.push(next);
    }
  }

  private getUnvisitedNeighbors(x: number, y: number): Cell[] {
    const neighbors: Cell[] = [];
    if (y > 0 && !this.cells[y - 1][x].visited) neighbors.push(this.cells[y - 1][x]);
    if (x < this.width - 1 && !this.cells[y][x + 1].visited) neighbors.push(this.cells[y][x + 1]);
    if (y < this.height - 1 && !this.cells[y + 1][x].visited) neighbors.push(this.cells[y + 1][x]);
    if (x > 0 && !this.cells[y][x - 1].visited) neighbors.push(this.cells[y][x - 1]);
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

  public canMoveFrom(x: number, y: number, direction: 'up' | 'down' | 'left' | 'right'): boolean {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return false;
    const cell = this.cells[y][x];
    switch (direction) {
      case 'up':
        return y > 0 && !cell.walls.top;
      case 'down':
        return y < this.height - 1 && !cell.walls.bottom;
      case 'left':
        return x > 0 && !cell.walls.left;
      case 'right':
        return x < this.width - 1 && !cell.walls.right;
    }
  }

  private placeExits(): void {
    this.exits = [];
    const candidates: { x: number; y: number; dist: number }[] = [];

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (x === 0 && y === 0) continue;
        const dist = Math.abs(x) + Math.abs(y);
        if (dist >= Math.floor((this.width + this.height) / 3)) {
          candidates.push({ x, y, dist });
        }
      }
    }

    candidates.sort(() => Math.random() - 0.5);

    let placed = 0;
    const minDistance = 3;

    for (const candidate of candidates) {
      if (placed >= this.exitCount) break;

      const tooClose = this.exits.some(
        (e) => Math.abs(e.x - candidate.x) + Math.abs(e.y - candidate.y) < minDistance
      );

      if (!tooClose) {
        this.exits.push({ x: candidate.x, y: candidate.y, discovered: false });
        placed++;
      }
    }

    while (this.exits.length < this.exitCount && candidates.length > 0) {
      const idx = Math.floor(Math.random() * candidates.length);
      const c = candidates[idx];
      if (!this.exits.some((e) => e.x === c.x && e.y === c.y)) {
        this.exits.push({ x: c.x, y: c.y, discovered: false });
      }
      candidates.splice(idx, 1);
    }
  }
}
