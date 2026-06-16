import type { GameMap, Room, Corridor, Vector2, Mushroom, Torch, Potion } from './types';

export class MapGenerator {
  private width: number;
  private height: number;
  private tileSize: number = 16;
  private gridWidth: number;
  private gridHeight: number;
  private grid: boolean[][] = [];
  private floorSet: Set<string> = new Set();
  private wallSet: Set<string> = new Set();

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.gridWidth = Math.floor(width / this.tileSize);
    this.gridHeight = Math.floor(height / this.tileSize);
  }

  generate(): GameMap {
    this.initializeGrid();
    
    const rooms = this.generateRooms();
    const corridors = this.connectRooms(rooms);
    
    this.buildWallSet();
    
    const mushrooms = this.generateMushrooms(rooms);
    const torches = this.generateTorches(rooms);
    const potions = this.generatePotions(rooms);
    
    const walls = this.wallSetToTiles();
    const floorTiles = this.floorSetToTiles();
    
    return {
      width: this.width,
      height: this.height,
      rooms,
      corridors,
      walls,
      floorTiles,
      mushrooms,
      torches,
      potions,
      isWall: (x: number, y: number) => this.isWall(x, y),
      isFloor: (x: number, y: number) => this.isFloor(x, y),
    };
  }

  private initializeGrid(): void {
    this.grid = [];
    for (let y = 0; y < this.gridHeight; y++) {
      this.grid[y] = [];
      for (let x = 0; x < this.gridWidth; x++) {
        this.grid[y][x] = true;
      }
    }
  }

  private generateRooms(): Room[] {
    const rooms: Room[] = [];
    const maxRooms = 8;
    const minRoomSize = 4;
    const maxRoomSize = 8;
    let attempts = 0;

    while (rooms.length < maxRooms && attempts < 100) {
      attempts++;
      
      const roomWidth = minRoomSize + Math.floor(Math.random() * (maxRoomSize - minRoomSize));
      const roomHeight = minRoomSize + Math.floor(Math.random() * (maxRoomSize - minRoomSize));
      const roomX = 1 + Math.floor(Math.random() * (this.gridWidth - roomWidth - 2));
      const roomY = 1 + Math.floor(Math.random() * (this.gridHeight - roomHeight - 2));

      const newRoom: Room = {
        x: roomX,
        y: roomY,
        width: roomWidth,
        height: roomHeight,
        centerX: roomX + Math.floor(roomWidth / 2),
        centerY: roomY + Math.floor(roomHeight / 2),
      };

      let overlaps = false;
      for (const room of rooms) {
        if (this.roomsOverlap(newRoom, room, 1)) {
          overlaps = true;
          break;
        }
      }

      if (!overlaps) {
        rooms.push(newRoom);
        this.carveRoom(newRoom);
      }
    }

    return rooms;
  }

  private roomsOverlap(r1: Room, r2: Room, padding: number): boolean {
    return !(
      r1.x + r1.width + padding < r2.x ||
      r2.x + r2.width + padding < r1.x ||
      r1.y + r1.height + padding < r2.y ||
      r2.y + r2.height + padding < r1.y
    );
  }

  private carveRoom(room: Room): void {
    for (let y = room.y; y < room.y + room.height; y++) {
      for (let x = room.x; x < room.x + room.width; x++) {
        if (x >= 0 && x < this.gridWidth && y >= 0 && y < this.gridHeight) {
          this.grid[y][x] = false;
          this.floorSet.add(`${x},${y}`);
        }
      }
    }
  }

  private connectRooms(rooms: Room[]): Corridor[] {
    const corridors: Corridor[] = [];
    
    for (let i = 1; i < rooms.length; i++) {
      const prevRoom = rooms[i - 1];
      const currRoom = rooms[i];
      
      const corridor = this.createCorridor(
        { x: prevRoom.centerX, y: prevRoom.centerY },
        { x: currRoom.centerX, y: currRoom.centerY }
      );
      
      corridors.push(corridor);
    }
    
    return corridors;
  }

  private createCorridor(from: Vector2, to: Vector2): Corridor {
    if (Math.random() > 0.5) {
      this.carveHorizontalCorridor(from.x, to.x, from.y);
      this.carveVerticalCorridor(from.y, to.y, to.x);
    } else {
      this.carveVerticalCorridor(from.y, to.y, from.x);
      this.carveHorizontalCorridor(from.x, to.x, to.y);
    }
    
    return { from, to };
  }

  private carveHorizontalCorridor(x1: number, x2: number, y: number): void {
    const start = Math.min(x1, x2);
    const end = Math.max(x1, x2);
    for (let x = start; x <= end; x++) {
      if (x >= 0 && x < this.gridWidth && y >= 0 && y < this.gridHeight) {
        this.grid[y][x] = false;
        this.floorSet.add(`${x},${y}`);
        if (y > 0) this.grid[y - 1][x] = this.grid[y - 1][x] && !this.floorSet.has(`${x},${y - 1}`);
        if (y < this.gridHeight - 1) this.grid[y + 1][x] = this.grid[y + 1][x] && !this.floorSet.has(`${x},${y + 1}`);
      }
    }
  }

  private carveVerticalCorridor(y1: number, y2: number, x: number): void {
    const start = Math.min(y1, y2);
    const end = Math.max(y1, y2);
    for (let y = start; y <= end; y++) {
      if (x >= 0 && x < this.gridWidth && y >= 0 && y < this.gridHeight) {
        this.grid[y][x] = false;
        this.floorSet.add(`${x},${y}`);
        if (x > 0) this.grid[y][x - 1] = this.grid[y][x - 1] && !this.floorSet.has(`${x - 1},${y}`);
        if (x < this.gridWidth - 1) this.grid[y][x + 1] = this.grid[y][x + 1] && !this.floorSet.has(`${x + 1},${y}`);
      }
    }
  }

  private buildWallSet(): void {
    this.wallSet.clear();
    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        if (this.grid[y][x]) {
          let isAdjacentToFloor = false;
          const neighbors = [
            { dx: 0, dy: -1 }, { dx: 0, dy: 1 },
            { dx: -1, dy: 0 }, { dx: 1, dy: 0 },
          ];
          for (const n of neighbors) {
            const nx = x + n.dx;
            const ny = y + n.dy;
            if (nx >= 0 && nx < this.gridWidth && ny >= 0 && ny < this.gridHeight) {
              if (this.floorSet.has(`${nx},${ny}`)) {
                isAdjacentToFloor = true;
                break;
              }
            }
          }
          if (isAdjacentToFloor) {
            this.wallSet.add(`${x},${y}`);
          }
        }
      }
    }
  }

  private wallSetToTiles(): Vector2[] {
    const tiles: Vector2[] = [];
    for (const key of this.wallSet) {
      const [x, y] = key.split(',').map(Number);
      tiles.push({ x: x * this.tileSize, y: y * this.tileSize });
    }
    return tiles;
  }

  private floorSetToTiles(): Vector2[] {
    const tiles: Vector2[] = [];
    for (const key of this.floorSet) {
      const [x, y] = key.split(',').map(Number);
      tiles.push({ x: x * this.tileSize, y: y * this.tileSize });
    }
    return tiles;
  }

  private generateMushrooms(rooms: Room[]): Mushroom[] {
    const mushrooms: Mushroom[] = [];
    for (const room of rooms) {
      const count = 2 + Math.floor(Math.random() * 4);
      for (let i = 0; i < count; i++) {
        const x = (room.x + 1 + Math.random() * (room.width - 2)) * this.tileSize;
        const y = (room.y + 1 + Math.random() * (room.height - 2)) * this.tileSize;
        mushrooms.push({
          x,
          y,
          radius: 8 + Math.random() * 4,
          phase: Math.random() * Math.PI * 2,
          colorStart: '#00ff88',
          colorEnd: '#00ffcc',
        });
      }
    }
    return mushrooms;
  }

  private generateTorches(rooms: Room[]): Torch[] {
    const torches: Torch[] = [];
    const torchRooms = rooms.slice(0, Math.min(4, rooms.length));
    for (const room of torchRooms) {
      torches.push({
        x: (room.x + room.width / 2) * this.tileSize,
        y: (room.y + room.height / 2) * this.tileSize,
        radius: 80,
        color: '#ff6b35',
      });
    }
    return torches;
  }

  private generatePotions(rooms: Room[]): Potion[] {
    const potions: Potion[] = [];
    const potionRooms = rooms.slice(2, Math.min(6, rooms.length));
    for (const room of potionRooms) {
      potions.push({
        x: (room.x + 1 + Math.random() * (room.width - 2)) * this.tileSize,
        y: (room.y + 1 + Math.random() * (room.height - 2)) * this.tileSize,
        radius: 8,
        collected: false,
      });
    }
    return potions;
  }

  isWall(px: number, py: number): boolean {
    const tileX = Math.floor(px / this.tileSize);
    const tileY = Math.floor(py / this.tileSize);
    return this.wallSet.has(`${tileX},${tileY}`);
  }

  isFloor(px: number, py: number): boolean {
    const tileX = Math.floor(px / this.tileSize);
    const tileY = Math.floor(py / this.tileSize);
    return this.floorSet.has(`${tileX},${tileY}`);
  }

  getRandomFloorPosition(): Vector2 {
    const floorKeys = Array.from(this.floorSet);
    const randomKey = floorKeys[Math.floor(Math.random() * floorKeys.length)];
    const [x, y] = randomKey.split(',').map(Number);
    return {
      x: x * this.tileSize + this.tileSize / 2,
      y: y * this.tileSize + this.tileSize / 2,
    };
  }

  getTileSize(): number {
    return this.tileSize;
  }
}
