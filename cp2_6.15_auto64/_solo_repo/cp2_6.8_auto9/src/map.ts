export enum TileType {
  WALL = 0,
  FLOOR = 1,
  BORDER = 2
}

export interface Position {
  x: number;
  y: number;
}

export interface GameMap {
  width: number;
  height: number;
  tiles: TileType[][];
  coins: Position[];
  portals: Position[];
}

export class DungeonMap {
  private width: number;
  private height: number;
  private tiles: TileType[][];
  private coins: Position[];
  private portals: Position[];

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.tiles = [];
    this.coins = [];
    this.portals = [];
    this.generate();
  }

  private generate(): void {
    this.initTiles();
    this.carveMaze();
    this.placeBorders();
    this.placeCoins(3);
    this.placePortals(2);
  }

  private initTiles(): void {
    this.tiles = [];
    for (let y = 0; y < this.height; y++) {
      const row: TileType[] = [];
      for (let x = 0; x < this.width; x++) {
        row.push(TileType.WALL);
      }
      this.tiles.push(row);
    }
  }

  private carveMaze(): void {
    const startX = 1 + Math.floor(Math.random() * ((this.width - 2) / 2)) * 2;
    const startY = 1 + Math.floor(Math.random() * ((this.height - 2) / 2)) * 2;
    this.tiles[startY][startX] = TileType.FLOOR;

    const stack: Position[] = [{ x: startX, y: startY }];
    const directions = [
      { dx: 0, dy: -2 },
      { dx: 0, dy: 2 },
      { dx: -2, dy: 0 },
      { dx: 2, dy: 0 }
    ];

    while (stack.length > 0) {
      const current = stack[stack.length - 1];
      const shuffled = [...directions].sort(() => Math.random() - 0.5);
      let carved = false;

      for (const dir of shuffled) {
        const nx = current.x + dir.dx;
        const ny = current.y + dir.dy;

        if (nx > 0 && nx < this.width - 1 && ny > 0 && ny < this.height - 1) {
          if (this.tiles[ny][nx] === TileType.WALL) {
            this.tiles[ny][nx] = TileType.FLOOR;
            this.tiles[current.y + dir.dy / 2][current.x + dir.dx / 2] = TileType.FLOOR;
            stack.push({ x: nx, y: ny });
            carved = true;
            break;
          }
        }
      }

      if (!carved) {
        stack.pop();
      }
    }

    this.openExtraPassages();
  }

  private openExtraPassages(): void {
    const extraCount = Math.floor((this.width * this.height) * 0.03);
    for (let i = 0; i < extraCount; i++) {
      const x = 1 + Math.floor(Math.random() * (this.width - 2));
      const y = 1 + Math.floor(Math.random() * (this.height - 2));
      if (this.tiles[y][x] === TileType.WALL) {
        let floorNeighbors = 0;
        if (y > 0 && this.tiles[y - 1][x] === TileType.FLOOR) floorNeighbors++;
        if (y < this.height - 1 && this.tiles[y + 1][x] === TileType.FLOOR) floorNeighbors++;
        if (x > 0 && this.tiles[y][x - 1] === TileType.FLOOR) floorNeighbors++;
        if (x < this.width - 1 && this.tiles[y][x + 1] === TileType.FLOOR) floorNeighbors++;
        if (floorNeighbors >= 2) {
          this.tiles[y][x] = TileType.FLOOR;
        }
      }
    }
  }

  private placeBorders(): void {
    for (let x = 0; x < this.width; x++) {
      this.tiles[0][x] = TileType.BORDER;
      this.tiles[this.height - 1][x] = TileType.BORDER;
    }
    for (let y = 0; y < this.height; y++) {
      this.tiles[y][0] = TileType.BORDER;
      this.tiles[y][this.width - 1] = TileType.BORDER;
    }
  }

  private getFloorPositions(): Position[] {
    const positions: Position[] = [];
    for (let y = 1; y < this.height - 1; y++) {
      for (let x = 1; x < this.width - 1; x++) {
        if (this.tiles[y][x] === TileType.FLOOR) {
          positions.push({ x, y });
        }
      }
    }
    return positions;
  }

  private placeCoins(count: number): void {
    this.coins = [];
    const floors = this.getFloorPositions().sort(() => Math.random() - 0.5);
    for (let i = 0; i < Math.min(count, floors.length); i++) {
      this.coins.push(floors[i]);
    }
  }

  private placePortals(count: number): void {
    this.portals = [];
    const usedPositions = new Set(this.coins.map(c => `${c.x},${c.y}`));
    const floors = this.getFloorPositions()
      .filter(p => !usedPositions.has(`${p.x},${p.y}`))
      .sort(() => Math.random() - 0.5);
    for (let i = 0; i < Math.min(count, floors.length); i++) {
      this.portals.push(floors[i]);
    }
  }

  public isWalkable(x: number, y: number): boolean {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return false;
    }
    return this.tiles[y][x] === TileType.FLOOR;
  }

  public getRandomFloorPosition(): Position {
    const floors = this.getFloorPositions();
    return floors[Math.floor(Math.random() * floors.length)];
  }

  public removeCoin(x: number, y: number): boolean {
    const index = this.coins.findIndex(c => c.x === x && c.y === y);
    if (index !== -1) {
      this.coins.splice(index, 1);
      return true;
    }
    return false;
  }

  public isPortal(x: number, y: number): boolean {
    return this.portals.some(p => p.x === x && p.y === y);
  }

  public getData(): GameMap {
    return {
      width: this.width,
      height: this.height,
      tiles: this.tiles,
      coins: [...this.coins],
      portals: [...this.portals]
    };
  }
}
