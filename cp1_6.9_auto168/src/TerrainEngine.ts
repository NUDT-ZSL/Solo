export type InkType = 'lava' | 'water' | 'plant' | 'stone' | 'scorched' | 'empty';

export interface Cell {
  type: InkType;
  energy: number;
  speedMultiplier: number;
  boostedUntil: number;
}

export interface InkStats {
  count: number;
  energy: number;
  evolutionRate: number;
}

export interface StatsData {
  lava: InkStats;
  water: InkStats;
  plant: InkStats;
}

export interface PendingStone {
  x: number;
  y: number;
  spawnAt: number;
  size: number;
}

export interface BurnArea {
  x: number;
  y: number;
  startTime: number;
  duration: number;
}

export interface GridSnapshot {
  width: number;
  height: number;
  cellSize: number;
  cells: InkType[][];
  energies: number[][];
  timestamp: number;
}

const INK_CONFIG: Record<string, {
  baseSpeed: number;
  baseEnergy: number;
  color: string;
}> = {
  lava: { baseSpeed: 2, baseEnergy: 100, color: '#ff4444' },
  water: { baseSpeed: 3, baseEnergy: 100, color: '#4488ff' },
  plant: { baseSpeed: 1, baseEnergy: 100, color: '#44ff66' },
  stone: { baseSpeed: 0, baseEnergy: 0, color: '#888899' },
  scorched: { baseSpeed: 0, baseEnergy: 0, color: '#3a2a1a' },
  empty: { baseSpeed: 0, baseEnergy: 0, color: 'transparent' }
};

export class TerrainEngine {
  public width: number;
  public height: number;
  public cellSize: number;
  public cols: number;
  public rows: number;
  public grid: Cell[][];
  public snapshots: GridSnapshot[] = [];
  public pendingStones: PendingStone[] = [];
  public burnAreas: BurnArea[] = [];
  public boundaryGlowPositions: Set<string> = new Set();
  public boundaryGlowTime = 0;
  private lastEvolveTime = 0;
  private statsCallback: ((stats: StatsData) => void) | null = null;
  private autoEcoMode = false;
  private lastAutoSpawn = 0;
  private lastSnapshotTime = 0;
  private prevStats: { lava: number; water: number; plant: number } = { lava: 0, water: 0, plant: 0 };
  public static getInkConfig(type: InkType) {
    return INK_CONFIG[type];
  }

  constructor(width: number, height: number, cellSize: number = 10) {
    this.width = width;
    this.height = height;
    this.cellSize = cellSize;
    this.cols = Math.floor(width / cellSize);
    this.rows = Math.floor(height / cellSize);
    this.grid = this.createEmptyGrid();
  }

  private createEmptyGrid(): Cell[][] {
    const grid: Cell[][] = [];
    for (let y = 0; y < this.rows; y++) {
      grid[y] = [];
      for (let x = 0; x < this.cols; x++) {
        grid[y][x] = {
          type: 'empty',
          energy: 0,
          speedMultiplier: 1,
          boostedUntil: 0
        };
      }
    }
    return grid;
  }

