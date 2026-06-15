export const TILE_SIZE = 32;
export const MAP_COLS = 25;
export const MAP_ROWS = 18;

export const TILE = {
  WALL: 0,
  FLOOR: 1,
  LAVA: 2,
  EXIT: 3
} as const;

export type TileType = typeof TILE[keyof typeof TILE];

export interface Room {
  x: number;
  y: number;
  w: number;
  h: number;
  cx: number;
  cy: number;
}

export interface Key {
  x: number;
  y: number;
  collected: boolean;
}

export interface FallingRock {
  x: number;
  y: number;
  vy: number;
  active: boolean;
}

export class Dungeon {
  public map: TileType[][];
  public rooms: Room[];
  public keys: Key[];
  public exit: { x: number; y: number };
  public playerStart: { x: number; y: number };
  public lavaSpreadTimer: number;
  public lavaSpreadInterval: number = 2;
  public rocks: FallingRock[];
  public rockTimer: number;
  public nextRockTime: number;
  public warningActive: boolean;
  public warningTimer: number;
  public exitActive: boolean;
  public exitFlashTimer: number;

  constructor() {
    this.map = [];
    this.rooms = [];
    this.keys = [];
    this.exit = { x: 0, y: 0 };
    this.playerStart = { x: 0, y: 0 };
    this.lavaSpreadTimer = 0;
    this.rocks = [];
    this.rockTimer = 0;
    this.nextRockTime = this.getRandomRockInterval();
    this.warningActive = false;
    this.warningTimer = 0;
    this.exitActive = false;
    this.exitFlashTimer = 0;
    this.generate();
  }

  private getRandomRockInterval(): number {
    return 180 + Math.random() * 120;
  }

  public generate(): void {
    this.map = [];
    for (let y = 0; y < MAP_ROWS; y++) {
      this.map[y] = [];
      for (let x = 0; x < MAP_COLS; x++) {
        this.map[y][x] = TILE.WALL;
      }
    }

    this.rooms = [];
    const numRooms = 4 + Math.floor(Math.random() * 3);

    for (let i = 0; i < numRooms * 10 && this.rooms.length < numRooms; i++) {
      const w = 5 + Math.floor(Math.random() * 5);
      const h = 5 + Math.floor(Math.random() * 5);
      const x = 1 + Math.floor(Math.random() * (MAP_COLS - w - 2));
      const y = 1 + Math.floor(Math.random() * (MAP_ROWS - h - 2));

      const newRoom: Room = { x, y, w, h, cx: Math.floor(x + w / 2), cy: Math.floor(y + h / 2) };

      let overlaps = false;
      for (const room of this.rooms) {
        if (x < room.x + room.w + 1 && x + w + 1 > room.x &&
            y < room.y + room.h + 1 && y + h + 1 > room.y) {
          overlaps = true;
          break;
        }
      }

      if (!overlaps) {
        this.rooms.push(newRoom);
        this.carveRoom(newRoom);
      }
    }

    for (let i = 1; i < this.rooms.length; i++) {
      this.connectRooms(this.rooms[i - 1], this.rooms[i]);
    }

    this.rooms.sort((a, b) => (b.x + b.y) - (a.x + a.y));

    const startRoom = this.rooms[0];
    this.playerStart = {
      x: (startRoom.cx + 0.5) * TILE_SIZE - 8,
      y: (startRoom.cy + 0.5) * TILE_SIZE - 8
    };

    this.rooms.sort((a, b) => (a.x + a.y) - (b.x + b.y));
    const exitRoom = this.rooms[0];
    this.exit = { x: exitRoom.cx, y: exitRoom.cy };
    this.map[exitRoom.cy][exitRoom.cx] = TILE.EXIT;

    const middleRooms = this.rooms.slice(1, -1);
    const shuffledRooms = [...middleRooms].sort(() => Math.random() - 0.5);
    this.keys = [];
    for (let i = 0; i < 3 && i < shuffledRooms.length; i++) {
      const room = shuffledRooms[i] || this.rooms[Math.floor(this.rooms.length / 2)];
      let kx: number, ky: number;
      let attempts = 0;
      do {
        kx = room.x + 1 + Math.floor(Math.random() * (room.w - 2));
        ky = room.y + 1 + Math.floor(Math.random() * (room.h - 2));
        attempts++;
      } while ((this.map[ky][kx] !== TILE.FLOOR || (kx === this.exit.x && ky === this.exit.y)) && attempts < 20);
      this.keys.push({ x: kx, y: ky, collected: false });
    }

    if (this.keys.length < 3) {
      for (let i = this.keys.length; i < 3; i++) {
        const room = this.rooms[Math.min(i + 1, this.rooms.length - 1)];
        this.keys.push({ x: room.cx, y: room.cy, collected: false });
      }
    }

    let lavaRoomIdx = Math.floor(this.rooms.length / 2);
    if (lavaRoomIdx === 0) lavaRoomIdx = 1;
    if (lavaRoomIdx >= this.rooms.length) lavaRoomIdx = this.rooms.length - 1;
    const lavaRoom = this.rooms[lavaRoomIdx];
    this.map[lavaRoom.cy][lavaRoom.cx] = TILE.LAVA;

    this.lavaSpreadTimer = 0;
    this.rocks = [];
    this.rockTimer = 0;
    this.nextRockTime = this.getRandomRockInterval();
    this.warningActive = false;
    this.warningTimer = 0;
    this.exitActive = false;
    this.exitFlashTimer = 0;
  }

