import {
  TideState,
  Tower,
  TowerType,
  TIDE_CYCLE,
  TIDE_MIN,
  TIDE_MAX,
  CURRENT_CHANGE_INTERVAL,
  CURRENT_MIN_SPEED,
  CURRENT_MAX_SPEED,
  DIRECTIONS_8,
  BASE_OUTPUT,
} from './types';

export function calculateTideHeight(elapsedTime: number): number {
  const mid = (TIDE_MAX + TIDE_MIN) / 2;
  const amp = (TIDE_MAX - TIDE_MIN) / 2;
  const phase = (2 * Math.PI * elapsedTime) / TIDE_CYCLE;
  return mid + amp * Math.sin(phase);
}

export function calculateCurrentDirection(elapsedTime: number): number {
  const idx = Math.floor(elapsedTime / CURRENT_CHANGE_INTERVAL) % DIRECTIONS_8.length;
  return DIRECTIONS_8[idx];
}

export function calculateCurrentSpeed(elapsedTime: number): number {
  const t = elapsedTime * 0.1;
  const norm = (Math.sin(t) + 1) / 2;
  return CURRENT_MIN_SPEED + norm * (CURRENT_MAX_SPEED - CURRENT_MIN_SPEED);
}

export function computeTideState(elapsedTime: number): TideState {
  return {
    tideHeight: calculateTideHeight(elapsedTime),
    currentSpeed: calculateCurrentSpeed(elapsedTime),
    currentDirection: calculateCurrentDirection(elapsedTime),
    cycleTime: TIDE_CYCLE - (elapsedTime % TIDE_CYCLE),
  };
}

export function calculateTowerEfficiency(
  tower: Tower,
  tideState: TideState,
  adjacentCount: number
): number {
  const levelMult = tower.level;
  switch (tower.type) {
    case TowerType.TIDAL_TURBINE: {
      const h = tideState.tideHeight;
      let eff = 1.0;
      if (h >= 3) eff = 1.5;
      else if (h >= 1) eff = 1.0;
      else eff = 0.5;
      return eff * levelMult;
    }
    case TowerType.CURRENT_WING: {
      const s = tideState.currentSpeed;
      let eff = 1.0;
      if (s >= 0.5 && s <= 1.5) {
        eff = 1.0;
      } else if (s < 0.5) {
        eff = s / 0.5;
      } else {
        eff = Math.max(0, 1.0 - (s - 1.5) / 0.5);
      }
      return eff * levelMult;
    }
    case TowerType.OSCILLATING_WATER_COLUMN: {
      const bonus = Math.min(adjacentCount * 0.1, 0.5);
      return (1.0 + bonus) * levelMult;
    }
    case TowerType.STORAGE_TOWER:
      return 0;
    default:
      return 0;
  }
}

export function calculateTowerOutput(
  tower: Tower,
  tideState: TideState,
  adjacentCount: number
): number {
  const eff = calculateTowerEfficiency(tower, tideState, adjacentCount);
  return eff * BASE_OUTPUT;
}

export function getAdjacentKeys(row: number, col: number): string[] {
  const isEven = row % 2 === 0;
  const offsets = isEven
    ? [[-1, -1], [-1, 0], [0, -1], [0, 1], [1, -1], [1, 0]]
    : [[-1, 0], [-1, 1], [0, -1], [0, 1], [1, 0], [1, 1]];
  return offsets.map(([dr, dc]) => `${row + dr},${col + dc}`);
}

export function countAdjacentTowers(
  tower: Tower,
  allTowers: Map<string, Tower>
): number {
  const adjKeys = getAdjacentKeys(tower.position.row, tower.position.col);
  let count = 0;
  for (const k of adjKeys) {
    if (allTowers.has(k)) count++;
  }
  return count;
}
