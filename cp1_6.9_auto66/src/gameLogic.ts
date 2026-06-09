export type Direction = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface Cell {
  x: number;
  y: number;
  direction: Direction;
  targetDirection: Direction;
  isCenter: boolean;
  unlocked: boolean;
  rotating: boolean;
  rotationProgress: number;
  highlighted: boolean;
  scale: number;
  clickAnim: number;
}

export interface Board {
  size: number;
  cells: Cell[][];
  level: number;
  presolved: boolean;
  initialDirections: Direction[][];
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  hueStart: string;
  hueEnd: string;
  size: number;
}

export const DIR_VECTORS: Array<{ dx: number; dy: number }> = [
  { dx: 0, dy: -1 },
  { dx: 1, dy: -1 },
  { dx: 1, dy: 0 },
  { dx: 1, dy: 1 },
  { dx: 0, dy: 1 },
  { dx: -1, dy: 1 },
  { dx: -1, dy: 0 },
  { dx: -1, dy: -1 },
];

function rotateCW90(dir: Direction): Direction {
  return ((dir + 2) % 8) as Direction;
}

function oppositeDir(dir: Direction): Direction {
  return ((dir + 4) % 8) as Direction;
}

type PresetTarget = Direction[][];

const PRESET_1: PresetTarget = [
  [2, 2, 5],
  [3, 0, 4],
  [6, 6, 6],
];
const PRESET_2: PresetTarget = [
  [2, 2, 4],
  [0, 3, 4],
  [3, 6, 7],
];
const PRESET_3: PresetTarget = [
  [2, 2, 5],
  [4, 0, 4],
  [4, 2, 7],
];

const PUZZLE_PRESETS: PresetTarget[] = [PRESET_1, PRESET_2, PRESET_3];

function cloneCells(cells: Cell[][]): Cell[][] {
  return cells.map(row => row.map(cell => ({ ...cell })));
}

function randomDir(): Direction {
  return Math.floor(Math.random() * 8) as Direction;
}

function randomDirExcept(exclude: Direction): Direction {
  let d: Direction;
  do {
    d = randomDir();
  } while (d === exclude);
  return d;
}

function createCell(
  x: number,
  y: number,
  size: number,
  targetDirection: Direction
): Cell {
  const cx = Math.floor(size / 2);
  const cy = Math.floor(size / 2);
  return {
    x,
    y,
    direction: randomDir(),
    targetDirection,
    isCenter: x === cx && y === cy,
    unlocked: false,
    rotating: false,
    rotationProgress: 0,
    highlighted: false,
    scale: 1,
    clickAnim: 0,
  };
}

export function generateBoard(level: number = 1): Board {
  const size = 3;
  const preset = PUZZLE_PRESETS[Math.floor(Math.random() * PUZZLE_PRESETS.length)];
  const cells: Cell[][] = [];
  const initialDirections: Direction[][] = [];

  for (let y = 0; y < size; y++) {
    cells[y] = [];
    initialDirections[y] = [];
    for (let x = 0; x < size; x++) {
      const cell = createCell(x, y, size, preset[y][x]);
      if (cell.isCenter) {
        cell.direction = cell.targetDirection;
      }
      initialDirections[y][x] = cell.direction;
      cells[y][x] = cell;
    }
  }

  return {
    size,
    cells,
    level,
    presolved: false,
    initialDirections,
  };
}

export function rotateCell(board: Board, x: number, y: number): Board {
  if (board.presolved) return board;
  const cell = board.cells[y]?.[x];
  if (!cell || cell.isCenter || cell.rotating) return board;

  const newCells = cloneCells(board.cells);
  const target = newCells[y][x];
  target.rotating = true;
  target.rotationProgress = 0;
  target.clickAnim = 1;
  target.direction = rotateCW90(target.direction);

  return {
    ...board,
    cells: newCells,
  };
}

