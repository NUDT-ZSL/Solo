import { GameMap, Room, Rect, Vector2 } from '../types';

export class MapGenerator {
  generate(width: number, height: number): GameMap {
    const startTime = performance.now();
    
    const rooms = this.generateRooms(width, height);
    const corridors = this.connectRooms(rooms);
    const walls = this.generateWalls(width, height, rooms, corridors);
    const furniture = this.generateFurniture(rooms);
    const floorGrid = this.generateFloorGrid(width, height);

    const map: GameMap = {
      width,
      height,
      walls,
      rooms,
      furniture,
      floorGrid
    };

    const elapsed = performance.now() - startTime;
    if (elapsed > 500) {
      console.warn(`Map generation took ${elapsed}ms, exceeding 500ms limit`);
    }

    return map;
  }

  private generateRooms(mapWidth: number, mapHeight: number): Room[] {
    const rooms: Room[] = [];
    const roomCount = 4 + Math.floor(Math.random() * 3);
    const minRoomSize = 100;
    const maxRoomSize = 180;
    const padding = 30;

    let attempts = 0;
    const maxAttempts = 200;

    while (rooms.length < roomCount && attempts < maxAttempts) {
      attempts++;
      
      const w = minRoomSize + Math.floor(Math.random() * (maxRoomSize - minRoomSize));
      const h = minRoomSize + Math.floor(Math.random() * (maxRoomSize - minRoomSize));
      const x = padding + Math.floor(Math.random() * (mapWidth - w - padding * 2));
      const y = padding + Math.floor(Math.random() * (mapHeight - h - padding * 2));

      const newRoom: Rect = { x, y, w, h };

      let overlaps = false;
      for (const room of rooms) {
        if (this.rectsOverlap(newRoom, room.bounds, 20)) {
          overlaps = true;
          break;
        }
      }

      if (!overlaps) {
        rooms.push({
          bounds: newRoom,
          corridors: [],
          furniture: []
        });
      }
    }

    return rooms;
  }

  private connectRooms(rooms: Room[]): Rect[] {
    const corridors: Rect[] = [];
    const corridorWidth = 80;

    for (let i = 0; i < rooms.length - 1; i++) {
      const room1 = rooms[i].bounds;
      const room2 = rooms[i + 1].bounds;

      const c1x = room1.x + room1.w / 2;
      const c1y = room1.y + room1.h / 2;
      const c2x = room2.x + room2.w / 2;
      const c2y = room2.y + room2.h / 2;

      if (Math.random() > 0.5) {
        corridors.push(this.createHorizontalCorridor(c1x, c2x, c1y, corridorWidth));
        corridors.push(this.createVerticalCorridor(c1y, c2y, c2x, corridorWidth));
      } else {
        corridors.push(this.createVerticalCorridor(c1y, c2y, c1x, corridorWidth));
        corridors.push(this.createHorizontalCorridor(c1x, c2x, c2y, corridorWidth));
      }
    }

    for (let i = 0; i < rooms.length - 1; i++) {
      rooms[i].corridors.push(corridors[i * 2]);
      rooms[i].corridors.push(corridors[i * 2 + 1]);
    }

    return corridors;
  }

  private createHorizontalCorridor(x1: number, x2: number, y: number, width: number): Rect {
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    return {
      x: minX - width / 2,
      y: y - width / 2,
      w: maxX - minX + width,
      h: width
    };
  }

  private createVerticalCorridor(y1: number, y2: number, x: number, width: number): Rect {
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);
    return {
      x: x - width / 2,
      y: minY - width / 2,
      w: width,
      h: maxY - minY + width
    };
  }

  private generateWalls(
    mapWidth: number,
    mapHeight: number,
    rooms: Room[],
    corridors: Rect[]
  ): Rect[] {
    const walls: Rect[] = [];
    const wallThickness = 8;

    walls.push({ x: 0, y: 0, w: mapWidth, h: wallThickness });
    walls.push({ x: 0, y: mapHeight - wallThickness, w: mapWidth, h: wallThickness });
    walls.push({ x: 0, y: 0, w: wallThickness, h: mapHeight });
    walls.push({ x: mapWidth - wallThickness, y: 0, w: wallThickness, h: mapHeight });

    const walkable: Rect[] = [];
    for (const room of rooms) {
      walkable.push(room.bounds);
    }
    for (const corridor of corridors) {
      walkable.push(corridor);
    }

    const gridSize = 16;
    const isWalkable = (x: number, y: number): boolean => {
      for (const r of walkable) {
        if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) {
          return true;
        }
      }
      return false;
    };

    for (let gx = 0; gx < mapWidth; gx += gridSize) {
      for (let gy = 0; gy < mapHeight; gy += gridSize) {
        const cx = gx + gridSize / 2;
        const cy = gy + gridSize / 2;
        
        if (!isWalkable(cx, cy)) {
          const neighbors = [
            isWalkable(cx + gridSize, cy),
            isWalkable(cx - gridSize, cy),
            isWalkable(cx, cy + gridSize),
            isWalkable(cx, cy - gridSize)
          ];
          
          if (neighbors.some(n => n)) {
            walls.push({ x: gx, y: gy, w: gridSize, h: gridSize });
          }
        }
      }
    }

    return walls;
  }

  private generateFurniture(rooms: Room[]): Rect[] {
    const furniture: Rect[] = [];
    const furnitureTypes = [
      { w: 30, h: 40, name: 'table' },
      { w: 25, h: 25, name: 'box' },
      { w: 60, h: 10, name: 'screen' },
      { w: 10, h: 60, name: 'screen_v' }
    ];

    for (const room of rooms) {
      const roomArea = room.bounds.w * room.bounds.h;
      const maxFurnitureArea = roomArea * 0.3;
      let currentFurnitureArea = 0;
      
      const furnitureAttempts = 8 + Math.floor(Math.random() * 6);
      
      for (let i = 0; i < furnitureAttempts; i++) {
        if (currentFurnitureArea >= maxFurnitureArea) break;
        
        const type = furnitureTypes[Math.floor(Math.random() * furnitureTypes.length)];
        const padding = 15;
        const fx = room.bounds.x + padding + Math.floor(Math.random() * (room.bounds.w - type.w - padding * 2));
        const fy = room.bounds.y + padding + Math.floor(Math.random() * (room.bounds.h - type.h - padding * 2));
        
        const newFurniture: Rect = { x: fx, y: fy, w: type.w, h: type.h };
        
        let overlaps = false;
        for (const f of room.furniture) {
          if (this.rectsOverlap(newFurniture, f, 5)) {
            overlaps = true;
            break;
          }
        }
        
        if (!overlaps) {
          room.furniture.push(newFurniture);
          furniture.push(newFurniture);
          currentFurnitureArea += type.w * type.h;
        }
      }
    }

    return furniture;
  }

  private generateFloorGrid(width: number, height: number): Vector2[] {
    const grid: Vector2[] = [];
    const spacing = 40;
    
    for (let x = 0; x <= width; x += spacing) {
      grid.push({ x, y: 0 });
      grid.push({ x, y: height });
    }
    for (let y = 0; y <= height; y += spacing) {
      grid.push({ x: 0, y });
      grid.push({ x: width, y });
    }
    
    return grid;
  }

  private rectsOverlap(r1: Rect, r2: Rect, padding: number = 0): boolean {
    return !(
      r1.x + r1.w + padding < r2.x ||
      r2.x + r2.w + padding < r1.x ||
      r1.y + r1.h + padding < r2.y ||
      r2.y + r2.h + padding < r1.y
    );
  }
}
