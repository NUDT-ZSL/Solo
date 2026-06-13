export const TILE_SIZE = 48;

export interface Position {
  x: number;
  y: number;
}

export interface EnemyConfig {
  position: Position;
  isBoss: boolean;
}

export interface ChestConfig {
  position: Position;
  opened: boolean;
}

export interface RoomData {
  width: number;
  height: number;
  tiles: number[][];
  walls: Position[];
  obstacles: Position[];
  enemies: EnemyConfig[];
  chests: ChestConfig[];
  exit: Position;
  entrance: Position;
  isBossRoom: boolean;
  seed: number;
}

class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  pick<T>(arr: T[]): T {
    return arr[this.nextInt(0, arr.length - 1)];
  }
}

export function generateRoom(
  seed: number,
  isBossRoom: boolean = false
): RoomData {
  const rng = new SeededRandom(seed);

  let width: number, height: number;
  if (isBossRoom) {
    width = 12;
    height = 14;
  } else {
    width = rng.nextInt(8, 12);
    height = rng.nextInt(8, 12);
  }

  const tiles: number[][] = [];
  const walls: Position[] = [];
  const obstacles: Position[] = [];

  for (let y = 0; y < height; y++) {
    tiles[y] = [];
    for (let x = 0; x < width; x++) {
      if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
        tiles[y][x] = 1;
        walls.push({ x, y });
      } else {
        tiles[y][x] = 0;
      }
    }
  }

  const obstacleCount = isBossRoom ? 0 : rng.nextInt(0, 3);
  for (let i = 0; i < obstacleCount; i++) {
    let x: number, y: number;
    let attempts = 0;
    do {
      x = rng.nextInt(2, width - 3);
      y = rng.nextInt(2, height - 3);
      attempts++;
    } while (
      attempts < 100 &&
      (tiles[y][x] !== 0 ||
        obstacles.some((o) => Math.abs(o.x - x) < 2 && Math.abs(o.y - y) < 2))
    );
    if (attempts < 100) {
      tiles[y][x] = 2;
      obstacles.push({ x, y });
    }
  }

  const entranceSide = rng.nextInt(0, 1);
  let entrance: Position;
  let exit: Position;

  if (entranceSide === 0) {
    const entranceY = rng.nextInt(2, height - 3);
    entrance = { x: 0, y: entranceY };
    const exitBaseY = Math.floor(height / 2);
    const exitOffset = rng.nextInt(-2, 2);
    exit = { x: width - 1, y: Math.max(1, Math.min(height - 2, exitBaseY + exitOffset)) };
  } else {
    const entranceX = rng.nextInt(2, width - 3);
    entrance = { x: entranceX, y: 0 };
    const exitBaseX = Math.floor(width / 2);
    const exitOffset = rng.nextInt(-2, 2);
    exit = { x: Math.max(1, Math.min(width - 2, exitBaseX + exitOffset)), y: height - 1 };
  }

  tiles[entrance.y][entrance.x] = 0;
  tiles[exit.y][exit.x] = 0;

  if (entrance.x === 0) {
    tiles[entrance.y][1] = 0;
  } else if (entrance.y === 0) {
    tiles[1][entrance.x] = 0;
  }

  if (exit.x === width - 1) {
    tiles[exit.y][width - 2] = 0;
  } else if (exit.y === height - 1) {
    tiles[height - 2][exit.x] = 0;
  }

  const enemies: EnemyConfig[] = [];
  if (isBossRoom) {
    enemies.push({
      position: { x: Math.floor(width / 2), y: Math.floor(height / 2) },
      isBoss: true,
    });
  } else {
    const enemyCount = rng.nextInt(1, 3);
    for (let i = 0; i < enemyCount; i++) {
      let x: number, y: number;
      let attempts = 0;
      do {
        x = rng.nextInt(3, width - 4);
        y = rng.nextInt(2, height - 3);
        attempts++;
      } while (
        attempts < 100 &&
        (tiles[y][x] !== 0 ||
          enemies.some(
            (e) => Math.abs(e.position.x - x) < 2 && Math.abs(e.position.y - y) < 2
          ) ||
          (Math.abs(x - entrance.x) < 3 && Math.abs(y - entrance.y) < 3))
      );
      if (attempts < 100) {
        enemies.push({ position: { x, y }, isBoss: false });
      }
    }
  }

  const chests: ChestConfig[] = [];
  if (!isBossRoom) {
    const chestCount = rng.nextInt(0, 2);
    for (let i = 0; i < chestCount; i++) {
      let x: number, y: number;
      let attempts = 0;
      do {
        x = rng.nextInt(2, width - 3);
        y = rng.nextInt(2, height - 3);
        attempts++;
      } while (
        attempts < 100 &&
        (tiles[y][x] !== 0 ||
          obstacles.some((o) => o.x === x && o.y === y) ||
          enemies.some((e) => e.position.x === x && e.position.y === y) ||
          chests.some((c) => c.position.x === x && c.position.y === y))
      );
      if (attempts < 100) {
        chests.push({ position: { x, y }, opened: false });
      }
    }
  }

  return {
    width,
    height,
    tiles,
    walls,
    obstacles,
    enemies,
    chests,
    exit,
    entrance,
    isBossRoom,
    seed,
  };
}

export function isWalkable(room: RoomData, x: number, y: number): boolean {
  const tileX = Math.floor(x / TILE_SIZE);
  const tileY = Math.floor(y / TILE_SIZE);

  if (tileX < 0 || tileX >= room.width || tileY < 0 || tileY >= room.height) {
    return false;
  }

  const tile = room.tiles[tileY][tileX];
  return tile === 0;
}

export function getTileCenter(tileX: number, tileY: number): Position {
  return {
    x: tileX * TILE_SIZE + TILE_SIZE / 2,
    y: tileY * TILE_SIZE + TILE_SIZE / 2,
  };
}
