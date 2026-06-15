export const MAZE_SIZE = 15;
export const CELL_SIZE = 40;
export const WALL_COLOR = '#2D3748';
export const FLOOR_COLOR = '#1A202C';
export const EXIT_COLOR = '#48BB78';
export const TRAP_GLOW_COLOR = 'rgba(229, 62, 62, 0.3)';

export interface Cell {
  x: number;
  y: number;
  walls: { top: boolean; right: boolean; bottom: boolean; left: boolean };
  visited: boolean;
  isExit: boolean;
  isTrap: boolean;
}

export class Maze {
  public grid: Cell[][];
  public exitX: number;
  public exitY: number;
  public traps: { x: number; y: number }[];
  private animTime: number = 0;

  constructor() {
    this.grid = [];
    this.exitX = MAZE_SIZE - 1;
    this.exitY = MAZE_SIZE - 1;
    this.traps = [];
    this.generate();
  }

  private generate(): void {
    for (let y = 0; y < MAZE_SIZE; y++) {
      this.grid[y] = [];
      for (let x = 0; x < MAZE_SIZE; x++) {
        this.grid[y][x] = {
          x,
          y,
          walls: { top: true, right: true, bottom: true, left: true },
          visited: false,
          isExit: false,
          isTrap: false
        };
      }
    }

    this.grid[this.exitY][this.exitX].isExit = true;

    const stack: Cell[] = [];
    const startCell = this.grid[0][0];
    startCell.visited = true;
    stack.push(startCell);

    while (stack.length > 0) {
      const current = stack[stack.length - 1];
      const neighbors = this.getUnvisitedNeighbors(current);

      if (neighbors.length > 0) {
        const next = neighbors[Math.floor(Math.random() * neighbors.length)];
        this.removeWalls(current, next);
        next.visited = true;
        stack.push(next);
      } else {
        stack.pop();
      }
    }

    this.placeTraps();
  }

  private getUnvisitedNeighbors(cell: Cell): Cell[] {
    const neighbors: Cell[] = [];
    const { x, y } = cell;

    if (y > 0 && !this.grid[y - 1][x].visited) neighbors.push(this.grid[y - 1][x]);
    if (x < MAZE_SIZE - 1 && !this.grid[y][x + 1].visited) neighbors.push(this.grid[y][x + 1]);
    if (y < MAZE_SIZE - 1 && !this.grid[y + 1][x].visited) neighbors.push(this.grid[y + 1][x]);
    if (x > 0 && !this.grid[y][x - 1].visited) neighbors.push(this.grid[y][x - 1]);

    return neighbors;
  }

  private removeWalls(a: Cell, b: Cell): void {
    const dx = a.x - b.x;
    const dy = a.y - b.y;

    if (dx === 1) {
      a.walls.left = false;
      b.walls.right = false;
    } else if (dx === -1) {
      a.walls.right = false;
      b.walls.left = false;
    }

    if (dy === 1) {
      a.walls.top = false;
      b.walls.bottom = false;
    } else if (dy === -1) {
      a.walls.bottom = false;
      b.walls.top = false;
    }
  }

  private placeTraps(): void {
    this.traps = [];
    const trapCount = 5;
    const availableCells: { x: number; y: number }[] = [];

    for (let y = 0; y < MAZE_SIZE; y++) {
      for (let x = 0; x < MAZE_SIZE; x++) {
        if ((x === 0 && y === 0) || (x === this.exitX && y === this.exitY)) continue;
        availableCells.push({ x, y });
      }
    }

    for (let i = 0; i < trapCount && availableCells.length > 0; i++) {
      const idx = Math.floor(Math.random() * availableCells.length);
      const pos = availableCells.splice(idx, 1)[0];
      this.grid[pos.y][pos.x].isTrap = true;
      this.traps.push(pos);
    }
  }

  public canMove(x: number, y: number, direction: 'up' | 'down' | 'left' | 'right'): boolean {
    if (x < 0 || x >= MAZE_SIZE || y < 0 || y >= MAZE_SIZE) return false;
    const cell = this.grid[y][x];

    switch (direction) {
      case 'up':
        return !cell.walls.top && y > 0;
      case 'down':
        return !cell.walls.bottom && y < MAZE_SIZE - 1;
      case 'left':
        return !cell.walls.left && x > 0;
      case 'right':
        return !cell.walls.right && x < MAZE_SIZE - 1;
    }
  }

