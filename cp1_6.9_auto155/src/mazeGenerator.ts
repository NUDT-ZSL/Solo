import {
  HexCell,
  HexCoord,
  HexKey,
  MazeData,
  SealColor,
  SealPosition,
  SEAL_COLORS,
} from './types';
import {
  generateHexGrid,
  hexDistance,
  hexEquals,
  hexKey,
  hexNeighbor,
  HEX_DIRS,
} from './utils/hexMath';

const MAZE_RADIUS = 4;
const TARGET_CELLS = 120;
const SEAL_COUNT = 6;
const MIN_SEAL_DISTANCE = 4;

function getOppositeDir(dir: number): number {
  return (dir + 3) % 6;
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function findRadiusForTargetCells(target: number): number {
  let r = 1;
  while (true) {
    const count = 1 + 3 * r * (r + 1);
    if (count >= target) return r;
    r++;
  }
}

export function generateMaze(): MazeData {
  const radius = findRadiusForTargetCells(TARGET_CELLS);
  const coords = generateHexGrid(radius);

  const cellMap = new Map<HexKey, HexCell>();
  for (const c of coords) {
    cellMap.set(hexKey(c), {
      coord: { ...c },
      walls: [true, true, true, true, true, true],
      sealColor: null,
      activated: false,
      activatedColor: null,
      isExit: false,
    });
  }

  const visited = new Set<HexKey>();
  const startCoord = coords[Math.floor(Math.random() * coords.length)];
  visited.add(hexKey(startCoord));

  let iterations = 0;
  const maxIterations = coords.length * 100;

  while (visited.size < coords.length && iterations < maxIterations) {
    iterations++;
    const unvisited = coords.filter((c) => !visited.has(hexKey(c)));
    if (unvisited.length === 0) break;

    let current = unvisited[Math.floor(Math.random() * unvisited.length)];
    const path: { coord: HexCoord; dirFromPrev: number | null }[] = [
      { coord: current, dirFromPrev: null },
    ];
    const pathMap = new Map<HexKey, number>();
    pathMap.set(hexKey(current), 0);

    let reachedVisited = false;
    let localIterations = 0;
    while (!reachedVisited && localIterations < coords.length * 50) {
      localIterations++;
      const dirs = shuffleArray([0, 1, 2, 3, 4, 5]);
      let moved = false;
      for (const dir of dirs) {
        const neighbor = hexNeighbor(current, dir);
        const nk = hexKey(neighbor);
        if (!cellMap.has(nk)) continue;
        if (pathMap.has(nk)) continue;

        current = neighbor;
        path.push({ coord: current, dirFromPrev: dir });
        pathMap.set(nk, path.length - 1);
        moved = true;

        if (visited.has(nk)) {
          reachedVisited = true;
        }
        break;
      }

      if (!moved) {
        if (path.length <= 1) break;
        path.pop();
        const prev = path[path.length - 1];
        pathMap.delete(hexKey(current));
        current = prev.coord;
      }
    }

    if (reachedVisited) {
      for (let i = 0; i < path.length - 1; i++) {
        const from = path[i].coord;
        const to = path[i + 1].coord;
        const dirFromPrev = path[i + 1].dirFromPrev!;
        const fromCell = cellMap.get(hexKey(from))!;
        const toCell = cellMap.get(hexKey(to))!;
        fromCell.walls[dirFromPrev] = false;
        toCell.walls[getOppositeDir(dirFromPrev)] = false;
        visited.add(hexKey(from));
      }
      visited.add(hexKey(path[path.length - 1].coord));
    }
  }

  const centerCoord: HexCoord = { q: 0, r: 0 };

  const seals: SealPosition[] = [];
  const cellList = Array.from(cellMap.values());
  const shuffledCells = shuffleArray(cellList);

  for (let ci = 0; ci < shuffledCells.length && seals.length < SEAL_COUNT; ci++) {
    const candidate = shuffledCells[ci].coord;
    let valid = true;
    for (const s of seals) {
      if (hexDistance(candidate, s.coord) < MIN_SEAL_DISTANCE) {
        valid = false;
        break;
      }
    }
    if (hexDistance(candidate, centerCoord) < 2) valid = false;
    if (valid) {
      const color: SealColor = SEAL_COLORS[seals.length];
      seals.push({ coord: { ...candidate }, color, collected: false });
      const cell = cellMap.get(hexKey(candidate))!;
      cell.sealColor = color;
    }
  }

  let fallbackIdx = 0;
  while (seals.length < SEAL_COUNT && fallbackIdx < shuffledCells.length) {
    const candidate = shuffledCells[fallbackIdx].coord;
    const alreadyHas = seals.some((s) => hexEquals(s.coord, candidate));
    if (!alreadyHas && !hexEquals(candidate, centerCoord)) {
      const color: SealColor = SEAL_COLORS[seals.length];
      seals.push({ coord: { ...candidate }, color, collected: false });
      const cell = cellMap.get(hexKey(candidate))!;
      cell.sealColor = color;
    }
    fallbackIdx++;
  }

  return {
    cells: Array.from(cellMap.values()),
    radius,
    center: centerCoord,
    seals,
    exitCoord: null,
  };
}

export function pickExitCell(maze: MazeData): HexCoord {
  const boundaryCells = maze.cells.filter((cell) => {
    let isBoundary = false;
    for (let dir = 0; dir < 6; dir++) {
      const nb = hexNeighbor(cell.coord, dir);
      if (!maze.cells.some((c) => hexEquals(c.coord, nb))) {
        isBoundary = true;
        break;
      }
    }
    return isBoundary;
  });
  const choice = boundaryCells[Math.floor(Math.random() * boundaryCells.length)];
  return choice.coord;
}

export function getCellByCoord(maze: MazeData, coord: HexCoord): HexCell | undefined {
  return maze.cells.find((c) => hexEquals(c.coord, coord));
}

export function canMoveBetween(
  maze: MazeData,
  from: HexCoord,
  to: HexCoord
): boolean {
  const fromCell = getCellByCoord(maze, from);
  const toCell = getCellByCoord(maze, to);
  if (!fromCell || !toCell) return false;
  let dir = -1;
  for (let d = 0; d < 6; d++) {
    const nb = hexNeighbor(from, d);
    if (hexEquals(nb, to)) {
      dir = d;
      break;
    }
  }
  if (dir === -1) return false;
  return !fromCell.walls[dir];
}

export function getAdjacentDirection(
  from: HexCoord,
  to: HexCoord
): number | null {
  for (let d = 0; d < 6; d++) {
    const nb = hexNeighbor(from, d);
    if (hexEquals(nb, to)) return d;
  }
  return null;
}

export { HEX_DIRS };
