export const TILE_SIZE = 30;
export const MAP_COLS = 20;
export const MAP_ROWS = 20;

export const TILE = {
  WALL: 0,
  FLOOR: 1,
  EXIT: 2,
  ENTRANCE: 3
} as const;

export interface Room {
  x: number;
  y: number;
  w: number;
  h: number;
  cx: number;
  cy: number;
}

export interface Gem {
  x: number;
  y: number;
  collected: boolean;
}

export class DungeonMap {
  public tiles: number[][] = [];
  public rooms: Room[] = [];
  public gems: Gem[] = [];
  public entrance: { x: number; y: number } = { x: 0, y: 0 };
  public exit: { x: number; y: number } = { x: 0, y: 0 };
  public explored: boolean[][] = [];

  constructor() {
    this.generate();
  }

  public generate(): void {
    this.tiles = [];
    for (let y = 0; y < MAP_ROWS; y++) {
      this.tiles[y] = [];
      for (let x = 0; x < MAP_COLS; x++) {
        this.tiles[y][x] = TILE.WALL;
      }
    }

    this.explored = [];
    for (let y = 0; y < MAP_ROWS; y++) {
      this.explored[y] = [];
      for (let x = 0; x < MAP_COLS; x++) {
        this.explored[y][x] = false;
      }
    }

    this.rooms = [];
    this.gems = [];

    const root: BSPNode = {
      x: 1,
      y: 1,
      w: MAP_COLS - 2,
      h: MAP_ROWS - 2
    };

    this.splitNode(root, 0);
    this.createRooms(root);
    this.connectRooms();

    this.rooms.sort((a, b) => a.cx + a.cy - (b.cx + b.cy));

    if (this.rooms.length >= 2) {
      const startRoom = this.rooms[0];
      const endRoom = this.rooms[this.rooms.length - 1];

      this.entrance = { x: startRoom.cx, y: startRoom.cy };
      this.exit = { x: endRoom.cx, y: endRoom.cy };

      this.tiles[this.entrance.y][this.entrance.x] = TILE.ENTRANCE;
      this.tiles[this.exit.y][this.exit.x] = TILE.EXIT;

      this.placeGems();
    }
  }

  private splitNode(node: BSPNode, depth: number): void {
    if (depth >= 4) return;

    const minW = 5;
    const minH = 5;

    if (node.w < minW * 2 && node.h < minH * 2) return;

    const canSplitH = node.w >= minW * 2;
    const canSplitV = node.h >= minH * 2;

    let splitHorizontal: boolean;
    if (canSplitH && canSplitV) {
      splitHorizontal = Math.random() > 0.5;
    } else if (canSplitH) {
      splitHorizontal = true;
    } else if (canSplitV) {
      splitHorizontal = false;
    } else {
      return;
    }

    if (splitHorizontal) {
      const splitMin = minW;
      const splitMax = node.w - minW;
      if (splitMax <= splitMin) return;
      const split = splitMin + Math.floor(Math.random() * (splitMax - splitMin));

      node.left = { x: node.x, y: node.y, w: split, h: node.h };
      node.right = { x: node.x + split, y: node.y, w: node.w - split, h: node.h };
    } else {
      const splitMin = minH;
      const splitMax = node.h - minH;
      if (splitMax <= splitMin) return;
      const split = splitMin + Math.floor(Math.random() * (splitMax - splitMin));

      node.left = { x: node.x, y: node.y, w: node.w, h: split };
      node.right = { x: node.x, y: node.y + split, w: node.w, h: node.h - split };
    }

    this.splitNode(node.left!, depth + 1);
    this.splitNode(node.right!, depth + 1);
  }

  private createRooms(node: BSPNode): void {
    if (node.left || node.right) {
      if (node.left) this.createRooms(node.left);
      if (node.right) this.createRooms(node.right);
      return;
    }

    const roomW = 3 + Math.floor(Math.random() * 4);
    const roomH = 3 + Math.floor(Math.random() * 4);

    const actualW = Math.min(roomW, node.w - 1);
    const actualH = Math.min(roomH, node.h - 1);

    const roomX = node.x + Math.floor(Math.random() * (node.w - actualW));
    const roomY = node.y + Math.floor(Math.random() * (node.h - actualH));

    for (let y = roomY; y < roomY + actualH; y++) {
      for (let x = roomX; x < roomX + actualW; x++) {
        if (y >= 0 && y < MAP_ROWS && x >= 0 && x < MAP_COLS) {
          this.tiles[y][x] = TILE.FLOOR;
        }
      }
    }

    this.rooms.push({
      x: roomX,
      y: roomY,
      w: actualW,
      h: actualH,
      cx: Math.floor(roomX + actualW / 2),
      cy: Math.floor(roomY + actualH / 2)
    });
  }

