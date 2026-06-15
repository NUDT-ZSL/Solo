import {
  Tile,
  TileType,
  Room,
  Monster,
  Item,
  ItemType,
  DoorState,
  MAP_SIZE,
} from './types';

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function createEmptyMap(): Tile[][] {
  const map: Tile[][] = [];
  for (let y = 0; y < MAP_SIZE; y++) {
    const row: Tile[] = [];
    for (let x = 0; x < MAP_SIZE; x++) {
      row.push({
        type: Math.random() < 0.5 ? TileType.LOW_WALL : TileType.HIGH_WALL,
        explored: false,
        roomId: -1,
      });
    }
    map.push(row);
  }
  return map;
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
  const roomCount = randInt(5, 10);
  let attempts = 0;

  while (rooms.length < roomCount && attempts < 200) {
    attempts++;
    const width = randInt(4, 8);
    const height = randInt(4, 8);
    const x = randInt(1, MAP_SIZE - width - 2);
    const y = randInt(1, MAP_SIZE - height - 2);
    const newRoom: Room = {
      id: rooms.length,
      x,
      y,
      width,
      height,
    };

    let valid = true;
    for (const existing of rooms) {
      if (roomsOverlap(newRoom, existing, 2)) {
        valid = false;
        break;
      }
    }

    if (valid) {
      rooms.push(newRoom);
    }
  }

  return rooms;
}

function carveRoom(map: Tile[][], room: Room): void {
  for (let y = room.y; y < room.y + room.height; y++) {
    for (let x = room.x; x < room.x + room.width; x++) {
      if (
        x === room.x ||
        x === room.x + room.width - 1 ||
        y === room.y ||
        y === room.y + room.height - 1
      ) {
        map[y][x].type = Math.random() < 0.3 ? TileType.HIGH_WALL : TileType.LOW_WALL;
        map[y][x].roomId = room.id;
      } else {
        map[y][x].type = TileType.FLOOR;
        map[y][x].roomId = room.id;
      }
    }
  }
}

function carveCorridor(
  map: Tile[][],
  x1: number,
  y1: number,
  x2: number,
  y2: number
): { doors: Array<{ x: number; y: number }> } {
  const doors: Array<{ x: number; y: number }> = [];
  const horizontalFirst = Math.random() < 0.5;

  const carveHorizontal = (fromX: number, toX: number, y: number) => {
    const start = Math.min(fromX, toX);
    const end = Math.max(fromX, toX);
    for (let x = start; x <= end; x++) {
      if (map[y][x].type !== TileType.FLOOR) {
        if (
          map[y][x].roomId >= 0 &&
          (x === start || x === end) &&
          !(x === fromX && y === y1)
        ) {
          doors.push({ x, y });
          map[y][x].type = TileType.DOOR;
        } else {
          map[y][x].type = TileType.FLOOR;
          if (y > 0 && map[y - 1][x].roomId < 0) {
            map[y - 1][x].type =
              Math.random() < 0.5 ? TileType.LOW_WALL : TileType.HIGH_WALL;
          }
          if (y < MAP_SIZE - 1 && map[y + 1][x].roomId < 0) {
            map[y + 1][x].type =
              Math.random() < 0.5 ? TileType.LOW_WALL : TileType.HIGH_WALL;
          }
        }
      }
    }
  };

  const carveVertical = (fromY: number, toY: number, x: number) => {
    const start = Math.min(fromY, toY);
    const end = Math.max(fromY, toY);
    for (let y = start; y <= end; y++) {
      if (map[y][x].type !== TileType.FLOOR) {
        if (
          map[y][x].roomId >= 0 &&
          (y === start || y === end) &&
          !(x === x1 && y === fromY)
        ) {
          doors.push({ x, y });
          map[y][x].type = TileType.DOOR;
        } else {
          map[y][x].type = TileType.FLOOR;
          if (x > 0 && map[y][x - 1].roomId < 0) {
            map[y][x - 1].type =
              Math.random() < 0.5 ? TileType.LOW_WALL : TileType.HIGH_WALL;
          }
          if (x < MAP_SIZE - 1 && map[y][x + 1].roomId < 0) {
            map[y][x + 1].type =
              Math.random() < 0.5 ? TileType.LOW_WALL : TileType.HIGH_WALL;
          }
        }
      }
    }
  };

  if (horizontalFirst) {
    carveHorizontal(x1, x2, y1);
    carveVertical(y1, y2, x2);
  } else {
    carveVertical(y1, y2, x1);
    carveHorizontal(x1, x2, y2);
  }

  return { doors };
}

function getRoomCenter(room: Room): { x: number; y: number } {
  return {
    x: Math.floor(room.x + room.width / 2),
    y: Math.floor(room.y + room.height / 2),
  };
}

function generateItems(map: Tile[][], rooms: Room[]): Item[] {
  const items: Item[] = [];
  let itemId = 0;

  for (const room of rooms) {
    const itemCount = randInt(1, 2);
    for (let i = 0; i < itemCount; i++) {
      let attempts = 0;
      while (attempts < 50) {
        attempts++;
        const x = randInt(room.x + 1, room.x + room.width - 2);
        const y = randInt(room.y + 1, room.y + room.height - 2);
        if (map[y][x].type === TileType.FLOOR) {
          const occupied = items.some((it) => it.x === x && it.y === y);
          if (!occupied) {
            items.push({
              id: itemId++,
              type:
                Math.random() < 0.5 ? ItemType.TORCH_BOOST : ItemType.HEALTH_POTION,
              x,
              y,
            });
            break;
          }
        }
      }
    }
  }

  return items;
}

