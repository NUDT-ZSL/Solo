import { Enemy, Player, Room } from '../types';
import { TILE_SIZE, ENEMY_CHASE_RANGE } from '../constants';

function isWallAt(room: Room, px: number, py: number, radius: number): boolean {
  const checkPoints = [
    { x: px - radius + 0.5, y: py - radius + 0.5 },
    { x: px + radius - 0.5, y: py - radius + 0.5 },
    { x: px - radius + 0.5, y: py + radius - 0.5 },
    { x: px + radius - 0.5, y: py + radius - 0.5 },
    { x: px, y: py - radius + 0.5 },
    { x: px, y: py + radius - 0.5 },
    { x: px - radius + 0.5, y: py },
    { x: px + radius - 0.5, y: py },
  ];

  for (const pt of checkPoints) {
    const gx = Math.floor(pt.x / TILE_SIZE);
    const gy = Math.floor(pt.y / TILE_SIZE);
    if (gx < 0 || gx >= room.width || gy < 0 || gy >= room.height) {
      return true;
    }
    if (room.tiles[gy][gx] === 'wall') {
      return true;
    }
  }

  return false;
}

function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.hypot(x2 - x1, y2 - y1);
}

function tryAxisMove(
  enemy: Enemy,
  room: Room,
  playerX: number,
  playerY: number,
  speed: number,
  preferXFirst: boolean
): { x: number; y: number } {
  const radius = enemy.type === 'bat' ? enemy.radius : 7;
  let resultX = enemy.x;
  let resultY = enemy.y;

  const tryX = () => {
    const dxRaw = playerX - resultX;
    if (Math.abs(dxRaw) < 0.01) return;
    const dxStep = Math.sign(dxRaw) * Math.min(Math.abs(dxRaw), speed);
    const nextX = resultX + dxStep;
    if (!isWallAt(room, nextX, resultY, radius)) {
      resultX = nextX;
    }
  };

  const tryY = () => {
    const dyRaw = playerY - resultY;
    if (Math.abs(dyRaw) < 0.01) return;
    const dyStep = Math.sign(dyRaw) * Math.min(Math.abs(dyRaw), speed);
    const nextY = resultY + dyStep;
    if (!isWallAt(room, resultX, nextY, radius)) {
      resultY = nextY;
    }
  };

  if (preferXFirst) {
    tryX();
    tryY();
  } else {
    tryY();
    tryX();
  }

  return { x: resultX, y: resultY };
}

function trySlantMove(
  enemy: Enemy,
  room: Room,
  playerX: number,
  playerY: number
): { x: number; y: number } | null {
  const radius = enemy.type === 'bat' ? enemy.radius : 7;
  const dxRaw = playerX - enemy.x;
  const dyRaw = playerY - enemy.y;
  const len = Math.hypot(dxRaw, dyRaw);
  if (len === 0) return null;

  const nx = dxRaw / len;
  const ny = dyRaw / len;

  const newX = enemy.x + nx * enemy.speed;
  const newY = enemy.y + ny * enemy.speed;

  if (!isWallAt(room, newX, newY, radius)) {
    return { x: newX, y: newY };
  }

  return null;
}

function tryPerpendicular(
  enemy: Enemy,
  room: Room,
  playerX: number,
  playerY: number
): { x: number; y: number } | null {
  const radius = enemy.type === 'bat' ? enemy.radius : 7;
  const dxRaw = playerX - enemy.x;
  const dyRaw = playerY - enemy.y;
  const len = Math.hypot(dxRaw, dyRaw);
  if (len === 0) return null;

  const nx = dxRaw / len;
  const ny = dyRaw / len;
  const perpX = -ny;
  const perpY = nx;

  const candidates = [
    { x: enemy.x + (nx + perpX * 0.6) * enemy.speed, y: enemy.y + (ny + perpY * 0.6) * enemy.speed },
    { x: enemy.x + (nx - perpX * 0.6) * enemy.speed, y: enemy.y + (ny - perpY * 0.6) * enemy.speed },
    { x: enemy.x + perpX * enemy.speed, y: enemy.y + perpY * enemy.speed },
    { x: enemy.x - perpX * enemy.speed, y: enemy.y - perpY * enemy.speed },
  ];

  let best: { x: number; y: number } | null = null;
  let bestDist = Infinity;

  for (const cand of candidates) {
    if (!isWallAt(room, cand.x, cand.y, radius)) {
      const d = distance(cand.x, cand.y, playerX, playerY);
      if (d < bestDist) {
        bestDist = d;
        best = cand;
      }
    }
  }

  return best;
}

export function updateEnemyPosition(
  enemy: Enemy,
  player: Player,
  room: Room
): Enemy {
  const dist = distance(enemy.x, enemy.y, player.x, player.y);

  if (dist > ENEMY_CHASE_RANGE) {
    return enemy;
  }

  const radius = enemy.type === 'bat' ? enemy.radius : 7;
  const effectiveSpeed = enemy.type === 'bat' ? enemy.speed : enemy.speed * 0.8;

  const slant = trySlantMove(
    { ...enemy, speed: effectiveSpeed },
    room,
    player.x,
    player.y
  );
  if (slant) {
    return { ...enemy, x: slant.x, y: slant.y };
  }

  const preferX = Math.abs(player.x - enemy.x) >= Math.abs(player.y - enemy.y);
  const axisResult = tryAxisMove(
    { ...enemy, speed: effectiveSpeed },
    room,
    player.x,
    player.y,
    effectiveSpeed,
    preferX
  );

  if (
    distance(axisResult.x, axisResult.y, player.x, player.y) <
    distance(enemy.x, enemy.y, player.x, player.y) - 0.001
  ) {
    return { ...enemy, x: axisResult.x, y: axisResult.y };
  }

  const perp = tryPerpendicular(
    { ...enemy, speed: effectiveSpeed },
    room,
    player.x,
    player.y
  );
  if (perp) {
    return { ...enemy, x: perp.x, y: perp.y };
  }

  void radius;
  return enemy;
}

export function checkEnemyPlayerCollision(
  enemy: Enemy,
  player: Player
): boolean {
  const dist = distance(enemy.x, enemy.y, player.x, player.y);
  const eR = enemy.type === 'bat' ? enemy.radius : 7;
  const collisionDist = eR + player.radius - 1;
  return dist < collisionDist;
}

export function checkPlayerAttackEnemy(
  player: Player,
  enemy: Enemy
): boolean {
  const dist = distance(player.x, player.y, enemy.x, enemy.y);
  const eR = enemy.type === 'bat' ? enemy.radius : 7;
  return dist < player.radius + eR + 3;
}

export function damageEnemy(enemy: Enemy, damage: number): Enemy {
  const newHp = Math.max(0, enemy.hp - damage);
  return { ...enemy, hp: newHp };
}

export function isEnemyDead(enemy: Enemy): boolean {
  return enemy.hp <= 0;
}