  private connectRooms(): void {
    for (let i = 1; i < this.rooms.length; i++) {
      const prev = this.rooms[i - 1];
      const curr = this.rooms[i];
      this.createCorridor(prev.cx, prev.cy, curr.cx, curr.cy);
    }

    if (this.rooms.length >= 3) {
      for (let i = 0; i < this.rooms.length - 2; i += 2) {
        const a = this.rooms[i];
        const b = this.rooms[Math.min(i + 2, this.rooms.length - 1)];
        if (Math.random() > 0.5) {
          this.createCorridor(a.cx, a.cy, b.cx, b.cy);
        }
      }
    }
  }

  private createCorridor(x1: number, y1: number, x2: number, y2: number): void {
    if (Math.random() > 0.5) {
      this.carveHCorridor(x1, x2, y1);
      this.carveVCorridor(y1, y2, x2);
    } else {
      this.carveVCorridor(y1, y2, x1);
      this.carveHCorridor(x1, x2, y2);
    }
  }

  private carveHCorridor(x1: number, x2: number, y: number): void {
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    for (let x = minX; x <= maxX; x++) {
      if (y >= 0 && y < MAP_ROWS && x >= 0 && x < MAP_COLS) {
        this.tiles[y][x] = TILE.FLOOR;
      }
    }
  }

  private carveVCorridor(y1: number, y2: number, x: number): void {
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);
    for (let y = minY; y <= maxY; y++) {
      if (y >= 0 && y < MAP_ROWS && x >= 0 && x < MAP_COLS) {
        this.tiles[y][x] = TILE.FLOOR;
      }
    }
  }

  private placeGems(): void {
    const gemCount = 3 + Math.floor(Math.random() * 3);
    const pathTiles = this.findPath(this.entrance, this.exit);

    if (pathTiles.length < 5) {
      this.placeGemsRandomly(gemCount);
      return;
    }

    const step = Math.floor(pathTiles.length / (gemCount + 1));
    for (let i = 1; i <= gemCount; i++) {
      const idx = Math.min(step * i + Math.floor(Math.random() * 3) - 1, pathTiles.length - 2);
      if (idx > 0 && idx < pathTiles.length - 1) {
        const pos = pathTiles[idx];
        if (!this.hasGemAt(pos.x, pos.y) &&
            !(pos.x === this.entrance.x && pos.y === this.entrance.y) &&
            !(pos.x === this.exit.x && pos.y === this.exit.y)) {
          this.gems.push({ x: pos.x, y: pos.y, collected: false });
        }
      }
    }

    while (this.gems.length < gemCount) {
      this.placeGemsRandomly(1);
    }
  }

  private placeGemsRandomly(count: number): void {
    let attempts = 0;
    while (this.gems.length < count + (this.gems.length) && attempts < 200) {
      attempts++;
      const room = this.rooms[Math.floor(Math.random() * this.rooms.length)];
      const gx = room.x + Math.floor(Math.random() * room.w);
      const gy = room.y + Math.floor(Math.random() * room.h);

      if (this.tiles[gy]?.[gx] === TILE.FLOOR &&
          !this.hasGemAt(gx, gy) &&
          !(gx === this.entrance.x && gy === this.entrance.y) &&
          !(gx === this.exit.x && gy === this.exit.y)) {
        this.gems.push({ x: gx, y: gy, collected: false });
      }
    }
  }

  private hasGemAt(x: number, y: number): boolean {
    return this.gems.some(g => g.x === x && g.y === y);
  }

  private findPath(start: { x: number; y: number }, end: { x: number; y: number }): { x: number; y: number }[] {
    const visited = new Set<string>();
    const queue: { pos: { x: number; y: number }; path: { x: number; y: number }[] }[] = [];
    queue.push({ pos: start, path: [start] });
    visited.add(`${start.x},${start.y}`);

    const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current.pos.x === end.x && current.pos.y === end.y) {
        return current.path;
      }

      for (const [dx, dy] of dirs) {
        const nx = current.pos.x + dx;
        const ny = current.pos.y + dy;
        const key = `${nx},${ny}`;

        if (nx >= 0 && nx < MAP_COLS && ny >= 0 && ny < MAP_ROWS &&
            !visited.has(key) && this.tiles[ny][nx] !== TILE.WALL) {
          visited.add(key);
          queue.push({ pos: { x: nx, y: ny }, path: [...current.path, { x: nx, y: ny }] });
        }
      }
    }

    return [start];
  }

  public isWall(x: number, y: number): boolean {
    if (x < 0 || x >= MAP_COLS || y < 0 || y >= MAP_ROWS) return true;
    return this.tiles[y][x] === TILE.WALL;
  }

  public getGemAt(x: number, y: number): Gem | null {
    return this.gems.find(g => !g.collected && g.x === x && g.y === y) || null;
  }

  public isExit(x: number, y: number): boolean {
    return this.tiles[y]?.[x] === TILE.EXIT;
  }

  public markExplored(x: number, y: number): void {
    if (x >= 0 && x < MAP_COLS && y >= 0 && y < MAP_ROWS) {
      this.explored[y][x] = true;
    }
  }
}

interface BSPNode {
  x: number;
  y: number;
  w: number;
  h: number;
  left?: BSPNode;
  right?: BSPNode;
}
