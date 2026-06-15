import { Room, TileType, Enemy, Chest, Item, Position } from '../types';
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
  SKELETON_SIZE,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
} from '../constants';

export class SeededRandom {
  private state: number;

  constructor(seed: number) {
    this.state = seed & 0xffffffff;
    if (this.state === 0) this.state = 1;
  }

  next(): number {
    this.state = (this.state * 1664525 + 1013904223) & 0xffffffff;
    return (this.state >>> 0) / 0x100000000;
  }

  nextInt(min: number, max: number): number {
    const range = max - min + 1;
    const r = this.next() * range;
    return Math.floor(r) + min;
  }

  nextId(prefix: string): string {
    const part1 = (this.next() * 0xffff) >>> 0;
    const part2 = (this.next() * 0xffff) >>> 0;
    return `${prefix}_${part1.toString(16)}${part2.toString(16)}`;
  }
}

function generateItem(rng: SeededRandom): Item {
  const roll = rng.next();
  if (roll < 0.4) {
    return {
      id: rng.nextId('itm'),
      type: 'heal',
      value: 20,
      name: '生命恢复+20',
    };
  } else if (roll < 0.7) {
    return {
      id: rng.nextId('itm'),
      type: 'attack',
      value: 5,
      name: '攻击力+5',
    };
  } else {
    return {
      id: rng.nextId('itm'),
      type: 'gold',
      value: 10,
      name: '金币+10',
    };
  }
}

function createEnemy(
  type: 'bat' | 'skeleton',
  x: number,
  y: number,
  rng: SeededRandom
): Enemy {
  if (type === 'bat') {
    return {
      id: rng.nextId('bat'),
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
    id: rng.nextId('skl'),
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

function findFloorPositions(
  tiles: TileType[][],
  rng: SeededRandom,
  count: number,
  existingPositions: Position[],
  spawn: Position
): Position[] {
  const positions: Position[] = [];
  const width = tiles[0].length;
  const height = tiles.length;
  let attempts = 0;

  while (positions.length < count && attempts < 2000) {
    attempts += 1;
    const gy = rng.nextInt(1, height - 2);
    const gx = rng.nextInt(1, width - 2);
    if (tiles[gy][gx] !== 'floor') continue;

    const px = gx * TILE_SIZE + TILE_SIZE / 2;
    const py = gy * TILE_SIZE + TILE_SIZE / 2;

    const sd = Math.hypot(spawn.x - px, spawn.y - py);
    if (sd < TILE_SIZE * 2) continue;

    const tooClose = positions.some((p) => {
      const dx = p.x - px;
      const dy = p.y - py;
      return Math.hypot(dx, dy) < TILE_SIZE * 1.2;
    });
    if (tooClose) continue;

    const tooCloseExisting = existingPositions.some((p) => {
      const dx = p.x - px;
      const dy = p.y - py;
      return Math.hypot(dx, dy) < TILE_SIZE * 1.2;
    });
    if (tooCloseExisting) continue;

    positions.push({ x: px, y: py });
  }

  return positions;
}

function tryFindSpawn(tiles: TileType[][]): Position {
  const height = tiles.length;
  const width = tiles[0].length;
  const centerY = Math.floor(height / 2);
  const centerX = Math.floor(width / 2);

  for (let radius = 0; radius < Math.max(width, height); radius++) {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
        const y = centerY + dy;
        const x = centerX + dx;
        if (y > 0 && y < height - 1 && x > 0 && x < width - 1) {
          if (tiles[y][x] === 'floor') {
            return {
              x: x * TILE_SIZE + TILE_SIZE / 2,
              y: y * TILE_SIZE + TILE_SIZE / 2,
            };
          }
        }
      }
    }
  }

  return {
    x: centerX * TILE_SIZE + TILE_SIZE / 2,
    y: centerY * TILE_SIZE + TILE_SIZE / 2,
  };
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
  const doorPositions: Position[] = [];
  const numDoors = rng.nextInt(1, 3);

  const sides: ('top' | 'bottom' | 'left' | 'right')[] = ['top', 'bottom', 'left', 'right'];
  const shuffledSides: ('top' | 'bottom' | 'left' | 'right')[] = [];
  const usedSides = new Set<string>();

  for (let i = 0; i < numDoors && shuffledSides.length < sides.length; i++) {
    let attempts = 0;
    while (attempts < 10) {
      const idx = rng.nextInt(0, sides.length - 1);
      const side = sides[idx];
      if (!usedSides.has(side)) {
        usedSides.add(side);
        shuffledSides.push(side);
        break;
      }
      attempts++;
    }
  }
  if (shuffledSides.length === 0) {
    shuffledSides.push('top');
  }

  for (const side of shuffledSides) {
    if (side === 'top') {
      const dx = rng.nextInt(2, Math.max(2, width - 3));
      tiles[0][dx] = 'door';
      doorPositions.push({ x: dx, y: 0 });
      doors.push({ x: dx * TILE_SIZE + TILE_SIZE / 2, y: TILE_SIZE / 2 });
    } else if (side === 'bottom') {
      const dx = rng.nextInt(2, Math.max(2, width - 3));
      tiles[height - 1][dx] = 'door';
      doorPositions.push({ x: dx, y: height - 1 });
      doors.push({
        x: dx * TILE_SIZE + TILE_SIZE / 2,
        y: (height - 1) * TILE_SIZE + TILE_SIZE / 2,
      });
    } else if (side === 'left') {
      const dy = rng.nextInt(2, Math.max(2, height - 3));
      tiles[dy][0] = 'door';
      doorPositions.push({ x: 0, y: dy });
      doors.push({ x: TILE_SIZE / 2, y: dy * TILE_SIZE + TILE_SIZE / 2 });
    } else if (side === 'right') {
      const dy = rng.nextInt(2, Math.max(2, height - 3));
      tiles[dy][width - 1] = 'door';
      doorPositions.push({ x: width - 1, y: dy });
      doors.push({
        x: (width - 1) * TILE_SIZE + TILE_SIZE / 2,
        y: dy * TILE_SIZE + TILE_SIZE / 2,
      });
    }
  }

  const extraWallCount = rng.nextInt(0, Math.max(1, Math.floor(width * height * 0.06)));
  for (let i = 0; i < extraWallCount; i++) {
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

  const spawn = tryFindSpawn(tiles);

  const numEnemies = rng.nextInt(MIN_ENEMIES, MAX_ENEMIES);
  const numChests = rng.nextInt(MIN_CHESTS, MAX_CHESTS);

  const enemyPositions = findFloorPositions(tiles, rng, numEnemies, [], spawn);
  const enemies: Enemy[] = enemyPositions.map((pos) => {
    const type = rng.next() < 0.5 ? 'bat' : 'skeleton';
    return createEnemy(type, pos.x, pos.y, rng);
  });

  const chestPositions = findFloorPositions(tiles, rng, numChests, enemyPositions, spawn);
  const chests: Chest[] = chestPositions.map((pos) => ({
    id: rng.nextId('chst'),
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
  return tryFindSpawn(room.tiles);
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
  const offsetX = Math.max(0, Math.floor((CANVAS_WIDTH - pw) / 2));
  const offsetY = Math.max(0, Math.floor((CANVAS_HEIGHT - ph) / 2));
  return { offsetX, offsetY };
}
