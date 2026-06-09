export const TILE_SIZE = 40;
export const GRID_WIDTH = 20;
export const GRID_HEIGHT = 15;
export const MAP_PIXEL_WIDTH = GRID_WIDTH * TILE_SIZE;
export const MAP_PIXEL_HEIGHT = GRID_HEIGHT * TILE_SIZE;

export enum TileType {
  WALL = 0,
  FLOOR = 1,
}

export interface Room {
  x: number;
  y: number;
  w: number;
  h: number;
  cx: number;
  cy: number;
  explored: boolean;
}

export class GameMap {
  tiles: TileType[][];
  rooms: Room[];
  wallNoise: number[][];
  mossPatches: { x: number; y: number; size: number }[];

  constructor() {
    this.tiles = [];
    this.rooms = [];
    this.wallNoise = [];
    this.mossPatches = [];
    this.generate();
  }

  private rand(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private randFloat(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }

  generate(): void {
    this.tiles = [];
    for (let y = 0; y < GRID_HEIGHT; y++) {
      const row: TileType[] = [];
      for (let x = 0; x < GRID_WIDTH; x++) {
        row.push(TileType.WALL);
      }
      this.tiles.push(row);
    }

    this.wallNoise = [];
    for (let y = 0; y < GRID_HEIGHT; y++) {
      const row: number[] = [];
      for (let x = 0; x < GRID_WIDTH; x++) {
        row.push(this.randFloat(0.7, 1.0));
      }
      this.wallNoise.push(row);
    }

    this.rooms = [];
    const roomCount = this.rand(5, 8);
    let attempts = 0;

    while (this.rooms.length < roomCount && attempts < 100) {
      attempts++;
      const w = this.rand(4, 8);
      const h = this.rand(4, 8);
      const x = this.rand(1, GRID_WIDTH - w - 1);
      const y = this.rand(1, GRID_HEIGHT - h - 1);

      let overlap = false;
      for (const r of this.rooms) {
        if (x < r.x + r.w + 1 && x + w + 1 > r.x && y < r.y + r.h + 1 && y + h + 1 > r.y) {
          overlap = true;
          break;
        }
      }

      if (!overlap) {
        for (let ry = y; ry < y + h; ry++) {
          for (let rx = x; rx < x + w; rx++) {
            this.tiles[ry][rx] = TileType.FLOOR;
          }
        }
        this.rooms.push({
          x, y, w, h,
          cx: x + Math.floor(w / 2),
          cy: y + Math.floor(h / 2),
          explored: false,
        });
      }
    }

    for (let i = 0; i < this.rooms.length - 1; i++) {
      const r1 = this.rooms[i];
      const r2 = this.rooms[i + 1];

      if (Math.random() < 0.5) {
        this.carveHorizontalCorridor(r1.cx, r2.cx, r1.cy);
        this.carveVerticalCorridor(r1.cy, r2.cy, r2.cx);
      } else {
        this.carveVerticalCorridor(r1.cy, r2.cy, r1.cx);
        this.carveHorizontalCorridor(r1.cx, r2.cx, r2.cy);
      }
    }

    if (this.rooms.length >= 3) {
      for (let i = 0; i < Math.floor(this.rooms.length / 2); i++) {
        const r1 = this.rooms[this.rand(0, this.rooms.length - 1)];
        const r2 = this.rooms[this.rand(0, this.rooms.length - 1)];
        if (r1 !== r2) {
          if (Math.random() < 0.5) {
            this.carveHorizontalCorridor(r1.cx, r2.cx, r1.cy);
            this.carveVerticalCorridor(r1.cy, r2.cy, r2.cx);
          } else {
            this.carveVerticalCorridor(r1.cy, r2.cy, r1.cx);
            this.carveHorizontalCorridor(r1.cx, r2.cx, r2.cy);
          }
        }
      }
    }

    this.mossPatches = [];
    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        if (this.tiles[y][x] === TileType.FLOOR && Math.random() < 0.08) {
          this.mossPatches.push({
            x: x * TILE_SIZE + this.randFloat(5, TILE_SIZE - 5),
            y: y * TILE_SIZE + this.randFloat(5, TILE_SIZE - 5),
            size: this.randFloat(6, 14),
          });
        }
      }
    }
  }

  private carveHorizontalCorridor(x1: number, x2: number, y: number): void {
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    for (let x = minX; x <= maxX; x++) {
      if (y >= 0 && y < GRID_HEIGHT && x >= 0 && x < GRID_WIDTH) {
        this.tiles[y][x] = TileType.FLOOR;
      }
    }
  }

  private carveVerticalCorridor(y1: number, y2: number, x: number): void {
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);
    for (let y = minY; y <= maxY; y++) {
      if (y >= 0 && y < GRID_HEIGHT && x >= 0 && x < GRID_WIDTH) {
        this.tiles[y][x] = TileType.FLOOR;
      }
    }
  }

  isWallAt(px: number, py: number): boolean {
    const gx = Math.floor(px / TILE_SIZE);
    const gy = Math.floor(py / TILE_SIZE);
    if (gx < 0 || gx >= GRID_WIDTH || gy < 0 || gy >= GRID_HEIGHT) {
      return true;
    }
    return this.tiles[gy][gx] === TileType.WALL;
  }

  checkCollision(x: number, y: number, radius: number): boolean {
    const points = [
      [x - radius, y - radius],
      [x + radius, y - radius],
      [x - radius, y + radius],
      [x + radius, y + radius],
      [x, y - radius],
      [x, y + radius],
      [x - radius, y],
      [x + radius, y],
    ];
    for (const [px, py] of points) {
      if (this.isWallAt(px, py)) {
        return true;
      }
    }
    return false;
  }

  getRandomFloorInRoom(room: Room): { x: number; y: number } {
    const rx = this.rand(room.x + 1, room.x + room.w - 2);
    const ry = this.rand(room.y + 1, room.y + room.h - 2);
    return {
      x: rx * TILE_SIZE + TILE_SIZE / 2,
      y: ry * TILE_SIZE + TILE_SIZE / 2,
    };
  }

  getRandomCorridorPosition(): { x: number; y: number } | null {
    const floorPositions: { x: number; y: number }[] = [];
    for (let y = 1; y < GRID_HEIGHT - 1; y++) {
      for (let x = 1; x < GRID_WIDTH - 1; x++) {
        if (this.tiles[y][x] === TileType.FLOOR) {
          let inRoom = false;
          for (const room of this.rooms) {
            if (x >= room.x && x < room.x + room.w && y >= room.y && y < room.y + room.h) {
              inRoom = true;
              break;
            }
          }
          if (!inRoom) {
            const neighbors = [
              [x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1],
            ];
            let wallCount = 0;
            for (const [nx, ny] of neighbors) {
              if (this.tiles[ny][nx] === TileType.WALL) wallCount++;
            }
            if (wallCount >= 2) {
              floorPositions.push({
                x: x * TILE_SIZE + TILE_SIZE / 2,
                y: y * TILE_SIZE + TILE_SIZE / 2,
              });
            }
          }
        }
      }
    }
    if (floorPositions.length === 0) return null;
    return floorPositions[this.rand(0, floorPositions.length - 1)];
  }

  getRandomUnexploredRoom(): Room | null {
    const unexplored = this.rooms.filter(r => !r.explored);
    if (unexplored.length === 0) return null;
    return unexplored[this.rand(0, unexplored.length - 1)];
  }

  markRoomExplored(px: number, py: number): void {
    const gx = Math.floor(px / TILE_SIZE);
    const gy = Math.floor(py / TILE_SIZE);
    for (const room of this.rooms) {
      if (gx >= room.x && gx < room.x + room.w && gy >= room.y && gy < room.y + room.h) {
        room.explored = true;
        break;
      }
    }
  }
}
