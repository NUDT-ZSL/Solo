import { Position, Tower, Enemy, CELL_SIZE, TOWER_CONFIG, GRID_SIZE } from './types';

export function gridToPixel(gridX: number, gridY: number): Position {
  return {
    x: gridX * CELL_SIZE + CELL_SIZE / 2,
    y: gridY * CELL_SIZE + CELL_SIZE / 2
  };
}

export function pixelToGrid(x: number, y: number): Position {
  return {
    x: Math.floor(x / CELL_SIZE),
    y: Math.floor(y / CELL_SIZE)
  };
}

export function getDistance(p1: Position, p2: Position): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function isEnemyInRange(tower: Tower, enemy: Enemy): boolean {
  const config = TOWER_CONFIG[tower.type];
  const towerPos = gridToPixel(tower.gridX, tower.gridY);
  const rangePixels = config.range * CELL_SIZE;
  const distance = getDistance(towerPos, { x: enemy.x, y: enemy.y });
  return distance <= rangePixels;
}

export function isValidGridPosition(gridX: number, gridY: number): boolean {
  return gridX >= 0 && gridX < GRID_SIZE && gridY >= 0 && gridY < GRID_SIZE;
}

export function isOnPath(gridX: number, gridY: number): boolean {
  const pathRows = [1, 2];
  return pathRows.includes(gridY);
}
