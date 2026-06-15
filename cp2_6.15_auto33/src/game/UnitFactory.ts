import type { Unit, Tower, UnitType, UnitStats, PlayerId, HexCoord } from '../shared/types';

let unitIdCounter = 0;

const UNIT_STATS: Record<UnitType, UnitStats> = {
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

const HEX_SIZE = 40;

export function hexToPixel(q: number, r: number): { x: number; y: number } {
  const x = HEX_SIZE * (3 / 2 * q);
  const y = HEX_SIZE * (Math.sqrt(3) / 2 * q + Math.sqrt(3) * r);
  return { x, y };
}

export function pixelToHex(x: number, y: number): HexCoord {
  const q = (2 / 3 * x) / HEX_SIZE;
  const r = (-1 / 3 * x + Math.sqrt(3) / 3 * y) / HEX_SIZE;
  return hexRound(q, r);
}

function hexRound(q: number, r: number): HexCoord {
  const s = -q - r;
  let rq = Math.round(q);
  let rr = Math.round(r);
  let rs = Math.round(s);
  const qDiff = Math.abs(rq - q);
  const rDiff = Math.abs(rr - r);
  const sDiff = Math.abs(rs - s);
  if (qDiff > rDiff && qDiff > sDiff) {
    rq = -rr - rs;
  } else if (rDiff > sDiff) {
    rr = -rq - rs;
  }
  return { q: rq, r: rr };
}

export function hexDistance(a: HexCoord, b: HexCoord): number {
  return (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;
}

export function getHexNeighbors(hex: HexCoord): HexCoord[] {
  const directions = [
    { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
    { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 },
  ];
  return directions.map(d => ({ q: hex.q + d.q, r: hex.r + d.r }));
}

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