  public isTrap(x: number, y: number): boolean {
    if (x < 0 || x >= MAZE_SIZE || y < 0 || y >= MAZE_SIZE) return false;
    return this.grid[y][x].isTrap;
  }

  public isExit(x: number, y: number): boolean {
    return x === this.exitX && y === this.exitY;
  }

  public update(deltaTime: number): void {
    this.animTime += deltaTime;
  }

  public render(ctx: CanvasRenderingContext2D, offsetX: number, offsetY: number): void {
    for (let y = 0; y < MAZE_SIZE; y++) {
      for (let x = 0; x < MAZE_SIZE; x++) {
        const cell = this.grid[y][x];
        const px = offsetX + x * CELL_SIZE;
        const py = offsetY + y * CELL_SIZE;

        ctx.fillStyle = FLOOR_COLOR;
        ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);

        if (cell.isTrap) {
          ctx.save();
          ctx.shadowColor = '#E53E3E';
          ctx.shadowBlur = 8;
          ctx.strokeStyle = TRAP_GLOW_COLOR;
          ctx.lineWidth = 3;
          ctx.strokeRect(px + 2, py + 2, CELL_SIZE - 4, CELL_SIZE - 4);
          ctx.restore();
        }

        if (cell.isExit) {
          const pulse = 0.5 + 0.5 * Math.sin(this.animTime * Math.PI * 2);
          ctx.save();
          ctx.shadowColor = EXIT_COLOR;
          ctx.shadowBlur = 10 + pulse * 10;
          ctx.fillStyle = EXIT_COLOR;
          ctx.fillRect(px + 4, py + 4, CELL_SIZE - 8, CELL_SIZE - 8);
          ctx.restore();
        }

        ctx.strokeStyle = WALL_COLOR;
        ctx.lineWidth = 2;

        if (cell.walls.top) {
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(px + CELL_SIZE, py);
          ctx.stroke();
        }
        if (cell.walls.right) {
          ctx.beginPath();
          ctx.moveTo(px + CELL_SIZE, py);
          ctx.lineTo(px + CELL_SIZE, py + CELL_SIZE);
          ctx.stroke();
        }
        if (cell.walls.bottom) {
          ctx.beginPath();
          ctx.moveTo(px, py + CELL_SIZE);
          ctx.lineTo(px + CELL_SIZE, py + CELL_SIZE);
          ctx.stroke();
        }
        if (cell.walls.left) {
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(px, py + CELL_SIZE);
          ctx.stroke();
        }
      }
    }
  }

  public renderMinimap(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    playerX: number,
    playerY: number,
    hoverScale: number
  ): void {
    const scale = (size / MAZE_SIZE) * hoverScale;
    const totalSize = size * hoverScale;
    const cellSize = scale;

    ctx.save();

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(x, y, totalSize, totalSize);

    const borderWidth = 2;
    ctx.strokeStyle = '#4a5568';
    ctx.lineWidth = borderWidth;
    ctx.strokeRect(x, y, totalSize, totalSize);

    const innerOffset = borderWidth;

    for (let my = 0; my < MAZE_SIZE; my++) {
      for (let mx = 0; mx < MAZE_SIZE; mx++) {
        const cell = this.grid[my][mx];
        const cx = x + innerOffset + mx * cellSize;
        const cy = y + innerOffset + my * cellSize;

        ctx.fillStyle = FLOOR_COLOR;
        ctx.fillRect(cx, cy, cellSize, cellSize);

        if (cell.isTrap) {
          ctx.fillStyle = '#E53E3E';
          const trapSize = cellSize * 0.4;
          ctx.fillRect(
            cx + cellSize / 2 - trapSize / 2,
            cy + cellSize / 2 - trapSize / 2,
            trapSize,
            trapSize
          );
        }

        if (cell.isExit) {
          ctx.fillStyle = EXIT_COLOR;
          ctx.fillRect(cx + 1, cy + 1, cellSize - 2, cellSize - 2);
        }
      }
    }

    const px = x + innerOffset + playerX * cellSize + cellSize / 2;
    const py = y + innerOffset + playerY * cellSize + cellSize / 2;

    ctx.save();
    ctx.shadowColor = '#F6E05E';
    ctx.shadowBlur = 4;
    ctx.fillStyle = '#F6E05E';
    ctx.beginPath();
    ctx.arc(px, py, 2 * hoverScale, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.restore();
  }
}