  private carveRoom(room: Room): void {
    for (let y = room.y; y < room.y + room.h; y++) {
      for (let x = room.x; x < room.x + room.w; x++) {
        if (y >= 0 && y < MAP_ROWS && x >= 0 && x < MAP_COLS) {
          this.map[y][x] = TILE.FLOOR;
        }
      }
    }
  }

  private connectRooms(a: Room, b: Room): void {
    let x = a.cx;
    let y = a.cy;

    while (x !== b.cx) {
      if (y >= 0 && y < MAP_ROWS && x >= 0 && x < MAP_COLS) {
        this.map[y][x] = TILE.FLOOR;
      }
      x += x < b.cx ? 1 : -1;
    }
    while (y !== b.cy) {
      if (y >= 0 && y < MAP_ROWS && x >= 0 && x < MAP_COLS) {
        this.map[y][x] = TILE.FLOOR;
      }
      y += y < b.cy ? 1 : -1;
    }
  }

  public isWalkable(tx: number, ty: number): boolean {
    if (tx < 0 || tx >= MAP_COLS || ty < 0 || ty >= MAP_ROWS) return false;
    const tile = this.map[ty][tx];
    return tile === TILE.FLOOR || tile === TILE.EXIT;
  }

  public isLava(tx: number, ty: number): boolean {
    if (tx < 0 || tx >= MAP_COLS || ty < 0 || ty >= MAP_ROWS) return false;
    return this.map[ty][tx] === TILE.LAVA;
  }

  public update(_frameCount: number, playerX: number, playerY: number): { warning: boolean } {
    this.lavaSpreadTimer++;
    if (this.lavaSpreadTimer >= this.lavaSpreadInterval) {
      this.lavaSpreadTimer = 0;
      this.spreadLava(playerX, playerY);
    }

    this.rockTimer++;
    if (this.rockTimer >= this.nextRockTime) {
      this.spawnRock();
      this.rockTimer = 0;
      this.nextRockTime = this.getRandomRockInterval();
      this.warningActive = true;
      this.warningTimer = 30;
    }

    if (this.warningActive) {
      this.warningTimer--;
      if (this.warningTimer <= 0) {
        this.warningActive = false;
      }
    }

    this.updateRocks();

    const allKeysCollected = this.keys.every(k => k.collected);
    if (allKeysCollected) {
      this.exitActive = true;
      this.exitFlashTimer++;
    }

    return { warning: this.warningActive };
  }

  private spreadLava(playerX: number, playerY: number): void {
    const playerTX = Math.floor((playerX + 8) / TILE_SIZE);
    const playerTY = Math.floor((playerY + 8) / TILE_SIZE);

    const lavaTiles: { x: number; y: number }[] = [];
    for (let y = 0; y < MAP_ROWS; y++) {
      for (let x = 0; x < MAP_COLS; x++) {
        if (this.map[y][x] === TILE.LAVA) {
          lavaTiles.push({ x, y });
        }
      }
    }

    const directions = [[0, -1], [0, 1], [-1, 0], [1, 0]];
    const toAdd: { x: number; y: number }[] = [];

    for (const lava of lavaTiles) {
      const inView = Math.abs(lava.x - playerTX) <= 15 && Math.abs(lava.y - playerTY) <= 12;
      if (!inView) continue;

      for (const [dx, dy] of directions) {
        const nx = lava.x + dx;
        const ny = lava.y + dy;
        if (nx >= 0 && nx < MAP_COLS && ny >= 0 && ny < MAP_ROWS) {
          if (this.map[ny][nx] === TILE.FLOOR) {
            if (!toAdd.some(t => t.x === nx && t.y === ny)) {
              toAdd.push({ x: nx, y: ny });
            }
          }
        }
      }
    }

    for (const tile of toAdd) {
      this.map[tile.y][tile.x] = TILE.LAVA;
    }
  }

  private spawnRock(): void {
    const floorTiles: { x: number; y: number }[] = [];
    for (let y = 1; y < MAP_ROWS - 1; y++) {
      for (let x = 1; x < MAP_COLS - 1; x++) {
        if (this.map[y][x] === TILE.FLOOR || this.map[y][x] === TILE.EXIT || this.map[y][x] === TILE.LAVA) {
          if (this.map[y - 1][x] === TILE.WALL) {
            floorTiles.push({ x, y });
          }
        }
      }
    }

    if (floorTiles.length > 0) {
      const tile = floorTiles[Math.floor(Math.random() * floorTiles.length)];
      this.rocks.push({
        x: tile.x * TILE_SIZE + (TILE_SIZE - 16) / 2,
        y: tile.y * TILE_SIZE - 16,
        vy: 80 / 60,
        active: true
      });
    }
  }

