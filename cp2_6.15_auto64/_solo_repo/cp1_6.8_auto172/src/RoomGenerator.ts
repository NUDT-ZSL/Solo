export const TILE_WALL = 4;
export const TILE_FLOOR = 0;
export const TILE_MONSTER = 1;
export const TILE_PORTAL = 2;
export const TILE_KEY = 3;

export interface RoomData {
  tiles: number[][];
  width: number;
  height: number;
  monsterSpawns: { x: number; y: number }[];
  portalPos: { x: number; y: number };
  keyPos: { x: number; y: number } | null;
  playerSpawn: { x: number; y: number };
}

export interface FloorData {
  rooms: RoomData[];
  roomCount: number;
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function generateRoom(difficulty: number, hasKey: boolean, isLast: boolean): RoomData {
  const width = randInt(20, 30);
  const height = randInt(14, 22);
  const tiles: number[][] = [];

  for (let y = 0; y < height; y++) {
    const row: number[] = [];
    for (let x = 0; x < width; x++) {
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
        row.push(TILE_WALL);
      } else {
        row.push(TILE_FLOOR);
      }
    }
    tiles.push(row);
  }

  const wallClusters = randInt(3, 6 + difficulty);
  for (let i = 0; i < wallClusters; i++) {
    const cx = randInt(3, width - 4);
    const cy = randInt(3, height - 4);
    const horizontal = Math.random() > 0.5;
    const len = randInt(2, 5);
    for (let j = 0; j < len; j++) {
      const wx = horizontal ? cx + j : cx;
      const wy = horizontal ? cy : cy + j;
      if (wx > 0 && wx < width - 1 && wy > 0 && wy < height - 1) {
        tiles[wy][wx] = TILE_WALL;
      }
    }
  }

  const floorCells: { x: number; y: number }[] = [];
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      if (tiles[y][x] === TILE_FLOOR) {
        floorCells.push({ x, y });
      }
    }
  }

  const shuffled = shuffleArray(floorCells);
  let idx = 0;

  const playerSpawn = shuffled[idx++] || { x: 2, y: 2 };

  const portalPos = isLast
    ? shuffled[idx++] || { x: width - 3, y: height - 3 }
    : { x: -1, y: -1 };

  const monsterCount = randInt(1, Math.min(3, 1 + difficulty));
  const monsterSpawns: { x: number; y: number }[] = [];
  for (let i = 0; i < monsterCount && idx < shuffled.length; i++) {
    const sp = shuffled[idx++];
    monsterSpawns.push(sp);
    tiles[sp.y][sp.x] = TILE_MONSTER;
  }

  let keyPos: { x: number; y: number } | null = null;
  if (hasKey && idx < shuffled.length) {
    keyPos = shuffled[idx++];
    tiles[keyPos.y][keyPos.x] = TILE_KEY;
  }

  if (isLast) {
    tiles[portalPos.y][portalPos.x] = TILE_PORTAL;
  }

  return { tiles, width, height, monsterSpawns, portalPos, keyPos, playerSpawn };
}

export function generateFloor(floorNumber: number): FloorData {
  const roomCount = randInt(5, 8);
  const rooms: RoomData[] = [];
  const keyRoomIndex = randInt(0, roomCount - 2);

  for (let i = 0; i < roomCount; i++) {
    const isLast = i === roomCount - 1;
    const hasKey = i === keyRoomIndex;
    rooms.push(generateRoom(floorNumber, hasKey, isLast));
  }

  return { rooms, roomCount };
}
