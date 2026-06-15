import {
  GRID_SIZE,
  getDirectionOffset,
  type GridPos,
  type Direction,
  type BlockColor,
  type Conveyor,
  type Sorter,
  type Arm,
  type TargetZone,
  type Obstacle,
  type Block,
} from './entities';

export function isSameGridPos(a: GridPos, b: GridPos): boolean {
  return a.x === b.x && a.y === b.y;
}

export function isValidPosition(
  pos: GridPos,
  gridWidth: number,
  gridHeight: number
): boolean {
  return pos.x >= 0 && pos.x < gridWidth && pos.y >= 0 && pos.y < gridHeight;
}

export function isObstacleAt(pos: GridPos, obstacles: Obstacle[]): boolean {
  return obstacles.some(o => isSameGridPos(o.gridPos, pos));
}

export function getConveyorAt(pos: GridPos, conveyors: Conveyor[]): Conveyor | undefined {
  return conveyors.find(c => isSameGridPos(c.gridPos, pos));
}

export function getSorterAt(pos: GridPos, sorters: Sorter[]): Sorter | undefined {
  return sorters.find(s => isSameGridPos(s.gridPos, pos));
}

export function getArmAt(pos: GridPos, arms: Arm[]): Arm | undefined {
  return arms.find(a => isSameGridPos(a.gridPos, pos));
}

export function getTargetZoneAt(pos: GridPos, targets: TargetZone[]): TargetZone | undefined {
  return targets.find(t => isSameGridPos(t.gridPos, pos));
}

export function isCellOccupied(
  pos: GridPos,
  conveyors: Conveyor[],
  sorters: Sorter[],
  arms: Arm[],
  obstacles: Obstacle[],
  targetZones: TargetZone[],
  spawnPoint: GridPos
): boolean {
  if (isObstacleAt(pos, obstacles)) return true;
  if (isSameGridPos(pos, spawnPoint)) return true;
  if (getTargetZoneAt(pos, targetZones)) return true;
  if (getConveyorAt(pos, conveyors)) return true;
  if (getSorterAt(pos, sorters)) return true;
  if (getArmAt(pos, arms)) return true;
  return false;
}

export function canPlaceTool(
  pos: GridPos,
  gridWidth: number,
  gridHeight: number,
  conveyors: Conveyor[],
  sorters: Sorter[],
  arms: Arm[],
  obstacles: Obstacle[],
  targetZones: TargetZone[],
  spawnPoint: GridPos
): boolean {
  if (!isValidPosition(pos, gridWidth, gridHeight)) return false;
  return !isCellOccupied(pos, conveyors, sorters, arms, obstacles, targetZones, spawnPoint);
}

export function getNextBlockPosition(
  block: Block,
  conveyors: Conveyor[],
  sorters: Sorter[],
  arms: Arm[],
  obstacles: Obstacle[],
  targetZones: TargetZone[],
  spawnDirection: Direction,
  gridWidth: number,
  gridHeight: number
): { pos: GridPos; direction: Direction } | null {
  const currentPos = block.gridPos;
  let direction: Direction = spawnDirection;

  const conveyor = getConveyorAt(currentPos, conveyors);
  if (conveyor) {
    direction = conveyor.direction;
  }

  const sorter = getSorterAt(currentPos, sorters);
  if (sorter) {
    direction = sorter.colorMap[block.color];
  }

  const arm = getArmAt(currentPos, arms);
  if (arm) {
    const armDirection = getDirectionFromAngle(arm.rotation);
    direction = armDirection;
  }

  const offset = getDirectionOffset(direction);
  const nextPos: GridPos = {
    x: currentPos.x + offset.x,
    y: currentPos.y + offset.y,
  };

  if (!isValidPosition(nextPos, gridWidth, gridHeight)) {
    return null;
  }

  if (isObstacleAt(nextPos, obstacles)) {
    return null;
  }

  const target = getTargetZoneAt(nextPos, targetZones);
  if (target && target.color !== block.color) {
    return null;
  }

  return { pos: nextPos, direction };
}

function getDirectionFromAngle(angle: number): Direction {
  const normalized = ((angle % 360) + 360) % 360;
  if (normalized >= 315 || normalized < 45) return 'right';
  if (normalized >= 45 && normalized < 135) return 'down';
  if (normalized >= 135 && normalized < 225) return 'left';
  return 'up';
}

export function checkBlockTargetCollision(
  block: Block,
  targetZones: TargetZone[]
): TargetZone | null {
  for (const zone of targetZones) {
    if (
      isSameGridPos(block.gridPos, zone.gridPos) &&
      block.color === zone.color &&
      zone.filled < zone.required
    ) {
      return zone;
    }
  }
  return null;
}

export function checkWinCondition(targetZones: TargetZone[]): boolean {
  return targetZones.every(zone => zone.filled >= zone.required);
}

export function getBlockPixelPosition(
  block: Block,
  progress: number
): { x: number; y: number } {
  const startX = block.gridPos.x * GRID_SIZE + GRID_SIZE / 2;
  const startY = block.gridPos.y * GRID_SIZE + GRID_SIZE / 2;
  const endX = block.targetGridPos.x * GRID_SIZE + GRID_SIZE / 2;
  const endY = block.targetGridPos.y * GRID_SIZE + GRID_SIZE / 2;

  const easedProgress = 1 - Math.pow(1 - progress, 3);

  return {
    x: startX + (endX - startX) * easedProgress,
    y: startY + (endY - startY) * easedProgress,
  };
}

export function getRandomColor(): BlockColor {
  const colors: BlockColor[] = ['red', 'yellow', 'green', 'blue'];
  return colors[Math.floor(Math.random() * colors.length)];
}

export function getColorForTarget(
  targetZones: TargetZone[],
  currentColorIndex: number
): BlockColor {
  const unfilledZones = targetZones.filter(z => z.filled < z.required);
  if (unfilledZones.length === 0) {
    return getRandomColor();
  }
  const zone = unfilledZones[currentColorIndex % unfilledZones.length];
  return zone.color;
}
