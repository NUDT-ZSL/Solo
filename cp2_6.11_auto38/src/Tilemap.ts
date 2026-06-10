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
        this.grid[y][x] = TileType.WALL;
      }
    }

    const totalCells = GRID_SIZE * GRID_SIZE;
    const wallCount = Math.floor(totalCells * WALL_RATIO);
    let passageCount = totalCells - wallCount;

    const startX = Math.floor(Math.random() * GRID_SIZE);
    const startY = Math.floor(Math.random() * GRID_SIZE);
    this.grid[startY][startX] = TileType.PASSAGE;
    passageCount--;

    const frontier: Position[] = this.getNeighbors(startX, startY)
      .filter(p => this.grid[p.y][p.x] === TileType.WALL);

    while (passageCount > 0 && frontier.length > 0) {
      const idx = Math.floor(Math.random() * frontier.length);
      const current = frontier.splice(idx, 1)[0];

      const passageNeighbors = this.getNeighbors(current.x, current.y)
        .filter(p => this.grid[p.y][p.x] === TileType.PASSAGE);

      if (passageNeighbors.length >= 1) {
        this.grid[current.y][current.x] = TileType.PASSAGE;
        passageCount--;

        const newFrontier = this.getNeighbors(current.x, current.y)
          .filter(p => this.grid[p.y][p.x] === TileType.WALL && 
            !frontier.some(f => f.x === p.x && f.y === p.y));
        frontier.push(...newFrontier);
      }
    }

    while (passageCount > 0) {
      for (let y = 0; y < GRID_SIZE && passageCount > 0; y++) {
        for (let x = 0; x < GRID_SIZE && passageCount > 0; x++) {
          if (this.grid[y][x] === TileType.WALL) {
            this.grid[y][x] = TileType.PASSAGE;
            passageCount--;
          }
        }
      }
    }

    const passages: Position[] = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        if (this.grid[y][x] === TileType.PASSAGE) {
          passages.push({ x, y });
        }
      }
    }

    for (let i = 0; i < RUNE_COUNT && passages.length > 0; i++) {
      const idx = Math.floor(Math.random() * passages.length);
      const pos = passages.splice(idx, 1)[0];
      this.runes.push({
        position: pos,
        activated: false,
        progress: 0
      });
    }

    this.portalPosition = { x: Math.floor(GRID_SIZE / 2), y: Math.floor(GRID_SIZE / 2) };
    if (this.grid[this.portalPosition.y][this.portalPosition.x] === TileType.WALL) {
      this.grid[this.portalPosition.y][this.portalPosition.x] = TileType.PASSAGE;
    }

    this.generateWallCracks();
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

  public updateRuneProgress(runeIndex: number, deltaTime: number): boolean {
    if (runeIndex < 0 || runeIndex >= this.runes.length) return false;
    const rune = this.runes[runeIndex];
    if (rune.activated) return false;

    rune.progress += deltaTime;
    if (rune.progress >= 1000) {
      rune.activated = true;
      rune.progress = 1000;
      return true;
    }
    return false;
  }

  public resetRuneProgress(runeIndex: number): void {
    if (runeIndex >= 0 && runeIndex < this.runes.length) {
      if (!this.runes[runeIndex].activated) {
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
