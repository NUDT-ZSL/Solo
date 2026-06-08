export interface CellWalls {
  top: boolean;
  right: boolean;
  bottom: boolean;
  left: boolean;
}

export interface Cell {
  row: number;
  col: number;
  walls: CellWalls;
  hasSwitch: boolean;
  switchDoorId: number;
  isStart: boolean;
  isEnd: boolean;
}

export interface DoorInfo {
  row: number;
  col: number;
  side: 'top' | 'right' | 'bottom' | 'left';
  id: number;
}

export interface SwitchInfo {
  row: number;
  col: number;
  doorId: number;
}

export interface MazeData {
  rows: number;
  cols: number;
  cells: Cell[][];
  doors: DoorInfo[];
  switches: SwitchInfo[];
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}

function createCells(rows: number, cols: number): Cell[][] {
  const cells: Cell[][] = [];
  for (let r = 0; r < rows; r++) {
    cells[r] = [];
    for (let c = 0; c < cols; c++) {
      cells[r][c] = {
        row: r,
        col: c,
        walls: { top: true, right: true, bottom: true, left: true },
        hasSwitch: false,
        switchDoorId: -1,
        isStart: false,
        isEnd: false,
      };
    }
  }
  return cells;
}

function getUnvisitedNeighbors(r: number, c: number, rows: number, cols: number, visited: boolean[][]): [number, number][] {
  const neighbors: [number, number][] = [];
  if (r > 0 && !visited[r - 1][c]) neighbors.push([r - 1, c]);
  if (r < rows - 1 && !visited[r + 1][c]) neighbors.push([r + 1, c]);
  if (c > 0 && !visited[r][c - 1]) neighbors.push([r, c - 1]);
  if (c < cols - 1 && !visited[r][c + 1]) neighbors.push([r, c + 1]);
  return neighbors;
}

function removeWallBetween(cells: Cell[][], r1: number, c1: number, r2: number, c2: number): void {
  if (r2 === r1 - 1) { cells[r1][c1].walls.top = false; cells[r2][c2].walls.bottom = false; }
  else if (r2 === r1 + 1) { cells[r1][c1].walls.bottom = false; cells[r2][c2].walls.top = false; }
  else if (c2 === c1 - 1) { cells[r1][c1].walls.left = false; cells[r2][c2].walls.right = false; }
  else if (c2 === c1 + 1) { cells[r1][c1].walls.right = false; cells[r2][c2].walls.left = false; }
}

function generateMazeDFS(cells: Cell[][], rows: number, cols: number): void {
  const visited: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false));
  const stack: [number, number][] = [[0, 0]];
  visited[0][0] = true;

  while (stack.length > 0) {
    const [cr, cc] = stack[stack.length - 1];
    const neighbors = getUnvisitedNeighbors(cr, cc, rows, cols, visited);
    if (neighbors.length === 0) {
      stack.pop();
    } else {
      const [nr, nc] = neighbors[Math.floor(Math.random() * neighbors.length)];
      removeWallBetween(cells, cr, cc, nr, nc);
      visited[nr][nc] = true;
      stack.push([nr, nc]);
    }
  }
}

function addExtraPassages(cells: Cell[][], rows: number, cols: number, count: number): void {
  let added = 0;
  let attempts = 0;
  while (added < count && attempts < count * 10) {
    attempts++;
    const r = Math.floor(Math.random() * rows);
    const c = Math.floor(Math.random() * cols);
    const sides: ('top' | 'right' | 'bottom' | 'left')[] = [];
    if (r > 0 && cells[r][c].walls.top) sides.push('top');
    if (r < rows - 1 && cells[r][c].walls.bottom) sides.push('bottom');
    if (c > 0 && cells[r][c].walls.left) sides.push('left');
    if (c < cols - 1 && cells[r][c].walls.right) sides.push('right');
    if (sides.length === 0) continue;
    const side = sides[Math.floor(Math.random() * sides.length)];
    const nr = side === 'top' ? r - 1 : side === 'bottom' ? r + 1 : r;
    const nc = side === 'left' ? c - 1 : side === 'right' ? c + 1 : c;
    removeWallBetween(cells, r, c, nr, nc);
    added++;
  }
}

