export interface Rune {
  x: number;
  y: number;
  activated: boolean;
  linkedDoorIndex: number;
}

export interface HiddenDoor {
  x: number;
  y: number;
  width: number;
  height: number;
  revealed: boolean;
  revealProgress: number;
}

export interface Portal {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  used: boolean;
}

export interface Altar {
  x: number;
  y: number;
  radius: number;
}

const TILE_SIZE = 40;
const MAP_COLS = 40;
const MAP_ROWS = 30;

export class GameMap {
  public readonly width: number = MAP_COLS * TILE_SIZE;
  public readonly height: number = MAP_ROWS * TILE_SIZE;
  public readonly tileSize: number = TILE_SIZE;
  private tiles: number[][];
  public runes: Rune[] = [];
  public hiddenDoors: HiddenDoor[] = [];
  public portals: Portal[] = [];
  public altar: Altar;
  public startPosition: { x: number; y: number };
  public brickPatternCache: Map<string, boolean> = new Map();

  constructor() {
    this.tiles = this.generateMap();
    this.startPosition = { x: 100, y: 100 };
    this.altar = { x: this.width - 100, y: 100, radius: 50 };
    this.initializeRunesAndDoors();
    this.initializePortals();
    this.generateBrickPattern();
  }

  private generateMap(): number[][] {
    const map: number[][] = [];
    for (let r = 0; r < MAP_ROWS; r++) {
      map[r] = [];
      for (let c = 0; c < MAP_COLS; c++) {
        if (r === 0 || r === MAP_ROWS - 1 || c === 0 || c === MAP_COLS - 1) {
          map[r][c] = 1;
        } else {
          map[r][c] = 0;
        }
      }
    }

    this.addWallRect(map, 8, 0, 1, 8);
    this.addWallRect(map, 8, 12, 1, 8);
    this.addWallRect(map, 18, 5, 1, 18);
    this.addWallRect(map, 18, 22, 15, 1);
    this.addWallRect(map, 28, 10, 1, 12);
    this.addWallRect(map, 5, 20, 12, 1);
    this.addWallRect(map, 25, 5, 1, 12);
    this.addWallRect(map, 12, 5, 6, 1);
    this.addWallRect(map, 32, 15, 6, 1);
    this.addWallRect(map, 2, 10, 1, 4);
    this.addWallRect(map, 35, 3, 1, 5);
    this.addWallRect(map, 8, 10, 5, 1);
    this.addWallRect(map, 22, 15, 1, 6);
    this.addPillar(map, 4, 4);
    this.addPillar(map, 4, 25);
    this.addPillar(map, 14, 14);
    this.addPillar(map, 24, 25);
    this.addPillar(map, 34, 20);
    this.addPillar(map, 36, 8);
    this.addWallRect(map, 12, 25, 1, 3);
    this.addWallRect(map, 15, 25, 1, 3);
    this.addWallRect(map, 12, 27, 4, 1);

    return map;
  }

