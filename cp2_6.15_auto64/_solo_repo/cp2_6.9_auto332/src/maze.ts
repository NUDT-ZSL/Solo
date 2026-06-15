export type CellType = 'wall' | 'room' | 'corridor' | 'entrance' | 'exit' | 'chest';

export interface Cell {
  type: CellType;
  x: number;
  y: number;
}

export interface Maze {
  grid: Cell[][];
  width: number;
  height: number;
  entrance: { x: number; y: number };
  exit: { x: number; y: number };
  chests: { x: number; y: number; collected: boolean }[];
  enemySpawns: { x: number; y: number }[];
}

export const ROOM_SIZE = 80;
export const CORRIDOR_WIDTH = 40;
export const CELL_PIXEL = 40;
export const GRID_SIZE = 15;

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateMaze(bpm: number, complexity: number = 1): Maze {
  const size = GRID_SIZE;
  const grid: Cell[][] = [];
  for (let y = 0; y < size; y++) {
    const row: Cell[] = [];
    for (let x = 0; x < size; x++) {
      row.push({ type: 'wall', x, y });
    }
    grid.push(row);
  }

  const rooms: { x: number; y: number; w: number; h: number; cx: number; cy: number }[] = [];
  const roomCount = 5 + Math.floor(complexity * 2);
  let attempts = 0;
  while (rooms.length < roomCount && attempts < 100) {
    attempts++;
    const w = randInt(2, 3);
    const h = randInt(2, 3);
    const x = randInt(1, size - w - 2);
    const y = randInt(1, size - h - 2);
    const overlaps = rooms.some(r =>
      x - 1 < r.x + r.w && x + w + 1 > r.x &&
      y - 1 < r.y + r.h && y + h + 1 > r.y
    );
    if (overlaps) continue;
    for (let yy = y; yy < y + h; yy++) {
      for (let xx = x; xx < x + w; xx++) {
        grid[yy][xx].type = 'room';
      }
    }
    rooms.push({ x, y, w, h, cx: x + Math.floor(w / 2), cy: y + Math.floor(h / 2) });
  }

  for (let i = 1; i < rooms.length; i++) {
    const a = rooms[i - 1];
    const b = rooms[i];
    carveCorridor(grid, a.cx, a.cy, b.cx, b.cy);
  }

  if (rooms.length > 2) {
    for (let i = 0; i < Math.floor(rooms.length / 2); i++) {
      const a = pickRandom(rooms);
      const b = pickRandom(rooms);
      if (a !== b) carveCorridor(grid, a.cx, a.cy, b.cx, b.cy);
    }
  }

  rooms.sort((a, b) => (a.cx + a.cy) - (b.cx + b.cy));
  const entranceRoom = rooms[0];
  const exitRoom = rooms[rooms.length - 1];
  const entrance = { x: entranceRoom.cx, y: entranceRoom.cy };
  const exit = { x: exitRoom.cx, y: exitRoom.cy };
  grid[entrance.y][entrance.x].type = 'entrance';
  grid[exit.y][exit.x].type = 'exit';

  const walkable: { x: number; y: number }[] = [];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const t = grid[y][x].type;
      if ((t === 'room' || t === 'corridor') &&
          !(x === entrance.x && y === entrance.y) &&
          !(x === exit.x && y === exit.y)) {
        walkable.push({ x, y });
      }
    }
  }
  shuffle(walkable);

  const chests: { x: number; y: number; collected: boolean }[] = [];
  for (let i = 0; i < 2 && walkable.length > 0; i++) {
    const pos = walkable.pop()!;
    if (grid[pos.y][pos.x].type !== 'entrance' && grid[pos.y][pos.x].type !== 'exit') {
      chests.push({ x: pos.x, y: pos.y, collected: false });
      grid[pos.y][pos.x].type = 'chest';
    }
  }

  const enemyCount = randInt(3, 5);
  const enemySpawns: { x: number; y: number }[] = [];
  for (let i = 0; i < enemyCount && walkable.length > 0; i++) {
    let found = false;
    for (let j = walkable.length - 1; j >= 0; j--) {
      const pos = walkable[j];
      const dist = Math.abs(pos.x - entrance.x) + Math.abs(pos.y - entrance.y);
      if (dist >= 5 && grid[pos.y][pos.x].type !== 'chest') {
        enemySpawns.push(pos);
        walkable.splice(j, 1);
        found = true;
        break;
      }
    }
    if (!found && walkable.length > 0) {
      const pos = walkable.pop()!;
      if (grid[pos.y][pos.x].type !== 'chest') {
        enemySpawns.push(pos);
      }
    }
  }

  return {
    grid,
    width: size,
    height: size,
    entrance,
    exit,
    chests,
    enemySpawns
  };
}

function carveCorridor(grid: Cell[][], x1: number, y1: number, x2: number, y2: number) {
  let x = x1, y = y1;
  const horizontalFirst = Math.random() < 0.5;
  if (horizontalFirst) {
    while (x !== x2) {
      if (grid[y][x].type === 'wall') grid[y][x].type = 'corridor';
      x += x < x2 ? 1 : -1;
    }
    while (y !== y2) {
      if (grid[y][x].type === 'wall') grid[y][x].type = 'corridor';
      y += y < y2 ? 1 : -1;
    }
  } else {
    while (y !== y2) {
      if (grid[y][x].type === 'wall') grid[y][x].type = 'corridor';
      y += y < y2 ? 1 : -1;
    }
    while (x !== x2) {
      if (grid[y][x].type === 'wall') grid[y][x].type = 'corridor';
      x += x < x2 ? 1 : -1;
    }
  }
  if (grid[y][x].type === 'wall') grid[y][x].type = 'corridor';
}

function shuffle<T>(arr: T[]) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

export function isWalkable(maze: Maze, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= maze.width || y >= maze.height) return false;
  const t = maze.grid[y][x].type;
  return t === 'room' || t === 'corridor' || t === 'entrance' || t === 'exit' || t === 'chest';
}

export function cellToPixel(x: number, y: number): { px: number; py: number } {
  return {
    px: x * CELL_PIXEL + CELL_PIXEL / 2,
    py: y * CELL_PIXEL + CELL_PIXEL / 2
  };
}
