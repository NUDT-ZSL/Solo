import { v4 as uuidv4 } from 'uuid';
import type {
  DungeonMap,
  Room,
  Monster,
  Treasure,
  Position,
  TileType,
  DifficultyConfig,
  SeedResponse,
} from './types';

const MAP_WIDTH = 15;
const MAP_HEIGHT = 15;

function seededRandom(seed: string): () => number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return function () {
    hash = (hash * 1664525 + 1013904223) | 0;
    return ((hash >>> 0) % 100000) / 100000;
  };
}

export async function fetchSeedAndConfig(
  threatLevel: number,
): Promise<SeedResponse> {
  const response = await fetch(
    `/api/seed?threatLevel=${encodeURIComponent(threatLevel)}`,
  );
  if (!response.ok) {
    throw new Error('Failed to fetch seed');
  }
  return response.json();
}

function createEmptyMap(): TileType[][] {
  const tiles: TileType[][] = [];
  for (let y = 0; y < MAP_HEIGHT; y++) {
    tiles[y] = [];
    for (let x = 0; x < MAP_WIDTH; x++) {
      tiles[y][x] = 'wall';
    }
  }
  return tiles;
}

function roomsOverlap(a: Room, b: Room): boolean {
  return !(
    a.x + a.width + 1 < b.x ||
    b.x + b.width + 1 < a.x ||
    a.y + a.height + 1 < b.y ||
    b.y + b.height + 1 < a.y
  );
}

function carveRoom(tiles: TileType[][], room: Room): void {
  for (let y = room.y; y < room.y + room.height; y++) {
    for (let x = room.x; x < room.x + room.width; x++) {
      tiles[y][x] = 'floor';
    }
  }
}

function carveCorridor(
  tiles: TileType[][],
  a: Position,
  b: Position,
  random: () => number,
): void {
  let x = a.x;
  let y = a.y;
  const horizontalFirst = random() > 0.5;

  if (horizontalFirst) {
    while (x !== b.x) {
      tiles[y][x] = 'floor';
      x += x < b.x ? 1 : -1;
    }
    while (y !== b.y) {
      tiles[y][x] = 'floor';
      y += y < b.y ? 1 : -1;
    }
  } else {
    while (y !== b.y) {
      tiles[y][x] = 'floor';
      y += y < b.y ? 1 : -1;
    }
    while (x !== b.x) {
      tiles[y][x] = 'floor';
      x += x < b.x ? 1 : -1;
    }
  }
  tiles[y][x] = 'floor';
}

const MIN_ROOM_SIZE = 4;
const MAX_ROOM_SIZE = 8;
const MIN_ROOM_COUNT = 3;
const MAX_ROOM_COUNT = 5;

function randomInt(
  random: () => number,
  min: number,
  max: number,
): number {
  return Math.floor(random() * (max - min + 1)) + min;
}

function generateRooms(random: () => number): Room[] {
  const rooms: Room[] = [];
  const targetRooms = randomInt(random, MIN_ROOM_COUNT, MAX_ROOM_COUNT);
  let attempts = 0;

  while (rooms.length < targetRooms && attempts < 200) {
    attempts++;

    const width = randomInt(random, MIN_ROOM_SIZE, MAX_ROOM_SIZE);
    const height = randomInt(random, MIN_ROOM_SIZE, MAX_ROOM_SIZE);

    const maxX = MAP_WIDTH - width - 2;
    const maxY = MAP_HEIGHT - height - 2;

    if (maxX < 1 || maxY < 1) {
      continue;
    }

    const x = 1 + Math.floor(random() * maxX);
    const y = 1 + Math.floor(random() * maxY);

    if (
      x < 1 ||
      y < 1 ||
      x + width > MAP_WIDTH - 1 ||
      y + height > MAP_HEIGHT - 1
    ) {
      continue;
    }

    const newRoom: Room = {
      id: rooms.length,
      x,
      y,
      width,
      height,
      center: {
        x: Math.floor(x + width / 2),
        y: Math.floor(y + height / 2),
      },
    };

    let overlaps = false;
    for (const room of rooms) {
      if (roomsOverlap(newRoom, room)) {
        overlaps = true;
        break;
      }
    }

    if (!overlaps) {
      rooms.push(newRoom);
    }
  }

  return rooms;
}

