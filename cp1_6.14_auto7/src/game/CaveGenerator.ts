import { Cell, CellType, Grid, GRID_SIZE, MineralType } from '../types/gameTypes';

class PerlinNoise {
  private permutation: number[];

  constructor(seed: number = Math.random() * 10000) {
    this.permutation = this.generatePermutation(seed);
  }

  private generatePermutation(seed: number): number[] {
    const p: number[] = [];
    for (let i = 0; i < 256; i++) p[i] = i;
    let s = seed;
    for (let i = 255; i > 0; i--) {
      s = (s * 16807) % 2147483647;
      const j = s % (i + 1);
      [p[i], p[j]] = [p[j], p[i]];
    }
    return [...p, ...p];
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(a: number, b: number, t: number): number {
    return a + t * (b - a);
  }

  private grad(hash: number, x: number, y: number): number {
    const h = hash & 3;
    const u = h < 2 ? x : y;
    const v = h < 2 ? y : x;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  noise(x: number, y: number, scale: number = 1): number {
    const sx = x * scale;
    const sy = y * scale;
    const x0 = Math.floor(sx) & 255;
    const y0 = Math.floor(sy) & 255;
    const xf = sx - Math.floor(sx);
    const yf = sy - Math.floor(sy);
    const u = this.fade(xf);
    const v = this.fade(yf);
    const aa = this.permutation[this.permutation[x0] + y0];
    const ab = this.permutation[this.permutation[x0] + y0 + 1];
    const ba = this.permutation[this.permutation[x0 + 1] + y0];
    const bb = this.permutation[this.permutation[x0 + 1] + y0 + 1];
    const x1 = this.lerp(this.grad(aa, xf, yf), this.grad(ba, xf - 1, yf), u);
    const x2 = this.lerp(this.grad(ab, xf, yf - 1), this.grad(bb, xf - 1, yf - 1), u);
    return (this.lerp(x1, x2, v) + 1) / 2;
  }
}

export class CaveGenerator {
  private perlin: PerlinNoise;

  constructor(seed?: number) {
    this.perlin = new PerlinNoise(seed);
  }

  generateLevel(): { grid: Grid; startX: number; startY: number; exitX: number; exitY: number } {
    let attempts = 0;
    while (attempts < 50) {
      attempts++;
      const grid = this.initializeGrid();
      this.applyPerlinCaves(grid);
      this.generateWallClusters(grid, 5);
      this.generateMinerals(grid, 3);
      this.generateReefs(grid, GRID_SIZE * GRID_SIZE * 0.04);
      this.setStartAndExit(grid);

      if (this.verifyConnectivity(grid)) {
        return {
          grid,
          startX: 1,
          startY: 1,
          exitX: GRID_SIZE - 2,
          exitY: GRID_SIZE - 2
        };
      }
    }
    const grid = this.createSimpleCorridorMap();
    return { grid, startX: 1, startY: 1, exitX: GRID_SIZE - 2, exitY: GRID_SIZE - 2 };
  }

  private initializeGrid(): Grid {
    const grid: Grid = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      grid[y] = [];
      for (let x = 0; x < GRID_SIZE; x++) {
        grid[y][x] = {
          type: CellType.WATER,
          noiseVal: 0
        };
      }
    }
    for (let y = 0; y < GRID_SIZE; y++) {
      grid[y][0].type = CellType.WALL;
      grid[y][GRID_SIZE - 1].type = CellType.WALL;
    }
    for (let x = 0; x < GRID_SIZE; x++) {
      grid[0][x].type = CellType.WALL;
      grid[GRID_SIZE - 1][x].type = CellType.WALL;
    }
    return grid;
  }

  private applyPerlinCaves(grid: Grid): void {
    for (let y = 1; y < GRID_SIZE - 1; y++) {
      for (let x = 1; x < GRID_SIZE - 1; x++) {
        const n = this.perlin.noise(x, y, 0.18);
        grid[y][x].noiseVal = n;
        if (n < 0.38) {
          grid[y][x].type = CellType.WALL;
        }
      }
    }
  }

  private generateWallClusters(grid: Grid, minClusters: number): void {
    let clusterCount = 0;
    for (let y = 2; y < GRID_SIZE - 2; y++) {
      for (let x = 2; x < GRID_SIZE - 2; x++) {
        if (grid[y][x].type === CellType.WALL) {
          if (this.isClusterSeed(grid, x, y)) {
            clusterCount++;
          }
        }
      }
    }

    let attempts = 0;
    while (clusterCount < minClusters && attempts < 200) {
      attempts++;
      const cx = 3 + Math.floor(Math.random() * (GRID_SIZE - 6));
      const cy = 3 + Math.floor(Math.random() * (GRID_SIZE - 6));
      const radius = 2 + Math.floor(Math.random() * 3);
      let added = false;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx > 2 && nx < GRID_SIZE - 3 && ny > 2 && ny < GRID_SIZE - 3) {
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist <= radius && Math.random() > 0.2) {
              if (grid[ny][nx].type === CellType.WATER) {
                grid[ny][nx].type = CellType.WALL;
                grid[ny][nx].noiseVal = 0.1;
                added = true;
              }
            }
          }
        }
      }
      if (added) clusterCount++;
    }
  }

  private isClusterSeed(grid: Grid, x: number, y: number): boolean {
    if (grid[y - 1][x].type === CellType.WATER || grid[y][x - 1].type === CellType.WATER) {
      return true;
    }
    return false;
  }

  private generateMinerals(grid: Grid, count: number): void {
    const types = [MineralType.SPHALERITE, MineralType.KYANITE, MineralType.EMERALD];
    const placed: MineralType[] = [];

    for (let i = 0; i < count; i++) {
      placed.push(types[i % types.length]);
    }

    for (let i = count - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [placed[i], placed[j]] = [placed[j], placed[i]];
    }

    let index = 0;
    let attempts = 0;
    while (index < placed.length && attempts < 500) {
      attempts++;
      const x = 3 + Math.floor(Math.random() * (GRID_SIZE - 6));
      const y = 3 + Math.floor(Math.random() * (GRID_SIZE - 6));
      if (grid[y][x].type === CellType.WATER) {
        let nearWall = false;
        for (let dy = -1; dy <= 1 && !nearWall; dy++) {
          for (let dx = -1; dx <= 1 && !nearWall; dx++) {
            if (grid[y + dy]?.[x + dx]?.type === CellType.WALL) {
              nearWall = true;
            }
          }
        }
        if (nearWall) {
          grid[y][x].type = CellType.MINERAL;
          grid[y][x].mineralType = placed[index];
          index++;
        }
      }
    }
  }

  private generateReefs(grid: Grid, count: number): void {
    let placed = 0;
    let attempts = 0;
    while (placed < count && attempts < count * 10) {
      attempts++;
      const x = 2 + Math.floor(Math.random() * (GRID_SIZE - 4));
      const y = 2 + Math.floor(Math.random() * (GRID_SIZE - 4));
      if (grid[y][x].type === CellType.WATER) {
        grid[y][x].type = CellType.REEF;
        placed++;
      }
    }
  }

  private setStartAndExit(grid: Grid): void {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (grid[1 + dy]?.[1 + dx]) {
          grid[1 + dy][1 + dx].type = CellType.WATER;
        }
      }
    }
    grid[1][1].type = CellType.START;

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (grid[GRID_SIZE - 2 + dy]?.[GRID_SIZE - 2 + dx]) {
          grid[GRID_SIZE - 2 + dy][GRID_SIZE - 2 + dx].type = CellType.WATER;
        }
      }
    }
    grid[GRID_SIZE - 2][GRID_SIZE - 2].type = CellType.EXIT;
  }

  private verifyConnectivity(grid: Grid): boolean {
    const visited: boolean[][] = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      visited[y] = new Array(GRID_SIZE).fill(false);
    }

    const queue: [number, number][] = [[1, 1]];
    visited[1][1] = true;
    const targetX = GRID_SIZE - 2;
    const targetY = GRID_SIZE - 2;

    while (queue.length > 0) {
      const [x, y] = queue.shift()!;
      if (x === targetX && y === targetY) return true;

      const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      for (const [dx, dy] of dirs) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE &&
            !visited[ny][nx] &&
            grid[ny][nx].type !== CellType.WALL) {
          visited[ny][nx] = true;
          queue.push([nx, ny]);
        }
      }
    }
    return false;
  }

  private createSimpleCorridorMap(): Grid {
    const grid = this.initializeGrid();
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        grid[y][x].noiseVal = 0.5;
      }
    }
    for (let x = 2; x < GRID_SIZE - 2; x++) {
      grid[Math.floor(GRID_SIZE / 2)][x].type = CellType.WATER;
      grid[Math.floor(GRID_SIZE / 2) - 1][x].type = CellType.WATER;
      grid[Math.floor(GRID_SIZE / 2) + 1][x].type = CellType.WATER;
    }
    for (let y = 1; y < GRID_SIZE - 1; y++) {
      if (y % 4 === 0) {
        for (let x = 2; x < GRID_SIZE - 2; x++) {
          if (x % 2 === 0) grid[y][x].type = CellType.WALL;
        }
      }
    }
    for (let y = 1; y < GRID_SIZE - 1; y++) {
      grid[y][1].type = CellType.WATER;
      grid[y][2].type = CellType.WATER;
      grid[y][GRID_SIZE - 2].type = CellType.WATER;
      grid[y][GRID_SIZE - 3].type = CellType.WATER;
    }
    grid[1][1].type = CellType.START;
    grid[GRID_SIZE - 2][GRID_SIZE - 2].type = CellType.EXIT;
    this.generateMinerals(grid, 3);
    this.generateWallClusters(grid, 5);
    return grid;
  }
}
