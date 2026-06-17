export type CellType = 'floor' | 'wall' | 'obstacle';

export interface RoomData {
  grid: CellType[][];
  gridSize: number;
  cellSize: number;
  width: number;
  height: number;
  obstacles: { x: number; y: number; size: number }[];
  spawnPoints: { x: number; y: number }[];
  playerSpawn: { x: number; y: number };
  portalPosition: { x: number; y: number };
}

export type RoomEventName = 'room:generated';

export interface RoomEvents {
  'room:generated': (data: RoomData) => void;
}

export class RoomModule {
  private listeners: Map<RoomEventName, Set<Function>> = new Map();
  private currentRoom: RoomData | null = null;
  private roomIndex: number = 0;

  constructor() {
    for (const name of ['room:generated'] as RoomEventName[]) {
      this.listeners.set(name, new Set());
    }
  }

  on<K extends RoomEventName>(event: K, callback: RoomEvents[K]): void {
    this.listeners.get(event)?.add(callback as Function);
  }

  off<K extends RoomEventName>(event: K, callback: RoomEvents[K]): void {
    this.listeners.get(event)?.delete(callback as Function);
  }

  private emit<K extends RoomEventName>(event: K, ...args: Parameters<RoomEvents[K]>): void {
    this.listeners.get(event)?.forEach(cb => (cb as Function)(...args));
  }

  generateRoom(canvasWidth: number, canvasHeight: number): RoomData {
    this.roomIndex++;
    const gridSize = 10;
    const cellWidth = canvasWidth / gridSize;
    const cellHeight = canvasHeight / gridSize;
    const cellSize = Math.min(cellWidth, cellHeight);

    const grid: CellType[][] = [];
    for (let y = 0; y < gridSize; y++) {
      grid[y] = [];
      for (let x = 0; x < gridSize; x++) {
        if (x === 0 || y === 0 || x === gridSize - 1 || y === gridSize - 1) {
          grid[y][x] = 'wall';
        } else {
          grid[y][x] = 'floor';
        }
      }
    }

    const obstacles: { x: number; y: number; size: number }[] = [];
    const obstacleCount = 5 + Math.floor(Math.random() * 5);
    for (let i = 0; i < obstacleCount; i++) {
      const gx = 2 + Math.floor(Math.random() * (gridSize - 4));
      const gy = 2 + Math.floor(Math.random() * (gridSize - 4));
      if (grid[gy][gx] === 'floor') {
        grid[gy][gx] = 'obstacle';
        const size = cellSize * 0.6;
        obstacles.push({
          x: gx * cellSize + (cellSize - size) / 2,
          y: gy * cellSize + (cellSize - size) / 2,
          size
        });
      }
    }

    const spawnPoints: { x: number; y: number }[] = [];
    const safePositions: { gx: number; gy: number }[] = [];
    for (let gy = 1; gy < gridSize - 1; gy++) {
      for (let gx = 1; gx < gridSize - 1; gx++) {
        if (grid[gy][gx] === 'floor') {
          safePositions.push({ gx, gy });
        }
      }
    }

    const shuffled = safePositions.sort(() => Math.random() - 0.5);
    const playerSpawnPos = shuffled[0];
    const playerSpawn = {
      x: playerSpawnPos.gx * cellSize + cellSize / 2,
      y: playerSpawnPos.gy * cellSize + cellSize / 2
    };

    for (let i = 1; i < Math.min(shuffled.length, 15); i++) {
      const pos = shuffled[i];
      const dx = pos.gx - playerSpawnPos.gx;
      const dy = pos.gy - playerSpawnPos.gy;
      if (Math.sqrt(dx * dx + dy * dy) > 2) {
        spawnPoints.push({
          x: pos.gx * cellSize + cellSize / 2,
          y: pos.gy * cellSize + cellSize / 2
        });
      }
    }

    const portalPos = shuffled[shuffled.length - 1] || playerSpawnPos;
    const portalPosition = {
      x: portalPos.gx * cellSize + cellSize / 2,
      y: portalPos.gy * cellSize + cellSize / 2
    };

    const room: RoomData = {
      grid,
      gridSize,
      cellSize,
      width: cellSize * gridSize,
      height: cellSize * gridSize,
      obstacles,
      spawnPoints,
      playerSpawn,
      portalPosition
    };

    this.currentRoom = room;
    this.emit('room:generated', room);
    return room;
  }

  getCurrentRoom(): RoomData | null {
    return this.currentRoom;
  }

  getRoomIndex(): number {
    return this.roomIndex;
  }

  isWalkable(x: number, y: number, radius: number): boolean {
    if (!this.currentRoom) return false;
    const { cellSize, grid, gridSize } = this.currentRoom;

    const minGX = Math.max(0, Math.floor((x - radius) / cellSize));
    const maxGX = Math.min(gridSize - 1, Math.floor((x + radius) / cellSize));
    const minGY = Math.max(0, Math.floor((y - radius) / cellSize));
    const maxGY = Math.min(gridSize - 1, Math.floor((y + radius) / cellSize));

    for (let gy = minGY; gy <= maxGY; gy++) {
      for (let gx = minGX; gx <= maxGX; gx++) {
        if (grid[gy][gx] === 'wall' || grid[gy][gx] === 'obstacle') {
          const cellLeft = gx * cellSize;
          const cellRight = cellLeft + cellSize;
          const cellTop = gy * cellSize;
          const cellBottom = cellTop + cellSize;

          const closestX = Math.max(cellLeft, Math.min(x, cellRight));
          const closestY = Math.max(cellTop, Math.min(y, cellBottom));
          const distX = x - closestX;
          const distY = y - closestY;
          if (distX * distX + distY * distY < radius * radius) {
            return false;
          }
        }
      }
    }
    return true;
  }
}