function bfsReachable(cells: Cell[][], rows: number, cols: number, startR: number, startC: number, blockedDoor?: DoorInfo): boolean[][] {
  const reachable: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false));
  const queue: [number, number][] = [[startR, startC]];
  reachable[startR][startC] = true;

  const isBlocked = (r: number, c: number, side: 'top' | 'right' | 'bottom' | 'left'): boolean => {
    if (!blockedDoor) return false;
    if (blockedDoor.row === r && blockedDoor.col === c && blockedDoor.side === side) return true;
    const oppSide = side === 'top' ? 'bottom' : side === 'bottom' ? 'top' : side === 'left' ? 'right' : 'left';
    const nr = side === 'top' ? r - 1 : side === 'bottom' ? r + 1 : r;
    const nc = side === 'left' ? c - 1 : side === 'right' ? c + 1 : c;
    if (blockedDoor.row === nr && blockedDoor.col === nc && blockedDoor.side === oppSide) return true;
    return false;
  };

  while (queue.length > 0) {
    const [cr, cc] = queue.shift()!;
    const cell = cells[cr][cc];
    if (!cell.walls.top && !isBlocked(cr, cc, 'top') && cr > 0 && !reachable[cr - 1][cc]) {
      reachable[cr - 1][cc] = true; queue.push([cr - 1, cc]);
    }
    if (!cell.walls.bottom && !isBlocked(cr, cc, 'bottom') && cr < rows - 1 && !reachable[cr + 1][cc]) {
      reachable[cr + 1][cc] = true; queue.push([cr + 1, cc]);
    }
    if (!cell.walls.left && !isBlocked(cr, cc, 'left') && cc > 0 && !reachable[cr][cc - 1]) {
      reachable[cr][cc - 1] = true; queue.push([cr, cc - 1]);
    }
    if (!cell.walls.right && !isBlocked(cr, cc, 'right') && cc < cols - 1 && !reachable[cr][cc + 1]) {
      reachable[cr][cc + 1] = true; queue.push([cr, cc + 1]);
    }
  }
  return reachable;
}

function collectWalls(cells: Cell[][], rows: number, cols: number): { row: number; col: number; side: 'top' | 'right' | 'bottom' | 'left' }[] {
  const walls: { row: number; col: number; side: 'top' | 'right' | 'bottom' | 'left' }[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (cells[r][c].walls.top && r > 0) walls.push({ row: r, col: c, side: 'top' });
      if (cells[r][c].walls.left && c > 0) walls.push({ row: r, col: c, side: 'left' });
    }
  }
  return walls;
}

function placeDoorsAndSwitches(cells: Cell[][], rows: number, cols: number, startR: number, startC: number, endR: number, endC: number): { doors: DoorInfo[]; switches: SwitchInfo[] } {
  const walls = collectWalls(cells, rows, cols);
  const shuffled = walls.sort(() => Math.random() - 0.5);

  const doors: DoorInfo[] = [];
  const switches: SwitchInfo[] = [];
  const usedSwitchCells = new Set<string>();
  let doorId = 0;
  const maxDoors = Math.min(Math.floor(rows * cols * 0.15) + 2, 8);

  for (const wall of shuffled) {
    if (doors.length >= maxDoors) break;

    const nr = wall.side === 'top' ? wall.row - 1 : wall.side === 'bottom' ? wall.row + 1 : wall.row;
    const nc = wall.side === 'left' ? wall.col - 1 : wall.side === 'right' ? wall.col + 1 : wall.col;

    if (wall.row === startR && wall.col === startC) continue;
    if (nr === startR && nc === startC) continue;
    if (wall.row === endR && wall.col === endC) continue;
    if (nr === endR && nc === endC) continue;

    const door: DoorInfo = { row: wall.row, col: wall.col, side: wall.side, id: doorId };

    const reachableFromStart = bfsReachable(cells, rows, cols, startR, startC, door);
    if (!reachableFromStart[endR][endC] && !(reachableFromStart[wall.row][wall.col] || reachableFromStart[nr][nc])) {
      continue;
    }

    const switchCandidates: [number, number][] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (reachableFromStart[r][c] && !(r === startR && c === startC) && !(r === endR && c === endC)) {
          const key = `${r},${c}`;
          if (!usedSwitchCells.has(key)) {
            switchCandidates.push([r, c]);
          }
        }
      }
    }

    if (switchCandidates.length === 0) continue;

    const [sr, sc] = switchCandidates[Math.floor(Math.random() * switchCandidates.length)];
    usedSwitchCells.add(`${sr},${sc}`);

    cells[wall.row][wall.col].walls[wall.side] = true;
    const oppSide = wall.side === 'top' ? 'bottom' : wall.side === 'bottom' ? 'top' : wall.side === 'left' ? 'right' : 'left';
    cells[nr][nc].walls[oppSide] = true;

    doors.push(door);
    switches.push({ row: sr, col: sc, doorId: doorId });
    cells[sr][sc].hasSwitch = true;
    cells[sr][sc].switchDoorId = doorId;
    doorId++;
  }

  return { doors, switches };
}

export function generateMaze(level: number): MazeData {
  const baseSize = 6;
  const extraSize = Math.min(Math.floor(level * 0.5), 4);
  const rows = baseSize + extraSize;
  const cols = baseSize + extraSize;

  const cells = createCells(rows, cols);
  generateMazeDFS(cells, rows, cols);

  const extraPassages = Math.floor(rows * cols * 0.1) + level;
  addExtraPassages(cells, rows, cols, extraPassages);

  const startRow = 0;
  const startCol = 0;
  const endRow = rows - 1;
  const endCol = cols - 1;

  cells[startRow][startCol].isStart = true;
  cells[endRow][endCol].isEnd = true;

  const { doors, switches } = placeDoorsAndSwitches(cells, rows, cols, startRow, startCol, endRow, endCol);

  const reachable = bfsReachable(cells, rows, cols, startRow, startCol);
  if (!reachable[endRow][endCol]) {
    return generateMaze(level);
  }

  return {
    rows,
    cols,
    cells,
    doors,
    switches,
    startRow,
    startCol,
    endRow,
    endCol,
  };
}
