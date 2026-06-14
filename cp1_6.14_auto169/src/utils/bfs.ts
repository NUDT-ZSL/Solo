import type { Cell, PlayerId } from '../types';
import { GRID_SIZE } from '../types';

const DIRECTIONS = [
  { dx: 0, dy: -1 },
  { dx: 1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: -1, dy: 0 },
];

export function findPath(
  grid: Cell[][],
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  playerId: PlayerId
): { x: number; y: number }[] {
  if (startX === endX && startY === endY) return [];
  if (startX < 0 || startX >= GRID_SIZE || startY < 0 || startY >= GRID_SIZE) return [];
  if (endX < 0 || endX >= GRID_SIZE || endY < 0 || endY >= GRID_SIZE) return [];

  const key = (x: number, y: number) => y * GRID_SIZE + x;

  const visited: boolean[] = new Array(GRID_SIZE * GRID_SIZE).fill(false);
  const prev: (number | -1)[] = new Array(GRID_SIZE * GRID_SIZE).fill(-1);

  const startKey = key(startX, startY);
  const endKey = key(endX, endY);

  visited[startKey] = true;

  const queue: number[] = [startKey];
  let head = 0;

  while (head < queue.length) {
    const current = queue[head++];
    if (current === endKey) break;

    const cx = current % GRID_SIZE;
    const cy = Math.floor(current / GRID_SIZE);

    for (const { dx, dy } of DIRECTIONS) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE) continue;
      const nKey = key(nx, ny);
      if (visited[nKey]) continue;
      visited[nKey] = true;
      prev[nKey] = current;
      queue.push(nKey);
      if (nKey === endKey) {
        head = queue.length;
        break;
      }
    }
  }

  if (prev[endKey] === -1 && endKey !== startKey) return [];

  const path: { x: number; y: number }[] = [];
  let curr = endKey;
  while (curr !== -1 && curr !== startKey) {
    path.unshift({ x: curr % GRID_SIZE, y: Math.floor(curr / GRID_SIZE) });
    curr = prev[curr];
  }
  return path;
}

export function findNearestEnemyTarget(
  grid: Cell[][],
  startX: number,
  startY: number,
  playerId: PlayerId
): { x: number; y: number } | null {
  const key = (x: number, y: number) => y * GRID_SIZE + x;
  const visited: boolean[] = new Array(GRID_SIZE * GRID_SIZE).fill(false);
  const startKey = key(startX, startY);
  visited[startKey] = true;

  const queue: number[] = [startKey];
  let head = 0;

  while (head < queue.length) {
    const current = queue[head++];
    const cx = current % GRID_SIZE;
    const cy = Math.floor(current / GRID_SIZE);

    if (current !== startKey) {
      const cell = grid[cy][cx];
      if (cell.owner !== playerId || cell.building || cell.unit) {
        return { x: cx, y: cy };
      }
    }

    for (const { dx, dy } of DIRECTIONS) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE) continue;
      const nKey = key(nx, ny);
      if (visited[nKey]) continue;
      visited[nKey] = true;
      queue.push(nKey);
    }
  }
  return null;
}

export function getAdjacentCells(grid: Cell[][], x: number, y: number): Cell[] {
  const result: Cell[] = [];
  for (const { dx, dy } of DIRECTIONS) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
      result.push(grid[ny][nx]);
    }
  }
  return result;
}

export function isAdjacent(x1: number, y1: number, x2: number, y2: number): boolean {
  const dx = Math.abs(x1 - x2);
  const dy = Math.abs(y1 - y2);
  return dx + dy === 1;
}
