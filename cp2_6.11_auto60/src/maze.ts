import type { AudioParams } from './audioProcessor';

export type FoodColor = 'red' | 'blue' | 'gold';
export type CellType = 0 | 1;

export interface FoodItem {
  gx: number;
  gy: number;
  color: FoodColor;
  pulse: number;
}

export interface WallState {
  gx: number;
  gy: number;
  transparentUntil: number;
  flashUntil: number;
}

export interface MazeState {
  grid: CellType[][];
  foods: FoodItem[];
  walls: Map<string, WallState>;
  totalFoodCollected: number;
}

export interface CollisionResult {
  hitWall: boolean;
  ateFood: FoodItem | null;
  wallGx: number;
  wallGy: number;
}

const GRID = 9;
const FOOD_TARGET = 12;

const CELL_KEY = (gx: number, gy: number): string => `${gx},${gy}`;

export class Maze {
  readonly size = GRID;
  readonly state: MazeState;

  constructor() {
    this.state = {
      grid: this.generateMaze(),
      foods: [],
      walls: new Map(),
      totalFoodCollected: 0,
    };
    this.spawnInitialFood();
  }

  reset(): void {
    this.state.grid = this.generateMaze();
    this.state.foods = [];
    this.state.walls.clear();
    this.state.totalFoodCollected = 0;
    this.spawnInitialFood();
  }

  isWall(gx: number, gy: number): boolean {
    if (gx < 0 || gy < 0 || gx >= GRID || gy >= GRID) return true;
    const cell = this.state.grid[gy][gx];
    if (cell !== 1) return false;
    const ws = this.state.walls.get(CELL_KEY(gx, gy));
    if (ws && performance.now() < ws.transparentUntil) return false;
    return true;
  }

  markWallHit(gx: number, gy: number): void {
    const key = CELL_KEY(gx, gy);
    const now = performance.now();
    const existing = this.state.walls.get(key) ?? { gx, gy, transparentUntil: 0, flashUntil: 0 };
    existing.flashUntil = now + 300;
    this.state.walls.set(key, existing);
  }

  update(dt: number, params: AudioParams, creatureGx: number, creatureGy: number): void {
    const now = performance.now();
    for (const f of this.state.foods) {
      f.pulse += dt * 3;
    }

    if (params.loudness > 80) {
      this.shatterWallsNear(creatureGx, creatureGy, now);
    }
  }

  checkCollision(prevGx: number, prevGy: number, nextGx: number, nextGy: number): CollisionResult {
    const result: CollisionResult = {
      hitWall: false,
      ateFood: null,
      wallGx: -1,
      wallGy: -1,
    };

    if (this.isWall(Math.round(nextGx), Math.round(nextGy))) {
      result.hitWall = true;
      result.wallGx = Math.round(nextGx);
      result.wallGy = Math.round(nextGy);
      return result;
    }

    const cx = Math.round(nextGx);
    const cy = Math.round(nextGy);
    const idx = this.state.foods.findIndex(f => f.gx === cx && f.gy === cy);
    if (idx >= 0) {
      result.ateFood = this.state.foods[idx];
      this.state.foods.splice(idx, 1);
      this.state.totalFoodCollected++;
      this.respawnFood();
    }

    return result;
  }

  getWallState(gx: number, gy: number): WallState | null {
    return this.state.walls.get(CELL_KEY(gx, gy)) ?? null;
  }

  private shatterWallsNear(cx: number, cy: number, now: number): void {
    const r = 1;
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const gx = Math.round(cx) + dx;
        const gy = Math.round(cy) + dy;
        if (gx < 0 || gy < 0 || gx >= GRID || gy >= GRID) continue;
        if (this.state.grid[gy][gx] !== 1) continue;
        const key = CELL_KEY(gx, gy);
        const ws = this.state.walls.get(key) ?? { gx, gy, transparentUntil: 0, flashUntil: 0 };
        if (now > ws.transparentUntil - 1800) {
          ws.transparentUntil = now + 2000;
          this.state.walls.set(key, ws);
        }
      }
    }
  }

  private respawnFood(): void {
    const open: Array<[number, number]> = [];
    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        if (this.state.grid[y][x] === 0) open.push([x, y]);
      }
    }
    const taken = new Set(this.state.foods.map(f => CELL_KEY(f.gx, f.gy)));
    const free = open.filter(([x, y]) => !taken.has(CELL_KEY(x, y)));
    if (free.length === 0) return;

    while (this.state.foods.length < FOOD_TARGET && free.length > 0) {
      const i = Math.floor(Math.random() * free.length);
      const [gx, gy] = free.splice(i, 1)[0];
      const colors: FoodColor[] = ['red', 'red', 'red', 'blue', 'blue', 'gold'];
      this.state.foods.push({
        gx,
        gy,
        color: colors[Math.floor(Math.random() * colors.length)],
        pulse: Math.random() * Math.PI * 2,
      });
    }
  }

  private spawnInitialFood(): void {
    this.respawnFood();
  }

  private generateMaze(): CellType[][] {
    const W = GRID;
    const H = GRID;
    const grid: CellType[][] = Array.from({ length: H }, () => Array<CellType>(W).fill(1));

    const cx = 1;
    const cy = 1;
    grid[cy][cx] = 0;

    const stack: Array<[number, number, Array<[number, number]>]> = [];
    const dirs: Array<[number, number]> = [[2, 0], [-2, 0], [0, 2], [0, -2]];
    const shuffled = (): Array<[number, number]> => {
      const arr = dirs.slice();
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    };

    stack.push([cx, cy, shuffled()]);

    while (stack.length > 0) {
      const top = stack[stack.length - 1];
      const [x, y, remaining] = top;
      if (remaining.length === 0) {
        stack.pop();
        continue;
      }
      const [dx, dy] = remaining.shift()!;
      const nx = x + dx;
      const ny = y + dy;
      if (nx <= 0 || ny <= 0 || nx >= W - 1 || ny >= H - 1 || grid[ny][nx] === 0) {
        continue;
      }
      grid[y + dy / 2][x + dx / 2] = 0;
      grid[ny][nx] = 0;
      stack.push([nx, ny, shuffled()]);
    }

    for (let i = 0; i < 10; i++) {
      const rx = 1 + Math.floor(Math.random() * (W - 2));
      const ry = 1 + Math.floor(Math.random() * (H - 2));
      if (grid[ry][rx] === 1) grid[ry][rx] = 0;
    }

    return grid;
  }
}
