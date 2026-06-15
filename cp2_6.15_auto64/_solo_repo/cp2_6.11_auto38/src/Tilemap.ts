export const GRID_SIZE = 10;
export const TILE_SIZE = 48;
export const WALL_RATIO = 0.3;
export const RUNE_COUNT = 6;

export enum TileType {
  WALL = 'wall',
  PASSAGE = 'passage',
  RUNE = 'rune',
  PORTAL = 'portal'
}

export interface Position {
  x: number;
  y: number;
}

export interface Rune {
  position: Position;
  activated: boolean;
  startTime: number;
  progress: number;
}

export interface CollisionResult {
  collided: boolean;
  onRune: boolean;
  runeIndex: number;
  onPortal: boolean;
}

export class Tilemap {
  private grid: TileType[][] = [];
  private runes: Rune[] = [];
  private portalPosition: Position | null = null;
  private wallCracks: Map<string, { x: number; y: number; angle: number; length: number }[]> = new Map();

  constructor() {
    this.generateMaze();
  }

  private generateMaze(): void {
    this.grid = [];
    this.runes = [];
    this.portalPosition = null;
    this.wallCracks.clear();

    for (let y = 0; y < GRID_SIZE; y++) {
      this.grid[y] = [];
      for (let x = 0; x < GRID_SIZE; x++) {
        this.grid[y][x] = TileType.PASSAGE;
      }
    }

    const totalCells = GRID_SIZE * GRID_SIZE;
    const wallCount = Math.floor(totalCells * WALL_RATIO);

    const allPositions: Position[] = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        allPositions.push({ x, y });
      }
    }

    this.shuffleArray(allPositions);

    for (let i = 0; i < wallCount && i < allPositions.length; i++) {
      const pos = allPositions[i];
      this.grid[pos.y][pos.x] = TileType.WALL;
    }

    const passages: Position[] = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        if (this.grid[y][x] === TileType.PASSAGE) {
          passages.push({ x, y });
        }
      }
    }

    this.shuffleArray(passages);

    for (let i = 0; i < RUNE_COUNT && i < passages.length; i++) {
      const pos = passages[i];
      this.runes.push({
        position: pos,
        activated: false,
        startTime: 0,
        progress: 0
      });
    }

    const usedPositions = new Set(this.runes.map(r => `${r.position.x},${r.position.y}`));
    const centerX = Math.floor(GRID_SIZE / 2);
    const centerY = Math.floor(GRID_SIZE / 2);

    const searchOrder: Position[] = [{ x: centerX, y: centerY }];
    for (let d = 1; d < GRID_SIZE; d++) {
      for (let dx = -d; dx <= d; dx++) {
        for (let dy = -d; dy <= d; dy++) {
          if (Math.abs(dx) === d || Math.abs(dy) === d) {
            const nx = centerX + dx;
            const ny = centerY + dy;
            if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
              searchOrder.push({ x: nx, y: ny });
            }
          }
        }
      }
    }

    for (const pos of searchOrder) {
      const key = `${pos.x},${pos.y}`;
      if (this.grid[pos.y][pos.x] === TileType.PASSAGE && !usedPositions.has(key)) {
        this.portalPosition = { x: pos.x, y: pos.y };
        break;
      }
    }

    if (!this.portalPosition) {
      for (const pos of searchOrder) {
        if (!usedPositions.has(`${pos.x},${pos.y}`)) {
          this.grid[pos.y][pos.x] = TileType.PASSAGE;
          this.portalPosition = { x: pos.x, y: pos.y };
          break;
        }
      }
    }

    this.generateWallCracks();
  }

  private shuffleArray<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  private generateWallCracks(): void {
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        if (this.grid[y][x] === TileType.WALL) {
          const key = `${x},${y}`;
          const crackCount = Math.floor(Math.random() * 3) + 1;
          const cracks = [];
          for (let i = 0; i < crackCount; i++) {
            cracks.push({
              x: Math.random() * TILE_SIZE,
              y: Math.random() * TILE_SIZE,
              angle: Math.random() * Math.PI * 2,
              length: 8 + Math.random() * 20
            });
          }
          this.wallCracks.set(key, cracks);
        }
      }
    }
  }

  private getNeighbors(x: number, y: number): Position[] {
    const neighbors: Position[] = [];
    const directions = [
      { dx: 0, dy: -1 },
      { dx: 1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 }
    ];

    for (const dir of directions) {
      const nx = x + dir.dx;
      const ny = y + dir.dy;
      if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
        neighbors.push({ x: nx, y: ny });
      }
    }
    return neighbors;
  }

  public getTile(x: number, y: number): TileType {
    if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) {
      return TileType.WALL;
    }
    return this.grid[y][x];
  }

  public getRunes(): Rune[] {
    return this.runes;
  }

  public getRuneAt(x: number, y: number): number {
    return this.runes.findIndex(r => r.position.x === x && r.position.y === y);
  }

  public getPortalPosition(): Position | null {
    return this.portalPosition;
  }

  public getWallCracks(x: number, y: number): { x: number; y: number; angle: number; length: number }[] {
    return this.wallCracks.get(`${x},${y}`) || [];
  }

  public checkCollision(pos: Position): CollisionResult {
    const tile = this.getTile(pos.x, pos.y);
    const runeIndex = this.getRuneAt(pos.x, pos.y);
    const onRune = runeIndex >= 0 && !this.runes[runeIndex].activated;
    const onPortal = this.portalPosition !== null && 
                     pos.x === this.portalPosition.x && 
                     pos.y === this.portalPosition.y &&
                     this.allRunesActivated();

    return {
      collided: tile === TileType.WALL,
      onRune,
      runeIndex,
      onPortal
    };
  }

  public startRuneRubbing(runeIndex: number, currentTime: number): void {
    if (runeIndex < 0 || runeIndex >= this.runes.length) return;
    const rune = this.runes[runeIndex];
    if (rune.activated) return;
    rune.startTime = currentTime;
    rune.progress = 0;
  }

  public updateRuneProgress(runeIndex: number, currentTime: number): { completed: boolean; progress: number } {
    if (runeIndex < 0 || runeIndex >= this.runes.length) return { completed: false, progress: 0 };
    const rune = this.runes[runeIndex];
    if (rune.activated) return { completed: true, progress: 1000 };
    if (rune.startTime === 0) return { completed: false, progress: 0 };

    const elapsed = currentTime - rune.startTime;
    rune.progress = Math.min(elapsed, 1000);

    if (elapsed >= 1000) {
      rune.activated = true;
      rune.progress = 1000;
      return { completed: true, progress: 1000 };
    }
    return { completed: false, progress: rune.progress };
  }

  public resetRuneProgress(runeIndex: number): void {
    if (runeIndex >= 0 && runeIndex < this.runes.length) {
      if (!this.runes[runeIndex].activated) {
        this.runes[runeIndex].startTime = 0;
        this.runes[runeIndex].progress = 0;
      }
    }
  }

  public allRunesActivated(): boolean {
    return this.runes.every(r => r.activated);
  }

  public getActivatedRuneCount(): number {
    return this.runes.filter(r => r.activated).length;
  }

  public regenerate(): void {
    this.generateMaze();
  }
}
