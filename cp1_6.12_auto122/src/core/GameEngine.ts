import type { CellState } from '../types';

export type { CellState };

export interface Cell {
  isMine: boolean;
  state: CellState;
  adjacentMines: number;
  row: number;
  col: number;
}

export interface GameState {
  grid: Cell[][];
  rows: number;
  cols: number;
  mineCount: number;
  isGameOver: boolean;
  isWin: boolean;
  revealedCount: number;
  flagCount: number;
}

export function createEmptyGrid(rows: number, cols: number): Cell[][] {
  const grid: Cell[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: Cell[] = [];
    for (let c = 0; c < cols; c++) {
      row.push({
        isMine: false,
        state: 'hidden',
        adjacentMines: 0,
        row: r,
        col: c
      });
    }
    grid.push(row);
  }
  return grid;
}

export function placeMines(grid: Cell[][], mineCount: number, excludeRow?: number, excludeCol?: number): void {
  const rows = grid.length;
  const cols = grid[0].length;
  const available: [number, number][] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (excludeRow !== undefined && excludeCol !== undefined) {
        if (Math.abs(r - excludeRow) <= 1 && Math.abs(c - excludeCol) <= 1) {
          continue;
        }
      }
      available.push([r, c]);
    }
  }

  const actualMineCount = Math.min(mineCount, available.length);
  for (let i = 0; i < actualMineCount; i++) {
    const idx = Math.floor(Math.random() * available.length);
    const [r, c] = available.splice(idx, 1)[0];
    grid[r][c].isMine = true;
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!grid[r][c].isMine) {
        grid[r][c].adjacentMines = countAdjacentMines(grid, r, c);
      }
    }
  }
}

function countAdjacentMines(grid: Cell[][], row: number, col: number): number {
  let count = 0;
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = row + dr;
      const nc = col + dc;
      if (nr >= 0 && nr < grid.length && nc >= 0 && nc < grid[0].length) {
        if (grid[nr][nc].isMine) count++;
      }
    }
  }
  return count;
}

export function revealCell(grid: Cell[][], row: number, col: number): { revealed: Cell[]; hitMine: boolean } {
  const cell = grid[row][col];
  const revealed: Cell[] = [];
  let hitMine = false;

  if (cell.state !== 'hidden') {
    return { revealed, hitMine };
  }

  cell.state = 'revealed';
  revealed.push(cell);

  if (cell.isMine) {
    hitMine = true;
    return { revealed, hitMine };
  }

  if (cell.adjacentMines === 0) {
    const flood = floodReveal(grid, row, col);
    revealed.push(...flood);
  }

  return { revealed, hitMine };
}

function floodReveal(grid: Cell[][], row: number, col: number): Cell[] {
  const revealed: Cell[] = [];
  const stack: [number, number][] = [[row, col]];
  const visited = new Set<string>();

  while (stack.length > 0) {
    const [r, c] = stack.pop()!;
    const key = `${r},${c}`;
    if (visited.has(key)) continue;
    visited.add(key);

    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < grid.length && nc >= 0 && nc < grid[0].length) {
          const neighbor = grid[nr][nc];
          if (neighbor.state === 'hidden' && !neighbor.isMine) {
            neighbor.state = 'revealed';
            revealed.push(neighbor);
            if (neighbor.adjacentMines === 0) {
              stack.push([nr, nc]);
            }
          }
        }
      }
    }
  }

  return revealed;
}

export function toggleFlag(grid: Cell[][], row: number, col: number): Cell {
  const cell = grid[row][col];
  if (cell.state === 'revealed') return cell;

  if (cell.state === 'hidden') {
    cell.state = 'flagged';
  } else if (cell.state === 'flagged') {
    cell.state = 'questioned';
  } else {
    cell.state = 'hidden';
  }
  return cell;
}

export function revealAllMines(grid: Cell[][]): Cell[] {
  const mines: Cell[] = [];
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[0].length; c++) {
      if (grid[r][c].isMine) {
        grid[r][c].state = 'revealed';
        mines.push(grid[r][c]);
      }
    }
  }
  return mines;
}

export function checkWin(grid: Cell[][]): boolean {
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[0].length; c++) {
      const cell = grid[r][c];
      if (!cell.isMine && cell.state !== 'revealed') {
        return false;
      }
    }
  }
  return true;
}

export function initGame(rows: number, cols: number, mineCount: number): GameState {
  const grid = createEmptyGrid(rows, cols);
  return {
    grid,
    rows,
    cols,
    mineCount,
    isGameOver: false,
    isWin: false,
    revealedCount: 0,
    flagCount: 0
  };
}

export function countRevealed(grid: Cell[][]): number {
  let count = 0;
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[0].length; c++) {
      if (grid[r][c].state === 'revealed') count++;
    }
  }
  return count;
}

export function countFlags(grid: Cell[][]): number {
  let count = 0;
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[0].length; c++) {
      if (grid[r][c].state === 'flagged') count++;
    }
  }
  return count;
}