  public resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.cols = Math.floor(width / this.cellSize);
    this.rows = Math.floor(height / this.cellSize);
    const oldGrid = this.grid;
    const newGrid = this.createEmptyGrid();
    for (let y = 0; y < Math.min(oldGrid.length, this.rows); y++) {
      for (let x = 0; x < Math.min(oldGrid[y].length, this.cols); x++) {
        newGrid[y][x] = { ...oldGrid[y][x] };
      }
    }
    this.grid = newGrid;
  }

  public setStatsCallback(cb: (stats: StatsData) => void): void {
    this.statsCallback = cb;
  }

  public releaseInk(centerX: number, centerY: number, type: InkType, radius: number = 7): void {
    if (type !== 'lava' && type !== 'water' && type !== 'plant') return;
    const cx = Math.floor(centerX / this.cellSize);
    const cy = Math.floor(centerY / this.cellSize);
    const rCells = Math.floor(radius / this.cellSize);
    const r2 = rCells * rCells;

    for (let dy = -rCells; dy <= rCells; dy++) {
      for (let dx = -rCells; dx <= rCells; dx++) {
        if (dx * dx + dy * dy > r2) continue;
        const x = cx + dx;
        const y = cy + dy;
        if (x < 0 || x >= this.cols || y < 0 || y >= this.rows) continue;
        const cell = this.grid[y][x];
        if (cell.type === 'stone') continue;
        if (cell.type !== 'empty') {
          this.handleConflict(x, y, type);
        } else {
          this.setCell(x, y, type, INK_CONFIG[type].baseEnergy * (1 - (dx * dx + dy * dy) / (r2 * 2)));
        }
      }
    }
  }

  private setCell(x: number, y: number, type: InkType, energy: number): void {
    if (x < 0 || x >= this.cols || y < 0 || y >= this.rows) return;
    const cell = this.grid[y][x];
    cell.type = type;
    cell.energy = energy;
    cell.speedMultiplier = 1;
    cell.boostedUntil = 0;
  }

  private handleConflict(x: number, y: number, incomingType: InkType): void {
    const cell = this.grid[y][x];
    const existing = cell.type;

    if ((existing === 'water' && incomingType === 'lava') ||
        (existing === 'lava' && incomingType === 'water')) {
      cell.energy *= 0.9;
      this.pendingStones.push({
        x: x - 1,
        y: y - 1,
        spawnAt: performance.now() + 2000,
        size: 3
      });
      return;
    }

    if ((existing === 'lava' && incomingType === 'plant') ||
        (existing === 'plant' && incomingType === 'lava')) {
      this.burnAreas.push({
        x,
        y,
        startTime: performance.now(),
        duration: 1500
      });
      this.setCell(x, y, 'scorched', 0);
      return;
    }

    if ((existing === 'water' && incomingType === 'plant') ||
        (existing === 'plant' && incomingType === 'water')) {
      if (existing === 'plant') {
        cell.speedMultiplier = 2;
        cell.boostedUntil = performance.now() + 5000;
      } else {
        this.setCell(x, y, 'plant', INK_CONFIG.plant.baseEnergy);
        this.grid[y][x].speedMultiplier = 2;
        this.grid[y][x].boostedUntil = performance.now() + 5000;
      }
      return;
    }
  }

  public update(_dt: number, now: number): void {
    this.updateBoundaryGlow(now);
    this.processPendingStones(now);
    this.processBurnAreas(now);
    this.diffuseInk(now);
    this.updateSpeedBoosts(now);

    if (this.autoEcoMode && now - this.lastAutoSpawn > 2000) {
      this.autoSpawnInk();
      this.lastAutoSpawn = now;
    }

    if (now - this.lastSnapshotTime > 3000) {
      this.saveSnapshot();
      this.lastSnapshotTime = now;
    }

    this.updateStats(now);
  }

  private updateBoundaryGlow(now: number): void {
    this.boundaryGlowTime = now;
  }

  public getBoundaryGlowAlpha(): number {
    const phase = (this.boundaryGlowTime % 500) / 500;
    return 0.3 + Math.sin(phase * Math.PI * 2) * 0.3 + 0.3;
  }

  private processPendingStones(now: number): void {
    this.pendingStones = this.pendingStones.filter(ps => {
      if (now >= ps.spawnAt) {
        for (let dy = 0; dy < ps.size; dy++) {
          for (let dx = 0; dx < ps.size; dx++) {
            const x = ps.x + dx;
            const y = ps.y + dy;
            if (x >= 0 && x < this.cols && y >= 0 && y < this.rows) {
              this.setCell(x, y, 'stone', 0);
            }
          }
        }
        return false;
      }
      return true;
    });
  }

  private processBurnAreas(now: number): void {
    this.burnAreas = this.burnAreas.filter(ba => now - ba.startTime < ba.duration);
  }

  private updateSpeedBoosts(now: number): void {
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const cell = this.grid[y][x];
        if (cell.boostedUntil > 0 && now > cell.boostedUntil) {
          cell.speedMultiplier = 1;
          cell.boostedUntil = 0;
        }
      }
    }
  }

  private diffuseInk(_now: number): void {
    const toUpdate: { x: number; y: number; type: InkType; energy: number }[] = [];
    this.boundaryGlowPositions.clear();

    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const cell = this.grid[y][x];
        if (cell.energy <= 0 || cell.type === 'stone' || cell.type === 'scorched' || cell.type === 'empty') continue;
        if (cell.type !== 'lava' && cell.type !== 'water' && cell.type !== 'plant') continue;

        const config = INK_CONFIG[cell.type];
        const speed = config.baseSpeed * cell.speedMultiplier;
        const steps = Math.max(1, Math.floor(speed));

        for (let s = 0; s < steps; s++) {
          if (cell.energy < 0.05) break;
          cell.energy -= 0.1 * 0.5;

          const directions = [
            { dx: 1, dy: 0 },
            { dx: -1, dy: 0 },
            { dx: 0, dy: 1 },
            { dx: 0, dy: -1 }
          ];

          for (const dir of directions) {
            const nx = x + dir.dx;
            const ny = y + dir.dy;

            if (nx < 0 || nx >= this.cols || ny < 0 || ny >= this.rows) {
              this.boundaryGlowPositions.add(`${x},${y}`);
              continue;
            }

            const neighbor = this.grid[ny][nx];

            if (neighbor.type === 'stone') continue;

            if (neighbor.type === 'empty') {
              const newEnergy = cell.energy * 0.15;
              if (newEnergy > 0.1) {
                toUpdate.push({ x: nx, y: ny, type: cell.type, energy: newEnergy });
              }
            } else {
              this.handleConflict(nx, ny, cell.type);
            }
          }
        }
      }
    }

    for (const u of toUpdate) {
      if (this.grid[u.y][u.x].type === 'empty') {
        this.setCell(u.x, u.y, u.type, u.energy);
      }
    }
  }

  private autoSpawnInk(): void {
    const types: InkType[] = ['lava', 'water', 'plant'];
    let attempt = 0;
    while (attempt < 100) {
      const x = Math.floor(Math.random() * this.cols);
      const y = Math.floor(Math.random() * this.rows);
      if (this.isFarFromExistingInk(x, y, 5)) {
        const type = types[Math.floor(Math.random() * 3)];
        this.releaseInk(x * this.cellSize + this.cellSize / 2, y * this.cellSize + this.cellSize / 2, type, 5);
        return;
      }
      attempt++;
    }
  }

  private isFarFromExistingInk(cx: number, cy: number, dist: number): boolean {
    for (let dy = -dist; dy <= dist; dy++) {
      for (let dx = -dist; dx <= dist; dx++) {
        const x = cx + dx;
        const y = cy + dy;
        if (x < 0 || x >= this.cols || y < 0 || y >= this.rows) continue;
        if (this.grid[y][x].type !== 'empty') return false;
      }
    }
    return true;
  }

  public saveSnapshot(): void {
    const cells: InkType[][] = [];
    const energies: number[][] = [];
    for (let y = 0; y < this.rows; y++) {
      cells[y] = [];
      energies[y] = [];
      for (let x = 0; x < this.cols; x++) {
        cells[y][x] = this.grid[y][x].type;
        energies[y][x] = this.grid[y][x].energy;
      }
    }
    this.snapshots.push({
      width: this.width,
      height: this.height,
      cellSize: this.cellSize,
      cells,
      energies,
      timestamp: performance.now()
    });
    if (this.snapshots.length > 20) this.snapshots.shift();
  }

  public loadSnapshot(): boolean {
    if (this.snapshots.length === 0) return false;
    const snap = this.snapshots[this.snapshots.length - 1];
    for (let y = 0; y < Math.min(snap.cells.length, this.rows); y++) {
      for (let x = 0; x < Math.min(snap.cells[y].length, this.cols); x++) {
        this.grid[y][x] = {
          type: snap.cells[y][x],
          energy: snap.energies[y][x] || 0,
          speedMultiplier: 1,
          boostedUntil: 0
        };
      }
    }
    this.pendingStones = [];
    this.burnAreas = [];
    return true;
  }

  public reset(): void {
    this.grid = this.createEmptyGrid();
    this.snapshots = [];
    this.pendingStones = [];
    this.burnAreas = [];
    this.boundaryGlowPositions.clear();
  }

  public setAutoEcoMode(enabled: boolean): void {
    this.autoEcoMode = enabled;
  }

  public getAutoEcoMode(): boolean {
    return this.autoEcoMode;
  }

  public getTotalCellCount(): number {
    return this.cols * this.rows;
  }

  private updateStats(now: number): void {
    if (now - this.lastEvolveTime < 500 && this.statsCallback) {
      const stats = this.calculateStats(now);
      this.statsCallback(stats);
      return;
    }

    const stats = this.calculateStats(now);
    this.lastEvolveTime = now;
    this.prevStats = { lava: stats.lava.count, water: stats.water.count, plant: stats.plant.count };

    if (this.statsCallback) {
      this.statsCallback(stats);
    }
  }

  private calculateStats(now: number): StatsData {
    const data: StatsData = {
      lava: { count: 0, energy: 0, evolutionRate: 0 },
      water: { count: 0, energy: 0, evolutionRate: 0 },
      plant: { count: 0, energy: 0, evolutionRate: 0 }
    };

    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const cell = this.grid[y][x];
        if (cell.type === 'lava') {
          data.lava.count++;
          data.lava.energy += cell.energy;
        } else if (cell.type === 'water') {
          data.water.count++;
          data.water.energy += cell.energy;
        } else if (cell.type === 'plant') {
          data.plant.count++;
          data.plant.energy += cell.energy;
        }
      }
    }

    const rateScale = now > this.lastEvolveTime ? (1000 / (now - this.lastEvolveTime)) : 2;
    data.lava.evolutionRate = (data.lava.count - this.prevStats.lava) * rateScale;
    data.water.evolutionRate = (data.water.count - this.prevStats.water) * rateScale;
    data.plant.evolutionRate = (data.plant.count - this.prevStats.plant) * rateScale;

    return data;
  }
}