export function updateAnimations(
  board: Board,
  dt: number
): { board: Board; rotationCompleted: { x: number; y: number }[] } {
  const newCells = cloneCells(board.cells);
  const completed: { x: number; y: number }[] = [];
  const ROTATE_DURATION = 0.3;
  const CLICK_DURATION = 0.1;

  for (let y = 0; y < board.size; y++) {
    for (let x = 0; x < board.size; x++) {
      const cell = newCells[y][x];
      if (cell.rotating) {
        cell.rotationProgress += dt / ROTATE_DURATION;
        if (cell.rotationProgress >= 1) {
          cell.rotationProgress = 0;
          cell.rotating = false;
          completed.push({ x, y });
        }
      }
      if (cell.clickAnim > 0) {
        cell.clickAnim = Math.max(0, cell.clickAnim - dt / CLICK_DURATION);
      }
      const t = cell.clickAnim;
      cell.scale = 1 + 0.1 * (t > 0.5 ? (1 - t) * 2 : t * 2);
    }
  }

  return {
    board: { ...board, cells: newCells },
    rotationCompleted: completed,
  };
}

export function checkPath(board: Board): boolean {
  const { size, cells } = board;
  const cx = Math.floor(size / 2);
  const cy = Math.floor(size / 2);
  const total = size * size;
  const visited = new Set<string>();
  let curX = cx;
  let curY = cy;
  let steps = 0;

  while (steps < total) {
    const key = `${curX},${curY}`;
    if (visited.has(key)) return false;
    visited.add(key);
    steps++;

    const cell = cells[curY][curX];
    const { dx, dy } = DIR_VECTORS[cell.direction];
    const nx = curX + dx;
    const ny = curY + dy;

    if (steps === total) {
      return nx === cx && ny === cy;
    }

    if (nx < 0 || nx >= size || ny < 0 || ny >= size) return false;
    if (visited.has(`${nx},${ny}`) && !(nx === cx && ny === cy)) return false;

    curX = nx;
    curY = ny;
  }

  return false;
}

export function markUnlocked(board: Board): Board {
  const newCells = cloneCells(board.cells);
  for (let y = 0; y < board.size; y++) {
    for (let x = 0; x < board.size; x++) {
      newCells[y][x].unlocked = true;
      newCells[y][x].highlighted = false;
    }
  }
  return { ...board, cells: newCells, presolved: true };
}

export function expandBoard(prev: Board): Board {
  const newLevel = prev.level + 1;
  if (newLevel > 3) return prev;

  const newSize = prev.size + 2;
  const offset = 1;
  const newCells: Cell[][] = [];
  const initialDirs: Direction[][] = [];

  for (let y = 0; y < newSize; y++) {
    newCells[y] = [];
    initialDirs[y] = [];
    for (let x = 0; x < newSize; x++) {
      const inOld =
        x >= offset &&
        x < offset + prev.size &&
        y >= offset &&
        y < offset + prev.size;

      if (inOld) {
        const oc = prev.cells[y - offset][x - offset];
        const nc: Cell = {
          x,
          y,
          direction: oc.unlocked ? oc.targetDirection : oc.direction,
          targetDirection: oc.targetDirection,
          isCenter: x === Math.floor(newSize / 2) && y === Math.floor(newSize / 2),
          unlocked: false,
          rotating: false,
          rotationProgress: 0,
          highlighted: false,
          scale: 1,
          clickAnim: 0,
        };
        newCells[y][x] = nc;
        initialDirs[y][x] = nc.direction;
      } else {
        let td: Direction;
        const neighbors: { dx: number; dy: number }[] = [
          { dx: 0, dy: -1 },
          { dx: 1, dy: 0 },
          { dx: 0, dy: 1 },
          { dx: -1, dy: 0 },
        ];
        let adjacent: Cell | null = null;
        for (const n of neighbors) {
          const ax = x + n.dx;
          const ay = y + n.dy;
          if (
            ax >= 0 &&
            ax < newSize &&
            ay >= 0 &&
            ay < newSize &&
            newCells[ay] &&
            newCells[ay][ax]
          ) {
            adjacent = newCells[ay][ax];
            break;
          }
        }

        if (adjacent && Math.random() < 0.5) {
          td = oppositeDir(adjacent.direction);
        } else {
          td = randomDir();
        }

        if (x === 0) {
          if (td === 6 || td === 5 || td === 7) td = randomDirExcept(td);
        }
        if (x === newSize - 1) {
          if (td === 2 || td === 1 || td === 3) td = randomDirExcept(td);
        }
        if (y === 0) {
          if (td === 0 || td === 1 || td === 7) td = randomDirExcept(td);
        }
        if (y === newSize - 1) {
          if (td === 4 || td === 3 || td === 5) td = randomDirExcept(td);
        }

        const nc = createCell(x, y, newSize, td);
        newCells[y][x] = nc;
        initialDirs[y][x] = nc.direction;
      }
    }
  }

  const centerX = Math.floor(newSize / 2);
  const centerY = Math.floor(newSize / 2);
  const cc = newCells[centerY][centerX];
  cc.direction = cc.targetDirection;
  initialDirs[centerY][centerX] = cc.direction;

  return {
    size: newSize,
    cells: newCells,
    level: newLevel,
    presolved: false,
    initialDirections: initialDirs,
  };
}

