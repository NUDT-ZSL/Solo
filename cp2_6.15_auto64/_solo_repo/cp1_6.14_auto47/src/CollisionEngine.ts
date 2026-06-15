import { GridElement, COLLIDABLE_TYPES, ElementType } from './EditorState';

export interface CollisionResult {
  collisionGrid: boolean[][];
  blockedCount: number;
  passableCount: number;
  passableRatio: number;
  totalCells: number;
}

const isCollidable = (type: ElementType): boolean => {
  return COLLIDABLE_TYPES.includes(type);
};

export const buildCollisionGrid = (
  elements: GridElement[],
  gridSize: number
): CollisionResult => {
  const grid: boolean[][] = Array(gridSize)
    .fill(null)
    .map(() => Array(gridSize).fill(false));

  let blockedCount = 0;

  for (const el of elements) {
    if (el.gridX < 0 || el.gridX >= gridSize || el.gridY < 0 || el.gridY >= gridSize) {
      continue;
    }
    if (isCollidable(el.type)) {
      if (!grid[el.gridY][el.gridX]) {
        grid[el.gridY][el.gridX] = true;
        blockedCount++;
      }
    }
  }

  const totalCells = gridSize * gridSize;
  const passableCount = totalCells - blockedCount;
  const passableRatio = totalCells > 0 ? passableCount / totalCells : 0;

  return {
    collisionGrid: grid,
    blockedCount,
    passableCount,
    passableRatio,
    totalCells
  };
};

export const isCellBlocked = (
  collisionGrid: boolean[][],
  gridX: number,
  gridY: number
): boolean => {
  if (gridY < 0 || gridY >= collisionGrid.length) return false;
  if (gridX < 0 || gridX >= collisionGrid[0].length) return false;
  return collisionGrid[gridY][gridX];
};

export const findPath = (
  collisionGrid: boolean[][],
  start: { x: number; y: number },
  end: { x: number; y: number }
): { x: number; y: number }[] | null => {
  const rows = collisionGrid.length;
  const cols = collisionGrid[0]?.length || 0;

  if (
    start.x < 0 || start.x >= cols ||
    start.y < 0 || start.y >= rows ||
    end.x < 0 || end.x >= cols ||
    end.y < 0 || end.y >= rows
  ) {
    return null;
  }

  if (collisionGrid[start.y][start.x] || collisionGrid[end.y][end.x]) {
    return null;
  }

  if (start.x === end.x && start.y === end.y) {
    return [start];
  }

  const visited = new Set<string>();
  const key = (x: number, y: number) => `${x},${y}`;
  const queue: { x: number; y: number; path: { x: number; y: number }[] }[] = [];
  queue.push({ x: start.x, y: start.y, path: [start] });
  visited.add(key(start.x, start.y));

  const dirs = [
    { dx: 0, dy: -1 },
    { dx: 1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 0 }
  ];

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const d of dirs) {
      const nx = current.x + d.dx;
      const ny = current.y + d.dy;
      if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue;
      if (visited.has(key(nx, ny))) continue;
      if (collisionGrid[ny][nx]) continue;
      visited.add(key(nx, ny));
      const newPath = [...current.path, { x: nx, y: ny }];
      if (nx === end.x && ny === end.y) {
        return newPath;
      }
      queue.push({ x: nx, y: ny, path: newPath });
    }
  }

  return null;
};
