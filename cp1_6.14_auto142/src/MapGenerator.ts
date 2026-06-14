export enum TileType {
  Wall = 'wall',
  Floor = 'floor',
  Door = 'door',
  Portal = 'portal',
  Trap = 'trap',
}

export interface Room {
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

export interface DungeonMap {
  grid: TileType[][];
  rooms: Room[];
  playerSpawn: { x: number; y: number };
  portalPos: { x: number; y: number };
  trapPositions: { x: number; y: number }[];
  width: number;
  height: number;
}

const GRID_WIDTH = 20;
const GRID_HEIGHT = 20;
const MIN_ROOM_SIZE = 3;
const MAX_ROOM_SIZE = 6;
const MIN_ROOMS = 3;
const MAX_ROOMS = 6;
const TRAP_COUNT = 3;

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function createEmptyGrid(): TileType[][] {
  const grid: TileType[][] = [];
  for (let y = 0; y < GRID_HEIGHT; y++) {
    grid[y] = [];
    for (let x = 0; x < GRID_WIDTH; x++) {
      grid[y][x] = TileType.Wall;
    }
  }
  return grid;
}

function carveRoom(grid: TileType[][], room: Room): void {
  for (let y = room.y; y < room.y + room.height; y++) {
    for (let x = room.x; x < room.x + room.width; x++) {
      if (y >= 0 && y < GRID_HEIGHT && x >= 0 && x < GRID_WIDTH) {
        grid[y][x] = TileType.Floor;
      }
    }
  }
}

function carveCorridor(grid: TileType[][], x1: number, y1: number, x2: number, y2: number): void {
  let cx = x1;
  let cy = y1;

  while (cx !== x2) {
    if (cx >= 0 && cx < GRID_WIDTH && cy >= 0 && cy < GRID_HEIGHT) {
      grid[cy][cx] = TileType.Floor;
    }
    cx += cx < x2 ? 1 : -1;
  }
  while (cy !== y2) {
    if (cx >= 0 && cx < GRID_WIDTH && cy >= 0 && cy < GRID_HEIGHT) {
      grid[cy][cx] = TileType.Floor;
    }
    cy += cy < y2 ? 1 : -1;
  }
  if (cx >= 0 && cx < GRID_WIDTH && cy >= 0 && cy < GRID_HEIGHT) {
    grid[cy][cx] = TileType.Floor;
  }
}

function roomsOverlap(a: Room, b: Room, padding: number = 1): boolean {
  return !(
    a.x + a.width + padding <= b.x ||
    b.x + b.width + padding <= a.x ||
    a.y + a.height + padding <= b.y ||
    b.y + b.height + padding <= a.y
  );
}

function generateRooms(): Room[] {
  const rooms: Room[] = [];
  const targetCount = randInt(MIN_ROOMS, MAX_ROOMS);
  let attempts = 0;
  const maxAttempts = 200;

  while (rooms.length < targetCount && attempts < maxAttempts) {
    attempts++;
    const width = randInt(MIN_ROOM_SIZE, MAX_ROOM_SIZE);
    const height = randInt(MIN_ROOM_SIZE, MAX_ROOM_SIZE);
    const x = randInt(1, GRID_WIDTH - width - 1);
    const y = randInt(1, GRID_HEIGHT - height - 1);

    const candidate: Room = {
      x,
      y,
      width,
      height,
      centerX: Math.floor(x + width / 2),
      centerY: Math.floor(y + height / 2),
    };

    let overlaps = false;
    for (const existing of rooms) {
      if (roomsOverlap(candidate, existing, 2)) {
        overlaps = true;
        break;
      }
    }

    if (!overlaps) {
      rooms.push(candidate);
    }
  }

  while (rooms.length < MIN_ROOMS) {
    const width = MIN_ROOM_SIZE;
    const height = MIN_ROOM_SIZE;
    const x = randInt(1, GRID_WIDTH - width - 1);
    const y = randInt(1, GRID_HEIGHT - height - 1);
    rooms.push({
      x,
      y,
      width,
      height,
      centerX: Math.floor(x + width / 2),
      centerY: Math.floor(y + height / 2),
    });
  }

  return rooms;
}

function placeDoors(grid: TileType[][], rooms: Room[]): void {
  for (const room of rooms) {
    const perimeter: { x: number; y: number }[] = [];

    for (let x = room.x; x < room.x + room.width; x++) {
      if (x >= 0 && x < GRID_WIDTH) {
        if (room.y - 1 >= 0 && grid[room.y - 1][x] === TileType.Floor) {
          perimeter.push({ x, y: room.y });
        }
        if (room.y + room.height < GRID_HEIGHT && grid[room.y + room.height][x] === TileType.Floor) {
          perimeter.push({ x, y: room.y + room.height - 1 });
        }
      }
    }
    for (let y = room.y; y < room.y + room.height; y++) {
      if (y >= 0 && y < GRID_HEIGHT) {
        if (room.x - 1 >= 0 && grid[y][room.x - 1] === TileType.Floor) {
          perimeter.push({ x: room.x, y });
        }
        if (room.x + room.width < GRID_WIDTH && grid[y][room.x + room.width] === TileType.Floor) {
          perimeter.push({ x: room.x + room.width - 1, y });
        }
      }
    }

    for (const p of perimeter) {
      if (grid[p.y][p.x] === TileType.Floor) {
        let floorNeighbors = 0;
        const dirs = [
          { dx: 0, dy: -1 },
          { dx: 0, dy: 1 },
          { dx: -1, dy: 0 },
          { dx: 1, dy: 0 },
        ];
        for (const d of dirs) {
          const nx = p.x + d.dx;
          const ny = p.y + d.dy;
          if (nx >= 0 && nx < GRID_WIDTH && ny >= 0 && ny < GRID_HEIGHT) {
            if (grid[ny][nx] === TileType.Floor) {
              floorNeighbors++;
            }
          }
        }
        if (floorNeighbors >= 2) {
          grid[p.y][p.x] = TileType.Door;
        }
      }
    }
  }
}

function placeTraps(grid: TileType[][], rooms: Room[]): { x: number; y: number }[] {
  const traps: { x: number; y: number }[] = [];
  const floorTiles: { x: number; y: number }[] = [];

  for (let y = 0; y < GRID_HEIGHT; y++) {
    for (let x = 0; x < GRID_WIDTH; x++) {
      if (grid[y][x] === TileType.Floor) {
        floorTiles.push({ x, y });
      }
    }
  }

  let placed = 0;
  let attempts = 0;
  const maxAttempts = 100;

  while (placed < TRAP_COUNT && attempts < maxAttempts && floorTiles.length > 0) {
    attempts++;
    const idx = randInt(0, floorTiles.length - 1);
    const tile = floorTiles[idx];

    let isStartRoom = false;
    if (rooms.length > 0) {
      const r = rooms[0];
      if (
        tile.x >= r.x &&
        tile.x < r.x + r.width &&
        tile.y >= r.y &&
        tile.y < r.y + r.height
      ) {
        isStartRoom = true;
      }
    }

    if (!isStartRoom) {
      grid[tile.y][tile.x] = TileType.Trap;
      traps.push(tile);
      placed++;
    }
    floorTiles.splice(idx, 1);
  }

  return traps;
}

export function generateDungeon(): DungeonMap {
  const grid = createEmptyGrid();
  const rooms = generateRooms();

  rooms.sort((a, b) => a.centerX + a.centerY - (b.centerX + b.centerY));

  for (const room of rooms) {
    carveRoom(grid, room);
  }

  for (let i = 0; i < rooms.length - 1; i++) {
    carveCorridor(
      grid,
      rooms[i].centerX,
      rooms[i].centerY,
      rooms[i + 1].centerX,
      rooms[i + 1].centerY,
    );
  }

  placeDoors(grid, rooms);

  const playerSpawn = {
    x: rooms[0].centerX,
    y: rooms[0].centerY,
  };

  const lastRoom = rooms[rooms.length - 1];
  const portalFloorTiles: { x: number; y: number }[] = [];
  for (let y = lastRoom.y; y < lastRoom.y + lastRoom.height; y++) {
    for (let x = lastRoom.x; x < lastRoom.x + lastRoom.width; x++) {
      if (grid[y][x] === TileType.Floor || grid[y][x] === TileType.Door) {
        portalFloorTiles.push({ x, y });
      }
    }
  }

  const portalTile =
    portalFloorTiles.length > 0
      ? portalFloorTiles[randInt(0, portalFloorTiles.length - 1)]
      : { x: lastRoom.centerX, y: lastRoom.centerY };

  grid[portalTile.y][portalTile.x] = TileType.Portal;

  const trapPositions = placeTraps(grid, rooms);

  return {
    grid,
    rooms,
    playerSpawn,
    portalPos: portalTile,
    trapPositions,
    width: GRID_WIDTH,
    height: GRID_HEIGHT,
  };
}