export function resetBoard(board: Board): Board {
  const newCells = cloneCells(board.cells);
  for (let y = 0; y < board.size; y++) {
    for (let x = 0; x < board.size; x++) {
      const c = newCells[y][x];
      c.direction = board.initialDirections[y][x];
      c.unlocked = false;
      c.rotating = false;
      c.rotationProgress = 0;
      c.highlighted = false;
      c.scale = 1;
      c.clickAnim = 0;
    }
  }
  return {
    ...board,
    cells: newCells,
    presolved: false,
  };
}

export function getHintCell(board: Board): { x: number; y: number } | null {
  const mismatched: { x: number; y: number }[] = [];
  for (let y = 0; y < board.size; y++) {
    for (let x = 0; x < board.size; x++) {
      const c = board.cells[y][x];
      if (!c.isCenter && c.direction !== c.targetDirection && !c.unlocked) {
        mismatched.push({ x, y });
      }
    }
  }
  if (mismatched.length === 0) return null;
  return mismatched[Math.floor(Math.random() * mismatched.length)];
}

export function highlightCell(
  board: Board,
  pos: { x: number; y: number } | null
): Board {
  const newCells = cloneCells(board.cells);
  for (let y = 0; y < board.size; y++) {
    for (let x = 0; x < board.size; x++) {
      newCells[y][x].highlighted =
        pos !== null && x === pos.x && y === pos.y;
    }
  }
  return { ...board, cells: newCells };
}

export function clearHighlights(board: Board): Board {
  return highlightCell(board, null);
}

let _particleId = 0;

export function spawnUnlockParticles(
  centerX: number,
  centerY: number,
  count: number = 30
): Particle[] {
  const arr: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 50 + Math.random() * 150;
    arr.push({
      id: ++_particleId,
      x: centerX,
      y: centerY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      maxLife: 1.5,
      hueStart: '#FF6B6B',
      hueEnd: '#4ECDC4',
      size: 3 + Math.random() * 4,
    });
  }
  return arr;
}

export function spawnVictoryParticles(
  centerX: number,
  centerY: number,
  count: number = 80
): Particle[] {
  const arr: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 80 + Math.random() * 250;
    arr.push({
      id: ++_particleId,
      x: centerX + (Math.random() - 0.5) * 200,
      y: centerY + (Math.random() - 0.5) * 200,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 100,
      life: 1,
      maxLife: 3 + Math.random() * 2,
      hueStart: ['#FF6B6B', '#4ECDC4', '#FFE66D', '#A78BFA', '#66FCF1'][
        Math.floor(Math.random() * 5)
      ],
      hueEnd: '#FFFFFF',
      size: 2 + Math.random() * 5,
    });
  }
  return arr;
}

export function updateParticles(
  particles: Particle[],
  dt: number,
  gravity: number = 30,
  maxParticles: number = 100
): Particle[] {
  const result: Particle[] = [];
  const start = Math.max(0, particles.length - maxParticles);
  for (let i = start; i < particles.length; i++) {
    const p = { ...particles[i] };
    p.vy += gravity * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt / p.maxLife;
    if (p.life > 0) result.push(p);
  }
  return result;
}
