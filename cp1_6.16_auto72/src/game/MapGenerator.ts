import { CellType, Direction, MapData, Position, TrapInfo } from './types';

class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed % 2147483647;
    if (this.seed <= 0) this.seed += 2147483646;
  }

  next(): number {
    this.seed = (this.seed * 16807) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
}

export function generateMap(seed: number, level: number): MapData {
  const rng = new SeededRandom(seed + level * 1000);

  const size = Math.min(10 + Math.floor(level * 0.5), 15);
  const width = size;
  const height = size;

  const grid: CellType[][] = Array.from({ length: height }, () =>
    Array(width).fill(CellType.EMPTY)
  );

  for (let x = 0; x < width; x++) {
    grid[0][x] = CellType.WALL;
    grid[height - 1][x] = CellType.WALL;
  }
  for (let y = 0; y < height; y++) {
    grid[y][0] = CellType.WALL;
    grid[y][width - 1] = CellType.WALL;
  }

  const innerCells: Position[] = [];
  for (let y = 2; y < height - 2; y++) {
    for (let x = 2; x < width - 2; x++) {
      innerCells.push({ x, y });
    }
  }

  const safeZone = new Set<string>();
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      safeZone.add(`${1 + dx},${1 + dy}`);
    }
  }

  const maxExitDist = width + height - 4;
  const exitMinDist = Math.max(maxExitDist * 0.5, 5);
  const exitCandidates = innerCells.filter(
    (p) =>
      !safeZone.has(`${p.x},${p.y}`) &&
      (p.x + p.y) >= exitMinDist &&
      grid[p.y][p.x] === CellType.EMPTY
  );

  let exitPosition: Position;
  if (exitCandidates.length > 0) {
    exitPosition = exitCandidates[rng.nextInt(0, exitCandidates.length - 1)];
  } else {
    exitPosition = { x: width - 2, y: height - 2 };
  }
  grid[exitPosition.y][exitPosition.x] = CellType.EXIT;

  const wallCandidates = innerCells.filter(
    (p) =>
      !safeZone.has(`${p.x},${p.y}`) &&
      !(p.x === exitPosition.x && p.y === exitPosition.y)
  );

  const wallCount = Math.floor(wallCandidates.length * 0.2);
  const shuffled = wallCandidates.sort(() => rng.next() - 0.5);
  const walls: Position[] = [];

  for (let i = 0; i < Math.min(wallCount, shuffled.length); i++) {
    const pos = shuffled[i];
    grid[pos.y][pos.x] = CellType.WALL;
    walls.push(pos);
  }

  const trapCount = Math.min(5 + Math.floor(level * 0.5), 10);
  const trapTypes: CellType[] = [CellType.TRAP_SPIKE, CellType.TRAP_ROCK, CellType.TRAP_POISON];
  const emptyCells: Position[] = [];
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      if (
        grid[y][x] === CellType.EMPTY &&
        !safeZone.has(`${x},${y}`) &&
        !(x === exitPosition.x && y === exitPosition.y)
      ) {
        emptyCells.push({ x, y });
      }
    }
  }

  const trapShuffled = emptyCells.sort(() => rng.next() - 0.5);
  const traps: TrapInfo[] = [];

  for (let i = 0; i < Math.min(trapCount, trapShuffled.length); i++) {
    const pos = trapShuffled[i];
    const trapType = trapTypes[rng.nextInt(0, trapTypes.length - 1)];
    grid[pos.y][pos.x] = trapType;
    traps.push({
      position: pos,
      type: trapType,
      revealed: false,
      highlightUntil: 0,
    });
  }

  return { grid, width, height, exitPosition, traps, walls };
}

export function directionToDelta(dir: Direction): Position {
  switch (dir) {
    case Direction.UP: return { x: 0, y: -1 };
    case Direction.DOWN: return { x: 0, y: 1 };
    case Direction.LEFT: return { x: -1, y: 0 };
    case Direction.RIGHT: return { x: 1, y: 0 };
  }
}
