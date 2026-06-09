import { CellType, MazeGrid, Crystal } from '../types';

export interface GeneratedMaze {
  grid: MazeGrid;
  startX: number;
  startY: number;
  crystals: Crystal[];
  trapPositions: { x: number; y: number }[];
}

const MAX_GRID_SIZE = 15;

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function createBaseMaze(size: number): MazeGrid {
  const grid: MazeGrid = [];
  for (let y = 0; y < size; y++) {
    const row: CellType[] = [];
    for (let x = 0; x < size; x++) {
      row.push(CellType.WALL);
    }
    grid.push(row);
  }
  return grid;
}

function carvePassages(grid: MazeGrid, startX: number, startY: number): void {
  const size = grid.length;
  const stack: [number, number][] = [[startX, startY]];
  grid[startY][startX] = CellType.EMPTY;

  const directions: [number, number][] = [
    [0, -2],
    [0, 2],
    [-2, 0],
    [2, 0],
  ];

  while (stack.length > 0) {
    const [cx, cy] = stack[stack.length - 1];
    const dirs = shuffle([...directions]);
    let carved = false;

    for (const [dx, dy] of dirs) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx > 0 && nx < size - 1 && ny > 0 && ny < size - 1 && grid[ny][nx] === CellType.WALL) {
        grid[cy + dy / 2][cx + dx / 2] = CellType.EMPTY;
        grid[ny][nx] = CellType.EMPTY;
        stack.push([nx, ny]);
        carved = true;
        break;
      }
    }

    if (!carved) {
      stack.pop();
    }
  }
}

function collectEmptyCells(grid: MazeGrid): { x: number; y: number }[] {
  const cells: { x: number; y: number }[] = [];
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[0].length; x++) {
      if (grid[y][x] === CellType.EMPTY) {
        cells.push({ x, y });
      }
    }
  }
  return cells;
}

function bfsReachable(
  grid: MazeGrid,
  sx: number,
  sy: number,
  passable: (c: CellType) => boolean,
): boolean[][] {
  const size = grid.length;
  const visited: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
  const queue: [number, number][] = [[sx, sy]];
  visited[sy][sx] = true;
  const dirs: [number, number][] = [
    [0, -1],
    [0, 1],
    [-1, 0],
    [1, 0],
  ];
  while (queue.length > 0) {
    const [cx, cy] = queue.shift()!;
    for (const [dx, dy] of dirs) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (
        nx >= 0 &&
        nx < size &&
        ny >= 0 &&
        ny < size &&
        !visited[ny][nx] &&
        passable(grid[ny][nx])
      ) {
        visited[ny][nx] = true;
        queue.push([nx, ny]);
      }
    }
  }
  return visited;
}

function manhattan(x1: number, y1: number, x2: number, y2: number): number {
  return Math.abs(x1 - x2) + Math.abs(y1 - y2);
}

export function generateMaze(level: number): GeneratedMaze {
  const baseSize = 9 + Math.min(level - 1, 6);
  const gridSize = Math.min(baseSize + (baseSize % 2 === 0 ? 1 : 0), MAX_GRID_SIZE);

  const grid = createBaseMaze(gridSize);
  const startX = 1;
  const startY = 1;
  carvePassages(grid, startX, startY);

  const reach = bfsReachable(grid, startX, startY, (c) => c === CellType.EMPTY);
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      if (grid[y][x] === CellType.EMPTY && !reach[y][x]) {
        grid[y][x] = CellType.WALL;
      }
    }
  }

  const emptyCells = collectEmptyCells(grid).filter(
    (c) => !(c.x === startX && c.y === startY),
  );
  shuffle(emptyCells);

  const crystalCount = 3 + Math.min(level - 1, 2);
  const crystals: Crystal[] = [];
  const usedPositions = new Set<string>();

  for (const cell of emptyCells) {
    if (crystals.length >= crystalCount) break;
    const key = `${cell.x},${cell.y}`;
    if (usedPositions.has(key)) continue;
    const minDist = 3;
    let ok = true;
    for (const c of crystals) {
      if (manhattan(c.x, c.y, cell.x, cell.y) < minDist) {
        ok = false;
        break;
      }
    }
    if (manhattan(startX, startY, cell.x, cell.y) < 3) ok = false;
    if (!ok) continue;
    crystals.push({
      x: cell.x,
      y: cell.y,
      activated: false,
      glowPhase: Math.random() * Math.PI * 2,
    });
    grid[cell.y][cell.x] = CellType.CRYSTAL;
    usedPositions.add(key);
  }

  const trapCount = 3 + Math.floor(level * 1.2);
  const trapPositions: { x: number; y: number }[] = [];
  for (const cell of emptyCells) {
    if (trapPositions.length >= trapCount) break;
    const key = `${cell.x},${cell.y}`;
    if (usedPositions.has(key)) continue;
    if (manhattan(startX, startY, cell.x, cell.y) < 4) continue;
    grid[cell.y][cell.x] = CellType.TRAP;
    trapPositions.push({ x: cell.x, y: cell.y });
    usedPositions.add(key);
  }

  grid[startY][startX] = CellType.START;

  return {
    grid,
    startX,
    startY,
    crystals,
    trapPositions,
  };
}

export function findFarthestEmpty(
  grid: MazeGrid,
  sx: number,
  sy: number,
): { x: number; y: number } | null {
  const size = grid.length;
  const dist: number[][] = Array.from({ length: size }, () => Array(size).fill(-1));
  const queue: [number, number][] = [[sx, sy]];
  dist[sy][sx] = 0;
  const dirs: [number, number][] = [
    [0, -1],
    [0, 1],
    [-1, 0],
    [1, 0],
  ];
  let farthest: { x: number; y: number; d: number } = { x: sx, y: sy, d: 0 };
  while (queue.length > 0) {
    const [cx, cy] = queue.shift()!;
    if (dist[cy][cx] > farthest.d) {
      farthest = { x: cx, y: cy, d: dist[cy][cx] };
    }
    for (const [dx, dy] of dirs) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (
        nx >= 0 &&
        nx < size &&
        ny >= 0 &&
        ny < size &&
        dist[ny][nx] === -1 &&
        (grid[ny][nx] === CellType.VINE ||
          grid[ny][nx] === CellType.EMPTY ||
          grid[ny][nx] === CellType.START ||
          grid[ny][nx] === CellType.CRYSTAL)
      ) {
        dist[ny][nx] = dist[cy][cx] + 1;
        queue.push([nx, ny]);
      }
    }
  }
  if (farthest.d === 0) return null;
  return { x: farthest.x, y: farthest.y };
}

export function findNearestTrap(
  grid: MazeGrid,
  cx: number,
  cy: number,
  allTraps: { x: number; y: number }[],
): { x: number; y: number } | null {
  let nearest: { x: number; y: number } | null = null;
  let bestDist = Infinity;
  for (const t of allTraps) {
    if (grid[t.y][t.x] !== CellType.TRAP) continue;
    const d = manhattan(cx, cy, t.x, t.y);
    if (d < bestDist) {
      bestDist = d;
      nearest = t;
    }
  }
  return nearest;
}
