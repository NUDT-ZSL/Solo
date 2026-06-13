import { Room, TileType, Enemy, Chest, Item, Position } from '../types';
import { nextId } from '../game/GameState';
import {
  TILE_SIZE,
  ROOM_MIN_SIZE,
  ROOM_MAX_SIZE,
  MIN_ENEMIES,
  MAX_ENEMIES,
  MIN_CHESTS,
  MAX_CHESTS,
  BAT_HP,
  BAT_SPEED,
  BAT_DAMAGE,
  BAT_RADIUS,
  SKELETON_HP,
  SKELETON_SPEED,
  SKELETON_DAMAGE,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
} from '../constants';

class SeededRandom {
  private state: number;

  constructor(seed: number) {
    this.state = seed;
  }

  next(): number {
    this.state = (this.state * 1664525 + 1013904223) & 0xffffffff;
    return (this.state >>> 0) / 0xffffffff;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
}

function generateItem(rng: SeededRandom): Item {
  const roll = rng.next();
  if (roll < 0.4) {
    return { id: nextId(), type: 'heal', value: 20, name: '生命恢复+20' };
  } else if (roll < 0.7) {
    return { id: nextId(), type: 'attack', value: 5, name: '攻击力+5' };
  } else {
    return { id: nextId(), type: 'gold', value: 10, name: '金币+10' };
  }
}

function createEnemy(
  type: 'bat' | 'skeleton',
  x: number,
  y: number
): Enemy {
  if (type === 'bat') {
    return {
      id: nextId(),
      type: 'bat',
      x,
      y,
      hp: BAT_HP,
      maxHp: BAT_HP,
      speed: BAT_SPEED,
      damage: BAT_DAMAGE,
      radius: BAT_RADIUS,
    };
  }
  return {
    id: nextId(),
    type: 'skeleton',
    x,
    y,
    hp: SKELETON_HP,
    maxHp: SKELETON_HP,
    speed: SKELETON_SPEED,
    damage: SKELETON_DAMAGE,
    radius: SKELETON_SIZE / 2,
  };
}

const SKELETON_SIZE = 14;

function findFloorPositions(tiles: TileType[][], rng: SeededRandom, count: number, existingPositions: Position[]): Position[] {
  const positions: Position[] = [];
  const width = tiles[0].length;
  const height = tiles.length;
  let attempts = 0;

  while (positions.length < count && attempts < 1000) {
    attempts += 1;
    const gy = rng.nextInt(1, height - 2);
    const gx = rng.nextInt(1, width - 2);
    if (tiles[gy][gx] !== 'floor') continue;

    const px = gx * TILE_SIZE + TILE_SIZE / 2;
    const py = gy * TILE_SIZE + TILE_SIZE / 2;

    const tooClose = positions.some((p) => {
      const dx = p.x - px;
      const dy = p.y - py;
      return Math.sqrt(dx * dx + dy * dy) < TILE_SIZE * 1.5;
    });
    if (tooClose) continue;

    const tooCloseExisting = existingPositions.some((p) => {
      const dx = p.x - px;
      const dy = p.y - py;
      return Math.sqrt(dx * dx + dy * dy) < TILE_SIZE * 1.5;
    });
    if (tooCloseExisting) continue;

    positions.push({ x: px, y: py });
  }

  return positions;
}

export function generateRoom(roomId: number, seed: number): Room {
  const rng = new SeededRandom(seed);

  const width = rng.nextInt(ROOM_MIN_SIZE, ROOM_MAX_SIZE);
  const height = rng.nextInt(ROOM_MIN_SIZE, ROOM_MAX_SIZE);

  const tiles: TileType[][] = [];
  for (let y = 0; y < height; y++) {
    const row: TileType[] = [];
    for (let x = 0; x < width; x++) {
      if (y === 0 || y === height - 1 || x === 0 || x === width - 1) {
        row.push('wall');
      } else {
        row.push('floor');
      }
    }
    tiles.push(row);
  }

  const doors: Position[] = [];
  const doorSide = rng.nextInt(0, 3);
  const doorPositions: Position[] = [];

  if (doorSide === 0 || true) {
    const dx = rng.nextInt(2, width - 3);
    tiles[0][dx] = 'door';
    doorPositions.push({ x: dx, y: 0 });
    doors.push({ x: dx * TILE_SIZE + TILE_SIZE / 2, y: 0 });
  }
  if (doorSide >= 1) {
    const dx = rng.nextInt(2, width - 3);
    tiles[height - 1][dx] = 'door';
    doorPositions.push({ x: dx, y: height - 1 });
    doors.push({ x: dx * TILE_SIZE + TILE_SIZE / 2, y: (height - 1) * TILE_SIZE + TILE_SIZE });
  }
  if (doorSide >= 2) {
    const dy = rng.nextInt(2, height - 3);
    tiles[dy][0] = 'door';
    doorPositions.push({ x: 0, y: dy });
    doors.push({ x: 0, y: dy * TILE_SIZE + TILE_SIZE / 2 });
  }
  if (doorSide >= 3) {
    const dy = rng.nextInt(2, height - 3);
    tiles[dy][width - 1] = 'door';
    doorPositions.push({ x: width - 1, y: dy });
    doors.push({ x: (width - 1) * TILE_SIZE + TILE_SIZE, y: dy * TILE_SIZE + TILE_SIZE / 2 });
  }

  const extraWalls = rng.nextInt(0, Math.floor(width * height * 0.08));
  for (let i = 0; i < extraWalls; i++) {
    const wy = rng.nextInt(2, height - 3);
    const wx = rng.nextInt(2, width - 3);
    let isDoorNeighbor = false;
    for (const dp of doorPositions) {
      if (Math.abs(dp.x - wx) <= 1 && Math.abs(dp.y - wy) <= 1) {
        isDoorNeighbor = true;
        break;
      }
    }
    if (!isDoorNeighbor) {
      tiles[wy][wx] = 'wall';
    }
  }

  const numEnemies = rng.nextInt(MIN_ENEMIES, MAX_ENEMIES);
  const numChests = rng.nextInt(MIN_CHESTS, MAX_CHESTS);

  const enemyPositions = findFloorPositions(tiles, rng, numEnemies, []);
  const enemies: Enemy[] = enemyPositions.map((pos) => {
    const type = rng.next() < 0.5 ? 'bat' : 'skeleton';
    return createEnemy(type, pos.x, pos.y);
  });

  const chestPositions = findFloorPositions(tiles, rng, numChests, enemyPositions);
  const chests: Chest[] = chestPositions.map((pos) => ({
    id: nextId(),
    x: pos.x,
    y: pos.y,
    opened: false,
    item: generateItem(rng),
  }));

  return {
    id: roomId,
    width,
    height,
    tiles,
    enemies,
    chests,
    seed,
    doors,
  };
}

export function getSpawnPosition(room: Room): Position {
  const centerY = Math.floor(room.height / 2);
  const centerX = Math.floor(room.width / 2);

  for (let dy = 0; dy < room.height; dy++) {
    for (let dx = 0; dx < room.width; dx++) {
      const y = centerY + dy * (dy % 2 === 0 ? 1 : -1);
      const x = centerX + dx * (dx % 2 === 0 ? 1 : -1);
      if (y > 0 && y < room.height - 1 && x > 0 && x < room.width - 1) {
        if (room.tiles[y][x] === 'floor') {
          return {
            x: x * TILE_SIZE + TILE_SIZE / 2,
            y: y * TILE_SIZE + TILE_SIZE / 2,
          };
        }
      }
    }
  }

  return {
    x: centerX * TILE_SIZE + TILE_SIZE / 2,
    y: centerY * TILE_SIZE + TILE_SIZE / 2,
  };
}

export function getRoomPixelWidth(room: Room): number {
  return room.width * TILE_SIZE;
}

export function getRoomPixelHeight(room: Room): number {
  return room.height * TILE_SIZE;
}

export function getCameraOffset(room: Room): { offsetX: number; offsetY: number } {
  const pw = getRoomPixelWidth(room);
  const ph = getRoomPixelHeight(room);
  const offsetX = Math.max(0, (CANVAS_WIDTH - pw) / 2);
  const offsetY = Math.max(0, (CANVAS_HEIGHT - ph) / 2);
  return { offsetX, offsetY };
}