  private updateRocks(): void {
    for (const rock of this.rocks) {
      if (!rock.active) continue;
      rock.y += rock.vy;

      const tx = Math.floor((rock.x + 8) / TILE_SIZE);
      const ty = Math.floor((rock.y + 16) / TILE_SIZE);

      if (ty >= MAP_ROWS || (ty >= 0 && ty < MAP_ROWS && tx >= 0 && tx < MAP_COLS && this.map[ty][tx] === TILE.WALL)) {
        rock.active = false;
      }
    }

    this.rocks = this.rocks.filter(r => r.active);
  }

  public checkRockCollision(playerX: number, playerY: number, playerW: number, playerH: number): boolean {
    for (const rock of this.rocks) {
      if (!rock.active) continue;
      if (playerX < rock.x + 16 && playerX + playerW > rock.x &&
          playerY < rock.y + 16 && playerY + playerH > rock.y) {
        rock.active = false;
        return true;
      }
    }
    return false;
  }

  public render(ctx: CanvasRenderingContext2D): void {
    for (let y = 0; y < MAP_ROWS; y++) {
      for (let x = 0; x < MAP_COLS; x++) {
        const tile = this.map[y][x];
        const px = x * TILE_SIZE;
        const py = y * TILE_SIZE;

        if (tile === TILE.WALL) {
          ctx.fillStyle = '#4A5568';
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          ctx.strokeStyle = '#2D3748';
          ctx.lineWidth = 2;
          ctx.strokeRect(px + 1, py + 1, TILE_SIZE - 2, TILE_SIZE - 2);
        } else {
          ctx.fillStyle = '#2D3748';
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        }

        if (tile === TILE.FLOOR) {
          ctx.fillStyle = '#A0AEC0';
          ctx.fillRect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4);
          ctx.strokeStyle = '#718096';
          ctx.lineWidth = 2;
          ctx.strokeRect(px + 3, py + 3, TILE_SIZE - 6, TILE_SIZE - 6);
        } else if (tile === TILE.LAVA) {
          ctx.fillStyle = '#F56565';
          ctx.fillRect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4);
          ctx.fillStyle = '#FC8181';
          ctx.fillRect(px + 6, py + 6, TILE_SIZE - 12, TILE_SIZE - 12);
          ctx.strokeStyle = '#C53030';
          ctx.lineWidth = 2;
          ctx.strokeRect(px + 3, py + 3, TILE_SIZE - 6, TILE_SIZE - 6);
        } else if (tile === TILE.EXIT) {
          if (this.exitActive) {
            const flashOn = Math.floor(this.exitFlashTimer / 15) % 2 === 0;
            ctx.fillStyle = flashOn ? '#48BB78' : '#276749';
            ctx.fillRect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4);
            ctx.fillStyle = flashOn ? '#68D391' : '#38A169';
            ctx.fillRect(px + 6, py + 6, TILE_SIZE - 12, TILE_SIZE - 12);
            ctx.strokeStyle = '#22543D';
          } else {
            ctx.fillStyle = '#2D3748';
            ctx.fillRect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4);
            ctx.strokeStyle = '#4A5568';
          }
          ctx.lineWidth = 2;
          ctx.strokeRect(px + 3, py + 3, TILE_SIZE - 6, TILE_SIZE - 6);
        }
      }
    }

    for (const key of this.keys) {
      if (!key.collected) {
        const kx = key.x * TILE_SIZE + TILE_SIZE / 2;
        const ky = key.y * TILE_SIZE + TILE_SIZE / 2;
        const bob = Math.sin(Date.now() / 200) * 2;

        ctx.fillStyle = '#F6E05E';
        ctx.beginPath();
        ctx.arc(kx, ky + bob - 4, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#B7791F';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#F6E05E';
        ctx.fillRect(kx - 1, ky + bob, 2, 8);
        ctx.fillRect(kx - 4, ky + bob + 4, 6, 2);
        ctx.strokeStyle = '#B7791F';
        ctx.lineWidth = 2;
        ctx.strokeRect(kx - 1.5, ky + bob - 0.5, 3, 9);
      }
    }

    for (const rock of this.rocks) {
      if (!rock.active) continue;
      ctx.fillStyle = '#A0AEC0';
      ctx.fillRect(rock.x, rock.y, 16, 16);
      ctx.fillStyle = '#718096';
      ctx.fillRect(rock.x + 2, rock.y + 2, 5, 5);
      ctx.fillRect(rock.x + 9, rock.y + 7, 4, 4);
      ctx.strokeStyle = '#4A5568';
      ctx.lineWidth = 2;
      ctx.strokeRect(rock.x + 1, rock.y + 1, 14, 14);
    }
  }
}
