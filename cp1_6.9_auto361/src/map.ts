export const GRID_SIZE = 40;
export const CELL_SIZE = 2;
export const WALL_THICKNESS = 2;
export const PASSAGE_WIDTH = 2;
export const MAZE_COLS = 20;
export const MAZE_ROWS = 20;
export const TOTAL_COLS = MAZE_COLS * CELL_SIZE;
export const TOTAL_ROWS = MAZE_ROWS * CELL_SIZE;

export type CellType = 0 | 1;

export interface Chest {
  gridX: number;
  gridY: number;
  collected: boolean;
  flickerPhase: number;
}

export interface LitCell {
  x: number;
  y: number;
  timeLeft: number;
}

export class MazeMap {
  public grid: CellType[][];
  public chests: Chest[];
  public slimeSpawns: { x: number; y: number }[];
  public litCells: Map<string, LitCell>;
  public spawnX: number = 0;
  public spawnY: number = 0;

  constructor() {
    this.grid = [];
    this.chests = [];
    this.slimeSpawns = [];
    this.litCells = new Map();
    this.generate();
  }

  private generate(): void {
    for (let y = 0; y < TOTAL_ROWS; y++) {
      this.grid[y] = [];
      for (let x = 0; x < TOTAL_COLS; x++) {
        this.grid[y][x] = 1;
      }
    }

    const visited: boolean[][] = [];
    for (let y = 0; y < MAZE_ROWS; y++) {
      visited[y] = [];
      for (let x = 0; x < MAZE_COLS; x++) {
        visited[y][x] = false;
      }
    }

    this.carvePassages(0, 0, visited);

    this.spawnX = 1;
    this.spawnY = 1;
    this.carveCell(this.spawnX, this.spawnY);

    this.placeChests();
    this.placeSlimeSpawns();
  }

  private carvePassages(cx: number, cy: number, visited: boolean[][]): void {
    visited[cy][cx] = true;
    this.carveCell(cx, cy);

    const directions = this.shuffle([
      { dx: 0, dy: -1 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
      { dx: 1, dy: 0 }
    ]);

    for (const dir of directions) {
      const nx = cx + dir.dx;
      const ny = cy + dir.dy;

      if (nx >= 0 && nx < MAZE_COLS && ny >= 0 && ny < MAZE_ROWS && !visited[ny][nx]) {
        const wallX = cx * CELL_SIZE + (dir.dx > 0 ? CELL_SIZE - 1 + dir.dx : dir.dx < 0 ? 0 : 0);
        const wallY = cy * CELL_SIZE + (dir.dy > 0 ? CELL_SIZE - 1 + dir.dy : dir.dy < 0 ? 0 : 0);

        for (let i = 0; i < CELL_SIZE; i++) {
          if (dir.dx !== 0) {
            const wx = cx * CELL_SIZE + (dir.dx > 0 ? CELL_SIZE - 1 + dir.dx : dir.dx < 0 ? 0 : 0);
            const wy = cy * CELL_SIZE + i;
            if (wy >= 0 && wy < TOTAL_ROWS && wx >= 0 && wx < TOTAL_COLS) {
              this.grid[wy][wx] = 0;
            }
          }
          if (dir.dy !== 0) {
            const wx = cx * CELL_SIZE + i;
            const wy = cy * CELL_SIZE + (dir.dy > 0 ? CELL_SIZE - 1 + dir.dy : dir.dy < 0 ? 0 : 0);
            if (wy >= 0 && wy < TOTAL_ROWS && wx >= 0 && wx < TOTAL_COLS) {
              this.grid[wy][wx] = 0;
            }
          }
        }

        this.carvePassages(nx, ny, visited);
      }
    }
  }

  private carveCell(mazeX: number, mazeY: number): void {
    const startX = mazeX * CELL_SIZE;
    const startY = mazeY * CELL_SIZE;
    for (let dy = 0; dy < CELL_SIZE; dy++) {
      for (let dx = 0; dx < CELL_SIZE; dx++) {
        const x = startX + dx;
        const y = startY + dy;
        if (x >= 0 && x < TOTAL_COLS && y >= 0 && y < TOTAL_ROWS) {
          this.grid[y][x] = 0;
        }
      }
    }
  }

  private placeChests(): void {
    const passageCells: { x: number; y: number }[] = [];
    for (let y = 2; y < TOTAL_ROWS - 2; y++) {
      for (let x = 2; x < TOTAL_COLS - 2; x++) {
        if (this.grid[y][x] === 0) {
          const distToSpawn = Math.abs(x - this.spawnX) + Math.abs(y - this.spawnY);
          if (distToSpawn > 10) {
            passageCells.push({ x, y });
          }
        }
      }
    }

    this.shuffleInPlace(passageCells);
    const numChests = 2 + Math.floor(Math.random() * 2);
    let placed = 0;

    for (const cell of passageCells) {
      if (placed >= numChests) break;
      let tooClose = false;
      for (const chest of this.chests) {
        const dist = Math.abs(chest.gridX - cell.x) + Math.abs(chest.gridY - cell.y);
        if (dist < 8) {
          tooClose = true;
          break;
        }
      }
      if (!tooClose) {
        this.chests.push({
          gridX: cell.x,
          gridY: cell.y,
          collected: false,
          flickerPhase: Math.random() * Math.PI * 2
        });
        placed++;
      }
    }
  }

  private placeSlimeSpawns(): void {
    const passageCells: { x: number; y: number }[] = [];
    for (let y = 2; y < TOTAL_ROWS - 2; y++) {
      for (let x = 2; x < TOTAL_COLS - 2; x++) {
        if (this.grid[y][x] === 0) {
          const distToSpawn = Math.abs(x - this.spawnX) + Math.abs(y - this.spawnY);
          if (distToSpawn > 15) {
            passageCells.push({ x, y });
          }
        }
      }
    }

    this.shuffleInPlace(passageCells);
    const numSlimes = 4 + Math.floor(Math.random() * 2);

    for (let i = 0; i < Math.min(numSlimes, passageCells.length); i++) {
      let tooClose = false;
      for (const spawn of this.slimeSpawns) {
        const dist = Math.abs(spawn.x - passageCells[i].x) + Math.abs(spawn.y - passageCells[i].y);
        if (dist < 6) {
          tooClose = true;
          break;
        }
      }
      if (!tooClose) {
        this.slimeSpawns.push({ ...passageCells[i] });
      }
    }
  }

  public isWall(x: number, y: number): boolean {
    if (x < 0 || x >= TOTAL_COLS || y < 0 || y >= TOTAL_ROWS) return true;
    return this.grid[y][x] === 1;
  }

  public isPassage(x: number, y: number): boolean {
    return !this.isWall(x, y);
  }

  public addLitCell(x: number, y: number, duration: number = 1.5): void {
    const key = `${x},${y}`;
    this.litCells.set(key, { x, y, timeLeft: duration });
  }

  public isCellLit(x: number, y: number): boolean {
    const key = `${x},${y}`;
    return this.litCells.has(key);
  }

  public update(dt: number): void {
    const toRemove: string[] = [];
    for (const [key, cell] of this.litCells) {
      cell.timeLeft -= dt;
      if (cell.timeLeft <= 0) {
        toRemove.push(key);
      }
    }
    for (const key of toRemove) {
      this.litCells.delete(key);
    }

    for (const chest of this.chests) {
      chest.flickerPhase += dt * 10;
    }
  }

  private shuffle<T>(arr: T[]): T[] {
    const result = [...arr];
    this.shuffleInPlace(result);
    return result;
  }

  private shuffleInPlace<T>(arr: T[]): void {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }
}
