import type { Unit, Tower, UnitType, UnitStats, PlayerId, HexCoord } from '../shared/types';
import { hexToPixel, getHexNeighbors } from '../utils/HexUtils';

let unitIdCounter = 0;

export const UNIT_STATS: Record<UnitType, UnitStats> = {
  attack_tower: {
    maxHp: 100,
    attack: 20,
    speed: 0,
    range: 3,
    attackCooldown: 1.0,
  },
  ice_tower: {
    maxHp: 80,
    attack: 5,
    speed: 0,
    range: 3,
    attackCooldown: 1.2,
    slowEffect: 0.5,
    slowDuration: 2.0,
  },
  fast_unit: {
    maxHp: 50,
    attack: 10,
    speed: 2,
    range: 1,
    attackCooldown: 0.5,
  },
  heavy_unit: {
    maxHp: 150,
    attack: 30,
    speed: 1,
    range: 1,
    attackCooldown: 1.0,
  },
};

export function generateId(): string {
  unitIdCounter++;
  return `unit_${Date.now()}_${unitIdCounter}`;
}

export function createUnit(
  type: UnitType,
  owner: PlayerId,
  position: HexCoord
): Unit | Tower {
  const stats = { ...UNIT_STATS[type] };
  const pixel = hexToPixel(position.q, position.r);
  const baseProps = {
    id: generateId(),
    type,
    owner,
    position,
    pixelX: pixel.x,
    pixelY: pixel.y,
    hp: stats.maxHp,
    maxHp: stats.maxHp,
    stats,
    target: null,
    attackTimer: 0,
    attackFlashTimer: 0,
    spawnAnimTimer: 0.3,
  };

  if (type === 'attack_tower' || type === 'ice_tower') {
    return {
      ...baseProps,
      type: type as 'attack_tower' | 'ice_tower',
    } as Tower;
  }

  return {
    ...baseProps,
    type: type as 'fast_unit' | 'heavy_unit',
    path: [],
    isAttacking: false,
    slowTimer: 0,
    slowAmount: 0,
    trail: [],
  } as Unit;
}

export function getUnitStats(type: UnitType): UnitStats {
  return { ...UNIT_STATS[type] };
}

export function getSpawnPosition(basePos: HexCoord, gridSize: number): HexCoord {
  const neighbors = getHexNeighbors(basePos);
  for (const n of neighbors) {
    if (n.q >= 0 && n.q < gridSize && n.r >= 0 && n.r < gridSize) {
      return n;
    }
  }
  return basePos;
}
