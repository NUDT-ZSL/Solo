export interface Wall {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PlatformData {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FragmentData {
  x: number;
  y: number;
}

export interface GuardData {
  x: number;
  y: number;
  patrolPoints: { x: number; y: number }[];
  speed: number;
}

export interface LevelData {
  walls: Wall[];
  platforms: PlatformData[];
  fragments: FragmentData[];
  guards: GuardData[];
  startX: number;
  startY: number;
  requiredFragments: number;
  portalX: number;
  portalY: number;
}

const GRID_SIZE = 10;
const CELL_WIDTH = 80;
const CELL_HEIGHT = 60;
const WALL_THICKNESS = 20;
const OFFSET_X = 0;
const OFFSET_Y = 0;

type Cell = {
  x: number;
  y: number;
  visited: boolean;
  walls: { top: boolean; right: boolean; bottom: boolean; left: boolean };
};

function generateMazeGrid(): Cell[][] {
  const grid: Cell[][] = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    grid[y] = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      grid[y][x] = {
        x,
        y,
        visited: false,
        walls: { top: true, right: true, bottom: true, left: true }
      };
    }
  }

  const stack: Cell[] = [];
  const start = grid[0][0];
  start.visited = true;
  stack.push(start);

  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const neighbors: { cell: Cell; dir: string }[] = [];

    const { x, y } = current;
    if (y > 0 && !grid[y - 1][x].visited) {
      neighbors.push({ cell: grid[y - 1][x], dir: 'top' });
    }
    if (x < GRID_SIZE - 1 && !grid[y][x + 1].visited) {
      neighbors.push({ cell: grid[y][x + 1], dir: 'right' });
    }
    if (y < GRID_SIZE - 1 && !grid[y + 1][x].visited) {
      neighbors.push({ cell: grid[y + 1][x], dir: 'bottom' });
    }
    if (x > 0 && !grid[y][x - 1].visited) {
      neighbors.push({ cell: grid[y][x - 1], dir: 'left' });
    }

    if (neighbors.length > 0) {
      const { cell: next, dir } = neighbors[Math.floor(Math.random() * neighbors.length)];
      if (dir === 'top') {
        current.walls.top = false;
        next.walls.bottom = false;
      } else if (dir === 'right') {
        current.walls.right = false;
        next.walls.left = false;
      } else if (dir === 'bottom') {
        current.walls.bottom = false;
        next.walls.top = false;
      } else if (dir === 'left') {
        current.walls.left = false;
        next.walls.right = false;
      }
      next.visited = true;
      stack.push(next);
    } else {
      stack.pop();
    }
  }

  return grid;
}

function gridToWalls(grid: Cell[][]): Wall[] {
  const walls: Wall[] = [];
  const passageWidth = CELL_WIDTH - WALL_THICKNESS;
  const passageHeight = CELL_HEIGHT - WALL_THICKNESS;

  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const cell = grid[y][x];
      const cx = OFFSET_X + x * CELL_WIDTH;
      const cy = OFFSET_Y + y * CELL_HEIGHT;

      if (cell.walls.top) {
        walls.push({
          x: cx,
          y: cy,
          width: CELL_WIDTH,
          height: WALL_THICKNESS
        });
      }
      if (cell.walls.left) {
        walls.push({
          x: cx,
          y: cy,
          width: WALL_THICKNESS,
          height: CELL_HEIGHT
        });
      }
      if (y === GRID_SIZE - 1 && cell.walls.bottom) {
        walls.push({
          x: cx,
          y: cy + CELL_HEIGHT - WALL_THICKNESS,
          width: CELL_WIDTH,
          height: WALL_THICKNESS
        });
      }
      if (x === GRID_SIZE - 1 && cell.walls.right) {
        walls.push({
          x: cx + CELL_WIDTH - WALL_THICKNESS,
          y: cy,
          width: WALL_THICKNESS,
          height: CELL_HEIGHT
        });
      }
    }
  }

  return walls;
}

function getCellCenter(x: number, y: number): { x: number; y: number } {
  return {
    x: OFFSET_X + x * CELL_WIDTH + CELL_WIDTH / 2,
    y: OFFSET_Y + y * CELL_HEIGHT + CELL_HEIGHT / 2
  };
}

function getRandomEmptyCell(grid: Cell[][], usedCells: Set<string>): { x: number; y: number } | null {
  const available: { x: number; y: number }[] = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const key = `${x},${y}`;
      if (!usedCells.has(key)) {
        available.push({ x, y });
      }
    }
  }
  if (available.length === 0) return null;
  return available[Math.floor(Math.random() * available.length)];
}

