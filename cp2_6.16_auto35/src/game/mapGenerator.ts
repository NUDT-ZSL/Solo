import { TileType, MapGrid, Room, Position, MAP_WIDTH, MAP_HEIGHT } from './types';

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function createEmptyMap(): MapGrid {
  const map: MapGrid = [];
  for (let y = 0; y < MAP_HEIGHT; y++) {
    const row: TileType[] = [];
    for (let x = 0; x < MAP_WIDTH; x++) {
      row.push(TileType.WALL);
    }
    map.push(row);
  }
  return map;
}

function carveRoom(map: MapGrid, room: Room): void {
  for (let y = room.y; y < room.y + room.height; y++) {
    for (let x = room.x; x < room.x + room.width; x++) {
      if (x >= 0 && x < MAP_WIDTH && y >= 0 && y < MAP_HEIGHT) {
        map[y][x] = TileType.ROOM;
      }
    }
  }
}

function carveCorridor(map: MapGrid, from: Position, to: Position): void {
  let x = from.x;
  let y = from.y;

  if (Math.random() < 0.5) {
    while (x !== to.x) {
      if (x >= 0 && x < MAP_WIDTH && y >= 0 && y < MAP_HEIGHT) {
        if (map[y][x] === TileType.WALL) {
          map[y][x] = TileType.CORRIDOR;
        }
      }
      x += x < to.x ? 1 : -1;
    }
    while (y !== to.y) {
      if (x >= 0 && x < MAP_WIDTH && y >= 0 && y < MAP_HEIGHT) {
        if (map[y][x] === TileType.WALL) {
          map[y][x] = TileType.CORRIDOR;
        }
      }
      y += y < to.y ? 1 : -1;
    }
  } else {
    while (y !== to.y) {
      if (x >= 0 && x < MAP_WIDTH && y >= 0 && y < MAP_HEIGHT) {
        if (map[y][x] === TileType.WALL) {
          map[y][x] = TileType.CORRIDOR;
        }
      }
      y += y < to.y ? 1 : -1;
    }
    while (x !== to.x) {
      if (x >= 0 && x < MAP_WIDTH && y >= 0 && y < MAP_HEIGHT) {
        if (map[y][x] === TileType.WALL) {
          map[y][x] = TileType.CORRIDOR;
        }
      }
      x += x < to.x ? 1 : -1;
    }
  }

  if (to.x >= 0 && to.x < MAP_WIDTH && to.y >= 0 && to.y < MAP_HEIGHT) {
    if (map[to.y][to.x] === TileType.WALL) {
      map[to.y][to.x] = TileType.CORRIDOR;
    }
  }
}

function getRoomCenter(room: Room): Position {
  return {
    x: Math.floor(room.x + room.width / 2),
    y: Math.floor(room.y + room.height / 2),
  };
}

function roomsOverlap(r1: Room, r2: Room, padding = 1): boolean {
  return !(
    r1.x + r1.width + padding <= r2.x ||
    r2.x + r2.width + padding <= r1.x ||
    r1.y + r1.height + padding <= r2.y ||
    r2.y + r2.height + padding <= r1.y
  );
}

function generateRooms(count: number): Room[] {
  const rooms: Room[] = [];
  let attempts = 0;
  const maxAttempts = 500;

  while (rooms.length < count && attempts < maxAttempts) {
    const width = randomInt(4, 8);
    const height = randomInt(4, 7);
    const x = randomInt(1, MAP_WIDTH - width - 2);
    const y = randomInt(1, MAP_HEIGHT - height - 2);
    const room: Room = { x, y, width, height };

    let overlaps = false;
    for (const existing of rooms) {
      if (roomsOverlap(room, existing, 2)) {
        overlaps = true;
        break;
      }
    }

    if (!overlaps) {
      rooms.push(room);
    }
    attempts++;
  }

  return rooms;
}

function isWalkable(tile: TileType): boolean {
  return (
    tile === TileType.ROOM ||
    tile === TileType.CORRIDOR ||
    tile === TileType.ENTRANCE ||
    tile === TileType.EXIT
  );
}

function bfsCheckConnectivity(map: MapGrid, start: Position, end: Position): boolean {
  const visited: boolean[][] = Array.from({ length: MAP_HEIGHT }, () =>
    Array(MAP_WIDTH).fill(false)
  );
  const queue: Position[] = [start];
  visited[start.y][start.x] = true;

  const directions = [
    { x: 0, y: -1 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
  ];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.x === end.x && current.y === end.y) {
      return true;
    }

    for (const dir of directions) {
      const nx = current.x + dir.x;
      const ny = current.y + dir.y;

      if (
        nx >= 0 &&
        nx < MAP_WIDTH &&
        ny >= 0 &&
        ny < MAP_HEIGHT &&
        !visited[ny][nx] &&
        isWalkable(map[ny][nx])
      ) {
        visited[ny][nx] = true;
        queue.push({ x: nx, y: ny });
      }
    }
  }

  return false;
}

export interface GeneratedMap {
  map: MapGrid;
  rooms: Room[];
  entrance: Position;
  exit: Position;
}

export function generateDungeon(): GeneratedMap {
  let map: MapGrid;
  let rooms: Room[];
  let entrance: Position;
  let exit: Position;

  let attempts = 0;
  const maxAttempts = 50;

  do {
    map = createEmptyMap();
    rooms = generateRooms(randomInt(3, 5));

    for (const room of rooms) {
      carveRoom(map, room);
    }

    for (let i = 0; i < rooms.length - 1; i++) {
      const center1 = getRoomCenter(rooms[i]);
      const center2 = getRoomCenter(rooms[i + 1]);
      carveCorridor(map, center1, center2);
    }

    if (rooms.length >= 2) {
      const first = getRoomCenter(rooms[0]);
      const last = getRoomCenter(rooms[rooms.length - 1]);
      entrance = first;
      exit = last;

      map[entrance.y][entrance.x] = TileType.ENTRANCE;
      map[exit.y][exit.x] = TileType.EXIT;
    } else {
      entrance = { x: 1, y: 1 };
      exit = { x: MAP_WIDTH - 2, y: MAP_HEIGHT - 2 };
    }

    attempts++;
  } while (
    (!bfsCheckConnectivity(map, entrance, exit) || rooms.length < 3) &&
    attempts < maxAttempts
  );

  return { map, rooms, entrance, exit };
}

export function generateBossMap(): GeneratedMap {
  const map = createEmptyMap();
  const bossRoomWidth = 10;
  const bossRoomHeight = 10;
  const roomX = Math.floor((MAP_WIDTH - bossRoomWidth) / 2);
  const roomY = Math.floor((MAP_HEIGHT - bossRoomHeight) / 2);

  const bossRoom: Room = {
    x: roomX,
    y: roomY,
    width: bossRoomWidth,
    height: bossRoomHeight,
  };

  for (let y = roomY; y < roomY + bossRoomHeight; y++) {
    for (let x = roomX; x < roomX + bossRoomWidth; x++) {
      map[y][x] = TileType.ROOM;
    }
  }

  const entrance: Position = {
    x: Math.floor(roomX + bossRoomWidth / 2),
    y: roomY + bossRoomHeight - 2,
  };

  const exit: Position = {
    x: Math.floor(roomX + bossRoomWidth / 2),
    y: roomY + 2,
  };

  map[entrance.y][entrance.x] = TileType.ENTRANCE;

  return {
    map,
    rooms: [bossRoom],
    entrance,
    exit,
  };
}
