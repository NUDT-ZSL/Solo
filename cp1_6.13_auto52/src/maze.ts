export const CELL_SIZE = 40;
export const MAZE_WIDTH = 15;
export const MAZE_HEIGHT = 15;

export type Cell = 0 | 1;

export class Maze {
  public width: number;
  public height: number;
  public grid: Cell[][];

  constructor(width: number = MAZE_WIDTH, height: number = MAZE_HEIGHT) {
    this.width = width;
    this.height = height;
    this.grid = [];
    this.generate();
  }

  private generate(): void {
    this.grid = [];
    for (let y = 0; y < this.height; y++) {
      this.grid[y] = [];
      for (let x = 0; x < this.width; x++) {
        this.grid[y][x] = 1;
      }
    }

    const startX = 1;
    const startY = 1;
    this.grid[startY][startX] = 0;
    this.carve(startX, startY);
  }

  private carve(x: number, y: number): void {
    const directions: [number, number][] = [
      [0, -2],
      [2, 0],
      [0, 2],
      [-2, 0]
    ];

    for (let i = directions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [directions[i], directions[j]] = [directions[j], directions[i]];
    }

    for (const [dx, dy] of directions) {
      const nx = x + dx;
      const ny = y + dy;

      if (
        nx > 0 && nx < this.width - 1 &&
        ny > 0 && ny < this.height - 1 &&
        this.grid[ny][nx] === 1
      ) {
        this.grid[y + dy / 2][x + dx / 2] = 0;
        this.grid[ny][nx] = 0;
        this.carve(nx, ny);
      }
    }
  }

  public isWall(gx: number, gy: number): boolean {
    if (gx < 0 || gx >= this.width || gy < 0 || gy >= this.height) {
      return true;
    }
    return this.grid[gy][gx] === 1;
  }

  public isWallPixel(px: number, py: number): boolean {
    const gx = Math.floor(px / CELL_SIZE);
    const gy = Math.floor(py / CELL_SIZE);
    return this.isWall(gx, gy);
  }

  public getRandomFloor(): { x: number; y: number } {
    const floors: { x: number; y: number }[] = [];
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.grid[y][x] === 0) {
          floors.push({ x, y });
        }
      }
    }
    return floors[Math.floor(Math.random() * floors.length)];
  }

  public getFloors(): { x: number; y: number }[] {
    const floors: { x: number; y: number }[] = [];
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.grid[y][x] === 0) {
          floors.push({ x, y });
        }
      }
    }
    return floors;
  }
}