function hasPath(grid: Cell[][], sx: number, sy: number, ex: number, ey: number): boolean {
  const visited = new Set<string>();
  const queue: { x: number; y: number }[] = [{ x: sx, y: sy }];
  visited.add(`${sx},${sy}`);

  while (queue.length > 0) {
    const { x, y } = queue.shift()!;
    if (x === ex && y === ey) return true;
    const cell = grid[y][x];

    if (!cell.walls.top && y > 0 && !visited.has(`${x},${y - 1}`)) {
      visited.add(`${x},${y - 1}`);
      queue.push({ x, y: y - 1 });
    }
    if (!cell.walls.right && x < GRID_SIZE - 1 && !visited.has(`${x + 1},${y}`)) {
      visited.add(`${x + 1},${y}`);
      queue.push({ x: x + 1, y });
    }
    if (!cell.walls.bottom && y < GRID_SIZE - 1 && !visited.has(`${x},${y + 1}`)) {
      visited.add(`${x},${y + 1}`);
      queue.push({ x, y: y + 1 });
    }
    if (!cell.walls.left && x > 0 && !visited.has(`${x - 1},${y}`)) {
      visited.add(`${x - 1},${y}`);
      queue.push({ x: x - 1, y });
    }
  }
  return false;
}

function generatePatrolPath(
  grid: Cell[][],
  startX: number,
  startY: number,
  length: number
): { x: number; y: number }[] {
  const path: { x: number; y: number }[] = [];
  let cx = startX;
  let cy = startY;
  const visited = new Set<string>();
  visited.add(`${cx},${cy}`);
  path.push(getCellCenter(cx, cy));

  for (let i = 0; i < length; i++) {
    const cell = grid[cy][cx];
    const options: { x: number; y: number }[] = [];
    if (!cell.walls.top && cy > 0 && !visited.has(`${cx},${cy - 1}`)) {
      options.push({ x: cx, y: cy - 1 });
    }
    if (!cell.walls.right && cx < GRID_SIZE - 1 && !visited.has(`${cx + 1},${cy}`)) {
      options.push({ x: cx + 1, y: cy });
    }
    if (!cell.walls.bottom && cy < GRID_SIZE - 1 && !visited.has(`${cx},${cy + 1}`)) {
      options.push({ x: cx, y: cy + 1 });
    }
    if (!cell.walls.left && cx > 0 && !visited.has(`${cx - 1},${cy}`)) {
      options.push({ x: cx - 1, y: cy });
    }

    if (options.length === 0) break;
    const next = options[Math.floor(Math.random() * options.length)];
    cx = next.x;
    cy = next.y;
    visited.add(`${cx},${cy}`);
    path.push(getCellCenter(cx, cy));
  }

  return path;
}

export function generateLevel(level: number): LevelData {
  const grid = generateMazeGrid();
  const walls = gridToWalls(grid);

  const usedCells = new Set<string>();

  const startCell = { x: 0, y: 0 };
  usedCells.add(`${startCell.x},${startCell.y}`);
  const start = getCellCenter(startCell.x, startCell.y);

  let endCell = { x: GRID_SIZE - 1, y: GRID_SIZE - 1 };
  while (!hasPath(grid, startCell.x, startCell.y, endCell.x, endCell.y)) {
    endCell = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE)
    };
  }
  usedCells.add(`${endCell.x},${endCell.y}`);
  const portal = getCellCenter(endCell.x, endCell.y);

  const platformCount = 5 + level + Math.floor(Math.random() * 3);
  const platforms: PlatformData[] = [];
  for (let i = 0; i < platformCount; i++) {
    const cell = getRandomEmptyCell(grid, usedCells);
    if (!cell) break;
    usedCells.add(`${cell.x},${cell.y}`);
    const center = getCellCenter(cell.x, cell.y);
    const size = 40 + Math.floor(Math.random() * 41);
    platforms.push({
      x: center.x - size / 2,
      y: center.y - size / 2,
      width: size,
      height: size
    });
  }

  const fragmentCount = 3 + Math.floor(Math.random() * 3);
  const fragments: FragmentData[] = [];
  for (let i = 0; i < fragmentCount; i++) {
    const cell = getRandomEmptyCell(grid, usedCells);
    if (!cell) break;
    usedCells.add(`${cell.x},${cell.y}`);
    const center = getCellCenter(cell.x, cell.y);
    fragments.push({ x: center.x, y: center.y });
  }

  const guardCount = 2 + Math.floor(Math.random() * 2);
  const guards: GuardData[] = [];
  const baseSpeed = 50 * (1 + (level - 1) * 0.1);
  for (let i = 0; i < guardCount; i++) {
    let cell = getRandomEmptyCell(grid, usedCells);
    if (!cell) {
      cell = { x: Math.floor(Math.random() * GRID_SIZE), y: Math.floor(Math.random() * GRID_SIZE) };
    }
    usedCells.add(`${cell.x},${cell.y}`);
    const patrolPoints = generatePatrolPath(grid, cell.x, cell.y, 3 + Math.floor(Math.random() * 3));
    guards.push({
      x: patrolPoints[0].x,
      y: patrolPoints[0].y,
      patrolPoints,
      speed: baseSpeed
    });
  }

  const requiredFragments = 10 + (level - 1) * 5;

  return {
    walls,
    platforms,
    fragments,
    guards,
    startX: start.x,
    startY: start.y,
    requiredFragments,
    portalX: portal.x,
    portalY: portal.y
  };
}