function getMonsterCount(
  threatLevel: number,
  config: DifficultyConfig,
  random: () => number,
): number {
  let baseMin: number;
  let baseMax: number;

  if (threatLevel <= 3) {
    baseMin = 2;
    baseMax = 4;
  } else if (threatLevel <= 7) {
    baseMin = 5;
    baseMax = 7;
  } else {
    baseMin = 8;
    baseMax = 12;
  }

  const adjustedMin = Math.max(1, Math.floor(baseMin * config.monsterDensityMultiplier));
  const adjustedMax = Math.max(adjustedMin, Math.floor(baseMax * config.monsterDensityMultiplier));

  return adjustedMin + Math.floor(random() * (adjustedMax - adjustedMin + 1));
}

function positionIsEntrance(pos: Position, entrance: Position): boolean {
  return Math.abs(pos.x - entrance.x) <= 1 && Math.abs(pos.y - entrance.y) <= 1;
}

function generateMonsters(
  rooms: Room[],
  threatLevel: number,
  config: DifficultyConfig,
  entrance: Position,
  random: () => number,
): Monster[] {
  const monsters: Monster[] = [];
  const count = getMonsterCount(threatLevel, config, random);
  const usedPositions = new Set<string>();

  for (let i = 0; i < count; i++) {
    const room = rooms[1 + Math.floor(random() * (rooms.length - 1))];
    if (!room) continue;

    let pos: Position | null = null;
    let innerAttempts = 0;

    while (innerAttempts < 50 && !pos) {
      innerAttempts++;
      const candidate: Position = {
        x: room.x + 1 + Math.floor(random() * (room.width - 2)),
        y: room.y + 1 + Math.floor(random() * (room.height - 2)),
      };
      const key = `${candidate.x},${candidate.y}`;

      if (!usedPositions.has(key) && !positionIsEntrance(candidate, entrance)) {
        usedPositions.add(key);
        pos = candidate;
      }
    }

    if (pos) {
      const minChance = 0.1;
      const maxChance = 0.2;
      const treasureChance =
        minChance + random() * (maxChance - minChance);
      monsters.push({
        id: uuidv4(),
        position: pos,
        roomId: room.id,
        hp: 10 + threatLevel * 5,
        hasTreasure: random() < treasureChance * config.treasureDropRate,
      });
    }
  }

  return monsters;
}

function generateTreasures(
  monsters: Monster[],
  _random: () => number,
): Treasure[] {
  const treasures: Treasure[] = [];
  for (const monster of monsters) {
    if (monster.hasTreasure) {
      treasures.push({
        id: uuidv4(),
        position: { ...monster.position },
        roomId: monster.roomId,
        collected: false,
      });
    }
  }

  return treasures;
}

export function generateDungeon(
  threatLevel: number,
  seed: string,
  config: DifficultyConfig,
): DungeonMap {
  const random = seededRandom(seed);
  const tiles = createEmptyMap();
  const rooms = generateRooms(random);

  for (const room of rooms) {
    carveRoom(tiles, room);
  }

  for (let i = 1; i < rooms.length; i++) {
    carveCorridor(tiles, rooms[i - 1].center, rooms[i].center, random);
  }

  const entrance = rooms[0].center;

  const monsters = generateMonsters(rooms, threatLevel, config, entrance, random);
  const treasures = generateTreasures(monsters, random);

  const exploredRooms = new Set<number>();
  exploredRooms.add(rooms[0].id);

  return {
    seed,
    threatLevel,
    width: MAP_WIDTH,
    height: MAP_HEIGHT,
    tiles,
    rooms,
    monsters,
    treasures,
    entrance,
    exploredRooms,
  };
}
