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
  id: number;
}

export interface DungeonMap {
  grid: TileType[][];
  rooms: Room[];
  playerSpawn: { x: number; y: number };
  portalPos: { x: number; y: number };
  trapPositions: { x: number; y: number }[];
  width: number;
  height: number;
  seed: number;
}

const GRID_WIDTH = 20;
const GRID_HEIGHT = 20;
const MIN_ROOM_SIZE = 3;
const MAX_ROOM_SIZE = 7;
const MIN_ROOMS = 3;
const MAX_ROOMS = 8;
const TRAP_COUNT = 3;
const TUNNEL_MAX_LEN = 14;
const ROOM_PLACE_ATTEMPTS = 300;

let seedCounter = 0;

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randInt(min: number, max: number): number {
  return Math.floor(rand(min, max + 1));
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

function carveTunnelL(
  grid: TileType[][],
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  width: number = 1,
): void {
  const waypointX = Math.random() < 0.5 ? x1 : x2;
  const waypointY = waypointX === x1 ? y2 : y1;

  carveHLine(grid, x1, waypointX, y1, width);
  carveVLine(grid, y1, waypointY, waypointX, width);
  carveHLine(grid, waypointX, x2, y2, width);
  carveVLine(grid, waypointY, y2, x2, width);
}

function carveHLine(grid: TileType[][], x1: number, x2: number, y: number, width: number): void {
  const xMin = Math.min(x1, x2);
  const xMax = Math.max(x1, x2);
  for (let x = xMin; x <= xMax; x++) {
    for (let w = 0; w < width; w++) {
      const yy = y + w - Math.floor(width / 2);
      if (yy >= 0 && yy < GRID_HEIGHT && x >= 0 && x < GRID_WIDTH) {
        if (grid[yy][x] === TileType.Wall) {
          grid[yy][x] = TileType.Floor;
        }
      }
    }
  }
}

function carveVLine(grid: TileType[][], y1: number, y2: number, x: number, width: number): void {
  const yMin = Math.min(y1, y2);
  const yMax = Math.max(y1, y2);
  for (let y = yMin; y <= yMax; y++) {
    for (let w = 0; w < width; w++) {
      const xx = x + w - Math.floor(width / 2);
      if (y >= 0 && y < GRID_HEIGHT && xx >= 0 && xx < GRID_WIDTH) {
        if (grid[y][xx] === TileType.Wall) {
          grid[y][xx] = TileType.Floor;
        }
      }
    }
  }
}

function carveRandomWalk(
  grid: TileType[][],
  startX: number,
  startY: number,
  maxSteps: number,
): { endX: number; endY: number } {
  let cx = startX;
  let cy = startY;
  let lastDir = randInt(0, 3);
  const directions = [
    { dx: 1, dy: 0 },
    { dx: -1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: 0, dy: -1 },
  ];

  for (let step = 0; step < maxSteps; step++) {
    if (cx >= 1 && cx < GRID_WIDTH - 1 && cy >= 1 && cy < GRID_HEIGHT - 1) {
      grid[cy][cx] = TileType.Floor;
      const extraW = Math.random() < 0.4;
      if (extraW) {
        const sideX = cx + (directions[(lastDir + 1) % 4].dx);
        const sideY = cy + (directions[(lastDir + 1) % 4].dy);
        if (sideX >= 1 && sideX < GRID_WIDTH - 1 && sideY >= 1 && sideY < GRID_HEIGHT - 1) {
          grid[sideY][sideX] = TileType.Floor;
        }
      }
    }

    const useLastDir = Math.random() < 0.65;
    let dir = useLastDir ? lastDir : randInt(0, 3);

    for (let i = 0; i < 4; i++) {
      const nx = cx + directions[dir].dx;
      const ny = cy + directions[dir].dy;
      if (nx >= 1 && nx < GRID_WIDTH - 1 && ny >= 1 && ny < GRID_HEIGHT - 1) {
        cx = nx;
        cy = ny;
        lastDir = dir;
        break;
      }
      dir = (dir + 1) % 4;
    }
  }

  return { endX: cx, endY: cy };
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
  let roomId = 0;
  let attempts = 0;

  while (rooms.length < targetCount && attempts < ROOM_PLACE_ATTEMPTS) {
    attempts++;
    const width = randInt(MIN_ROOM_SIZE, MAX_ROOM_SIZE);
    const height = randInt(MIN_ROOM_SIZE, MAX_ROOM_SIZE);
    const x = randInt(1, GRID_WIDTH - width - 2);
    const y = randInt(1, GRID_HEIGHT - height - 2);

    const candidate: Room = {
      x,
      y,
      width,
      height,
      centerX: Math.floor(x + width / 2),
      centerY: Math.floor(y + height / 2),
      id: roomId,
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
      roomId++;
    }
  }

  return rooms;
}

function roomCenterDistance(a: Room, b: Room): number {
  const dx = a.centerX - b.centerX;
  const dy = a.centerY - b.centerY;
  return Math.sqrt(dx * dx + dy * dy);
}

function connectRooms(grid: TileType[][], rooms: Room[]): void {
  if (rooms.length < 2) return;

  const connected = new Set<number>([rooms[0].id]);
  const remaining = new Set<number>(rooms.slice(1).map((r) => r.id));

  while (remaining.size > 0) {
    let bestPair: { from: number; to: number; dist: number } | null = null;

    for (const fromId of connected) {
      for (const toId of remaining) {
        const fromRoom = rooms.find((r) => r.id === fromId)!;
        const toRoom = rooms.find((r) => r.id === toId)!;
        const dist = roomCenterDistance(fromRoom, toRoom);
        if (!bestPair || dist < bestPair.dist) {
          bestPair = { from: fromId, to: toId, dist };
        }
      }
    }

    if (!bestPair) break;

    const fromRoom = rooms.find((r) => r.id === bestPair!.from)!;
    const toRoom = rooms.find((r) => r.id === bestPair!.to)!;

    const useRandomWalk = Math.random() < 0.55;
    const tunnelWidth = Math.random() < 0.3 ? 2 : 1;

    if (useRandomWalk) {
      const startX = fromRoom.centerX;
      const startY = fromRoom.centerY;
      carveRandomWalk(grid, startX, startY, Math.floor(bestPair.dist * 2.5) + 6);
    } else {
      carveTunnelL(
        grid,
        fromRoom.centerX,
        fromRoom.centerY,
        toRoom.centerX,
        toRoom.centerY,
        tunnelWidth,
      );
    }

    connected.add(bestPair.to);
    remaining.delete(bestPair.to);

    if (rooms.length >= 4 && remaining.size === 0 && Math.random() < 0.5) {
      const shuffled = [...rooms].sort(() => Math.random() - 0.5);
      for (let i = 0; i < Math.floor(rooms.length / 3); i++) {
        const a = shuffled[i * 2 % shuffled.length];
        const b = shuffled[(i * 2 + 1) % shuffled.length];
        if (a.id !== b.id) {
          carveTunnelL(grid, a.centerX, a.centerY, b.centerX, b.centerY, 1);
        }
      }
    }
  }
}

function placeDoors(grid: TileType[][], rooms: Room[]): void {
  for (const room of rooms) {
    for (let x = room.x; x < room.x + room.width; x++) {
      checkAndPlaceDoor(grid, x, room.y - 1, room);
      checkAndPlaceDoor(grid, x, room.y + room.height, room);
    }
    for (let y = room.y; y < room.y + room.height; y++) {
      checkAndPlaceDoor(grid, room.x - 1, y, room);
      checkAndPlaceDoor(grid, room.x + room.width, y, room);
    }
  }
}

function checkAndPlaceDoor(grid: TileType[][], x: number, y: number, _room: Room): void {
  if (x < 1 || x >= GRID_WIDTH - 1 || y < 1 || y >= GRID_HEIGHT - 1) return;
  if (grid[y][x] !== TileType.Floor) return;

  const dirs = [
    { dx: 0, dy: -1 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 0 },
    { dx: 1, dy: 0 },
  ];

  let floorCount = 0;
  let wallCount = 0;
  for (const d of dirs) {
    const nx = x + d.dx;
    const ny = y + d.dy;
    if (nx >= 0 && nx < GRID_WIDTH && ny >= 0 && ny < GRID_HEIGHT) {
      if (grid[ny][nx] === TileType.Floor || grid[ny][nx] === TileType.Door) {
        floorCount++;
      } else if (grid[ny][nx] === TileType.Wall) {
        wallCount++;
      }
    }
  }

  if (floorCount >= 2 && wallCount >= 2 && Math.random() < 0.35) {
    grid[y][x] = TileType.Door;
  }
}

function placeTraps(grid: TileType[][], rooms: Room[]): { x: number; y: number }[] {
  const traps: { x: number; y: number }[] = [];
  const candidates: { x: number; y: number }[] = [];

  const startRoom = rooms[0];
  const startRoomTiles = new Set<string>();
  for (let y = startRoom.y; y < startRoom.y + startRoom.height; y++) {
    for (let x = startRoom.x; x < startRoom.x + startRoom.width; x++) {
      startRoomTiles.add(`${x},${y}`);
    }
  }

  for (let y = 0; y < GRID_HEIGHT; y++) {
    for (let x = 0; x < GRID_WIDTH; x++) {
      if (grid[y][x] === TileType.Floor && !startRoomTiles.has(`${x},${y}`)) {
        let nearWall = 0;
        const dirs = [
          { dx: 0, dy: -1 },
          { dx: 0, dy: 1 },
          { dx: -1, dy: 0 },
          { dx: 1, dy: 0 },
        ];
        for (const d of dirs) {
          const nx = x + d.dx;
          const ny = y + d.dy;
          if (nx >= 0 && nx < GRID_WIDTH && ny >= 0 && ny < GRID_HEIGHT) {
            if (grid[ny][nx] === TileType.Wall) nearWall++;
          }
        }
        if (nearWall >= 0) {
          candidates.push({ x, y });
        }
      }
    }
  }

  const shuffled = candidates.sort(() => Math.random() - 0.5);
  for (let i = 0; i < Math.min(TRAP_COUNT, shuffled.length); i++) {
    const tile = shuffled[i];
    grid[tile.y][tile.x] = TileType.Trap;
    traps.push(tile);
  }

  return traps;
}

function placePortal(grid: TileType[][], rooms: Room[]): { x: number; y: number } {
  if (rooms.length <= 1) {
    return { x: 0, y: 0 };
  }

  const startRoom = rooms[0];
  let farthestRoom = rooms[1];
  let maxDist = roomCenterDistance(startRoom, farthestRoom);

  for (let i = 2; i < rooms.length; i++) {
    const d = roomCenterDistance(startRoom, rooms[i]);
    if (d > maxDist) {
      maxDist = d;
      farthestRoom = rooms[i];
    }
  }

  const roomFloors: { x: number; y: number }[] = [];
  for (let y = farthestRoom.y; y < farthestRoom.y + farthestRoom.height; y++) {
    for (let x = farthestRoom.x; x < farthestRoom.x + farthestRoom.width; x++) {
      if (grid[y][x] === TileType.Floor) {
        roomFloors.push({ x, y });
      }
    }
  }

  const chosen =
    roomFloors.length > 0
      ? roomFloors[randInt(0, roomFloors.length - 1)]
      : { x: farthestRoom.centerX, y: farthestRoom.centerY };

  grid[chosen.y][chosen.x] = TileType.Portal;
  return chosen;
}

function fillIsolatedPockets(grid: TileType[][]): void {
  for (let y = 1; y < GRID_HEIGHT - 1; y++) {
    for (let x = 1; x < GRID_WIDTH - 1; x++) {
      if (grid[y][x] === TileType.Wall) {
        let wallNeighbors = 0;
        const dirs = [
          { dx: 0, dy: -1 },
          { dx: 0, dy: 1 },
          { dx: -1, dy: 0 },
          { dx: 1, dy: 0 },
        ];
        for (const d of dirs) {
          const nx = x + d.dx;
          const ny = y + d.dy;
          if (grid[ny][nx] === TileType.Wall) {
            wallNeighbors++;
          }
        }
        if (wallNeighbors === 0) {
          grid[y][x] = TileType.Floor;
        }
      }
    }
  }
}

export function generateDungeon(): DungeonMap {
  const seed = seedCounter++;
  const grid = createEmptyGrid();
  const rooms = generateRooms();

  if (rooms.length < MIN_ROOMS) {
    while (rooms.length < MIN_ROOMS) {
      const width = MIN_ROOM_SIZE;
      const height = MIN_ROOM_SIZE;
      const x = randInt(1, GRID_WIDTH - width - 2);
      const y = randInt(1, GRID_HEIGHT - height - 2);
      rooms.push({
        x,
        y,
        width,
        height,
        centerX: Math.floor(x + width / 2),
        centerY: Math.floor(y + height / 2),
        id: rooms.length,
      });
    }
  }

  for (const room of rooms) {
    carveRoom(grid, room);
  }

  connectRooms(grid, rooms);
  fillIsolatedPockets(grid);
  placeDoors(grid, rooms);

  const playerSpawn = {
    x: rooms[0].centerX,
    y: rooms[0].centerY,
  };

  const portalPos = placePortal(grid, rooms);
  const trapPositions = placeTraps(grid, rooms);

  return {
    grid,
    rooms,
    playerSpawn,
    portalPos,
    trapPositions,
    width: GRID_WIDTH,
    height: GRID_HEIGHT,
    seed,
  };
}