  private addWallRect(map: number[][], c: number, r: number, w: number, h: number): void {
    for (let dr = 0; dr < h; dr++) {
      for (let dc = 0; dc < w; dc++) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < MAP_ROWS && nc >= 0 && nc < MAP_COLS) {
          map[nr][nc] = 1;
        }
      }
    }
  }

  private addPillar(map: number[][], c: number, r: number): void {
    this.addWallRect(map, c, r, 2, 2);
  }

  private initializeRunesAndDoors(): void {
    const runePositions = [
      { x: 9 * TILE_SIZE + TILE_SIZE / 2, y: 7 * TILE_SIZE + TILE_SIZE / 2, door: 0 },
      { x: 4 * TILE_SIZE + TILE_SIZE / 2, y: 20 * TILE_SIZE + TILE_SIZE / 2, door: 1 },
      { x: 17 * TILE_SIZE + TILE_SIZE / 2, y: 4 * TILE_SIZE + TILE_SIZE / 2, door: 2 },
      { x: 17 * TILE_SIZE + TILE_SIZE / 2, y: 22 * TILE_SIZE + TILE_SIZE / 2, door: 3 },
      { x: 27 * TILE_SIZE + TILE_SIZE / 2, y: 22 * TILE_SIZE + TILE_SIZE / 2, door: 4 },
      { x: 33 * TILE_SIZE + TILE_SIZE / 2, y: 14 * TILE_SIZE + TILE_SIZE / 2, door: 5 },
      { x: 11 * TILE_SIZE + TILE_SIZE / 2, y: 24 * TILE_SIZE + TILE_SIZE / 2, door: 6 },
      { x: 37 * TILE_SIZE + TILE_SIZE / 2, y: 6 * TILE_SIZE + TILE_SIZE / 2, door: 7 },
    ];

    runePositions.forEach(pos => {
      this.runes.push({
        x: pos.x,
        y: pos.y,
        activated: false,
        linkedDoorIndex: pos.door
      });
    });

    this.hiddenDoors = [
      { x: 8 * TILE_SIZE, y: 8 * TILE_SIZE, width: TILE_SIZE, height: 4 * TILE_SIZE, revealed: false, revealProgress: 0 },
      { x: 3 * TILE_SIZE, y: 10 * TILE_SIZE, width: TILE_SIZE, height: 4 * TILE_SIZE, revealed: false, revealProgress: 0 },
      { x: 18 * TILE_SIZE, y: 4 * TILE_SIZE, width: 10 * TILE_SIZE, height: TILE_SIZE, revealed: false, revealProgress: 0 },
      { x: 18 * TILE_SIZE, y: 22 * TILE_SIZE, width: 10 * TILE_SIZE, height: TILE_SIZE, revealed: false, revealProgress: 0 },
      { x: 28 * TILE_SIZE, y: 16 * TILE_SIZE, width: TILE_SIZE, height: 6 * TILE_SIZE, revealed: false, revealProgress: 0 },
      { x: 32 * TILE_SIZE, y: 15 * TILE_SIZE, width: 6 * TILE_SIZE, height: TILE_SIZE, revealed: false, revealProgress: 0 },
      { x: 13 * TILE_SIZE, y: 25 * TILE_SIZE, width: 2 * TILE_SIZE, height: 2 * TILE_SIZE, revealed: false, revealProgress: 0 },
      { x: 36 * TILE_SIZE, y: 3 * TILE_SIZE, width: TILE_SIZE, height: 5 * TILE_SIZE, revealed: false, revealProgress: 0 },
    ];
  }

  private initializePortals(): void {
    this.portals = [
      {
        x: 6 * TILE_SIZE + TILE_SIZE / 2,
        y: 15 * TILE_SIZE + TILE_SIZE / 2,
        targetX: 22 * TILE_SIZE + TILE_SIZE / 2,
        targetY: 10 * TILE_SIZE + TILE_SIZE / 2,
        used: false
      },
      {
        x: 30 * TILE_SIZE + TILE_SIZE / 2,
        y: 8 * TILE_SIZE + TILE_SIZE / 2,
        targetX: 14 * TILE_SIZE + TILE_SIZE / 2,
        targetY: 26 * TILE_SIZE + TILE_SIZE / 2,
        used: false
      },
      {
        x: 20 * TILE_SIZE + TILE_SIZE / 2,
        y: 28 * TILE_SIZE + TILE_SIZE / 2,
        targetX: 36 * TILE_SIZE + TILE_SIZE / 2,
        targetY: 12 * TILE_SIZE + TILE_SIZE / 2,
        used: false
      }
    ];
  }

  private generateBrickPattern(): void {
    for (let r = 0; r < MAP_ROWS; r++) {
      for (let c = 0; c < MAP_COLS; c++) {
        if (this.tiles[r][c] === 1) {
          const key = `${c},${r}`;
          this.brickPatternCache.set(key, Math.random() > 0.5);
        }
      }
    }
  }

  isWallAt(x: number, y: number): boolean {
    const c = Math.floor(x / TILE_SIZE);
    const r = Math.floor(y / TILE_SIZE);
    if (r < 0 || r >= MAP_ROWS || c < 0 || c >= MAP_COLS) return true;
    return this.tiles[r][c] === 1;
  }

  isWallNear(x: number, y: number, dist: number = 30): boolean {
    for (let dy = -dist; dy <= dist; dy += 10) {
      for (let dx = -dist; dx <= dist; dx += 10) {
        if (this.isWallAt(x + dx, y + dy)) return true;
      }
    }
    return false;
  }

  getTile(col: number, row: number): number {
    if (row < 0 || row >= MAP_ROWS || col < 0 || col >= MAP_COLS) return 1;
    return this.tiles[row][col];
  }

  getCols(): number { return MAP_COLS; }
  getRows(): number { return MAP_ROWS; }

  triggerRune(index: number): boolean {
    if (this.runes[index] && !this.runes[index].activated) {
      this.runes[index].activated = true;
      const doorIdx = this.runes[index].linkedDoorIndex;
      if (this.hiddenDoors[doorIdx]) {
        this.hiddenDoors[doorIdx].revealed = true;
      }
      return true;
    }
    return false;
  }

  checkRuneProximity(playerX: number, playerY: number): number | null {
    for (let i = 0; i < this.runes.length; i++) {
      const rune = this.runes[i];
      const dist = Math.hypot(playerX - rune.x, playerY - rune.y);
      if (dist < 40 && !rune.activated) {
        return i;
      }
    }
    return null;
  }

  checkPortal(playerX: number, playerY: number, isIgnited: boolean): number | null {
    if (!isIgnited) return null;
    for (let i = 0; i < this.portals.length; i++) {
      const portal = this.portals[i];
      const dist = Math.hypot(playerX - portal.x, playerY - portal.y);
      if (dist < 30) {
        return i;
      }
    }
    return null;
  }

  checkAltar(playerX: number, playerY: number): boolean {
    const dist = Math.hypot(playerX - this.altar.x, playerY - this.altar.y);
    return dist < this.altar.radius;
  }

  updateDoors(deltaTime: number): void {
    for (const door of this.hiddenDoors) {
      if (door.revealed && door.revealProgress < 1) {
        door.revealProgress = Math.min(1, door.revealProgress + deltaTime / 800);
      }
    }
  }
}