function generateMonsters(
  map: Tile[][],
  rooms: Room[],
  startRoomId: number
): Monster[] {
  const monsters: Monster[] = [];
  const count = randInt(5, 8);
  let monsterId = 0;

  const validRooms = rooms.filter((r) => r.id !== startRoomId);

  while (monsters.length < count && validRooms.length > 0) {
    const room = validRooms[randInt(0, validRooms.length - 1)];
    let attempts = 0;
    while (attempts < 30) {
      attempts++;
      const x = randInt(room.x + 1, room.x + room.width - 2);
      const y = randInt(room.y + 1, room.y + room.height - 2);
      if (map[y][x].type === TileType.FLOOR) {
        const occupied = monsters.some((m) => m.x === x && m.y === y);
        if (!occupied) {
          monsters.push({
            id: monsterId++,
            x,
            y,
            hp: 1,
            blinkTimer: 0,
            moveCooldown: randInt(0, 1000),
          });
          break;
        }
      }
    }
  }

  return monsters;
}

export interface GeneratedMap {
  map: Tile[][];
  rooms: Room[];
  doors: DoorState[];
  items: Item[];
  monsters: Monster[];
  playerStart: { x: number; y: number };
  totalFloorCount: number;
}

export function generateDungeon(): GeneratedMap {
  const map = createEmptyMap();
  const rooms = generateRooms();

  for (const room of rooms) {
    carveRoom(map, room);
  }

  const allDoors: Array<{ x: number; y: number }> = [];
  for (let i = 1; i < rooms.length; i++) {
    const prevCenter = getRoomCenter(rooms[i - 1]);
    const currCenter = getRoomCenter(rooms[i]);
    const { doors } = carveCorridor(
      map,
      prevCenter.x,
      prevCenter.y,
      currCenter.x,
      currCenter.y
    );
    allDoors.push(...doors);
  }

  const doorStates: DoorState[] = allDoors.map((d) => ({
    x: d.x,
    y: d.y,
    open: false,
    rotation: 0,
  }));

  const startRoom = rooms[0];
  const playerStart = getRoomCenter(startRoom);

  const items = generateItems(map, rooms);
  const monsters = generateMonsters(map, rooms, startRoom.id);

  let totalFloorCount = 0;
  for (let y = 0; y < MAP_SIZE; y++) {
    for (let x = 0; x < MAP_SIZE; x++) {
      if (map[y][x].type === TileType.FLOOR) {
        totalFloorCount++;
      }
    }
  }

  return {
    map,
    rooms,
    doors: doorStates,
    items,
    monsters,
    playerStart,
    totalFloorCount,
  };
}

export function findPath(
  map: Tile[][],
  doors: DoorState[],
  startX: number,
  startY: number,
  endX: number,
  endY: number
): Array<{ x: number; y: number }> | null {
  const isWalkable = (x: number, y: number): boolean => {
    if (x < 0 || x >= MAP_SIZE || y < 0 || y >= MAP_SIZE) return false;
    const tile = map[y][x];
    if (tile.type === TileType.FLOOR) return true;
    if (tile.type === TileType.DOOR) {
      const door = doors.find((d) => d.x === x && d.y === y);
      return door ? door.open : false;
    }
    return false;
  };

  if (!isWalkable(endX, endY)) return null;

  interface Node {
    x: number;
    y: number;
    g: number;
    h: number;
    f: number;
    parent: Node | null;
  }

  const heuristic = (x: number, y: number): number => {
    return Math.abs(x - endX) + Math.abs(y - endY);
  };

  const openSet: Node[] = [];
  const closedSet = new Set<string>();

  const startNode: Node = {
    x: startX,
    y: startY,
    g: 0,
    h: heuristic(startX, startY),
    f: heuristic(startX, startY),
    parent: null,
  };

  openSet.push(startNode);

  const directions = [
    { dx: 0, dy: -1 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 0 },
    { dx: 1, dy: 0 },
  ];

  while (openSet.length > 0) {
    openSet.sort((a, b) => a.f - b.f);
    const current = openSet.shift()!;

    if (current.x === endX && current.y === endY) {
      const path: Array<{ x: number; y: number }> = [];
      let node: Node | null = current;
      while (node) {
        path.unshift({ x: node.x, y: node.y });
        node = node.parent;
      }
      return path.slice(1);
    }

    closedSet.add(`${current.x},${current.y}`);

    for (const dir of directions) {
      const nx = current.x + dir.dx;
      const ny = current.y + dir.dy;

      if (!isWalkable(nx, ny)) continue;
      if (closedSet.has(`${nx},${ny}`)) continue;

      const g = current.g + 1;
      const existing = openSet.find((n) => n.x === nx && n.y === ny);

      if (!existing) {
        openSet.push({
          x: nx,
          y: ny,
          g,
          h: heuristic(nx, ny),
          f: g + heuristic(nx, ny),
          parent: current,
        });
      } else if (g < existing.g) {
        existing.g = g;
        existing.f = g + existing.h;
        existing.parent = current;
      }
    }
  }

  return null;
}
