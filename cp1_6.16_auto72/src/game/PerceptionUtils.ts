import { CellType, Direction, MapData, PerceptionResult, Position } from './types';
import { directionToDelta } from './MapGenerator';

export function flashLight(
  playerPos: Position,
  map: MapData
): PerceptionResult {
  const cells: Position[] = [];
  const traps: Position[] = [];
  const walls: Position[] = [];

  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const x = playerPos.x + dx;
      const y = playerPos.y + dy;
      if (x < 0 || y < 0 || x >= map.width || y >= map.height) continue;
      cells.push({ x, y });
      const cellType = map.grid[y][x];
      if (
        cellType === CellType.TRAP_SPIKE ||
        cellType === CellType.TRAP_ROCK ||
        cellType === CellType.TRAP_POISON
      ) {
        traps.push({ x, y });
      }
      if (cellType === CellType.WALL) {
        walls.push({ x, y });
      }
    }
  }

  return { cells, traps, walls };
}

export function echoScan(
  playerPos: Position,
  direction: Direction,
  map: MapData
): PerceptionResult {
  const cells: Position[] = [];
  const traps: Position[] = [];
  const walls: Position[] = [];

  const delta = directionToDelta(direction);
  const perpX = delta.y;
  const perpY = delta.x;

  for (let dist = 1; dist <= 5; dist++) {
    const spread = dist <= 2 ? 0 : 1;
    for (let offset = -spread; offset <= spread; offset++) {
      const x = playerPos.x + delta.x * dist + perpX * offset;
      const y = playerPos.y + delta.y * dist + perpY * offset;
      if (x < 0 || y < 0 || x >= map.width || y >= map.height) continue;
      cells.push({ x, y });
      const cellType = map.grid[y][x];
      if (
        cellType === CellType.TRAP_SPIKE ||
        cellType === CellType.TRAP_ROCK ||
        cellType === CellType.TRAP_POISON
      ) {
        traps.push({ x, y });
      }
      if (cellType === CellType.WALL) {
        walls.push({ x, y });
      }
    }
  }

  return { cells, traps, walls };
}
