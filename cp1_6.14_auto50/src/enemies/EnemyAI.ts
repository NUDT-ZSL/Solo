import { Enemy, Player, Room } from '../types';
import { TILE_SIZE, ENEMY_CHASE_RANGE } from '../constants';

function isWallAt(room: Room, px: number, py: number, radius: number): boolean {
  const corners = [
    { x: px - radius, y: py - radius },
    { x: px + radius, y: py - radius },
    { x: px - radius, y: py + radius },
    { x: px + radius, y: py + radius },
  ];

  for (const corner of corners) {
    const gx = Math.floor(corner.x / TILE_SIZE);
    const gy = Math.floor(corner.y / TILE_SIZE);
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
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
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

  const dx = player.x - enemy.x;
  const dy = player.y - enemy.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return enemy;

  const moveX = (dx / len) * enemy.speed;
  const moveY = (dy / len) * enemy.speed;

  let newX = enemy.x + moveX;
  let newY = enemy.y + moveY;

  const radius = enemy.type === 'bat' ? enemy.radius : 7;

  if (isWallAt(room, newX, newY, radius)) {
    if (!isWallAt(room, newX, enemy.y, radius)) {
      newY = enemy.y;
    } else if (!isWallAt(room, enemy.x, newY, radius)) {
      newX = enemy.x;
    } else {
      newX = enemy.x;
      newY = enemy.y;
    }
  }

  if (isWallAt(room, newX, enemy.y, radius)) {
    newX = enemy.x;
  }
  if (isWallAt(room, enemy.x, newY, radius)) {
    newY = enemy.y;
  }

  return { ...enemy, x: newX, y: newY };
}

export function checkEnemyPlayerCollision(
  enemy: Enemy,
  player: Player
): boolean {
  const dist = distance(enemy.x, enemy.y, player.x, player.y);
  const collisionDist = enemy.radius + player.radius;
  return dist < collisionDist;
}

export function checkPlayerAttackEnemy(
  player: Player,
  enemy: Enemy
): boolean {
  const dist = distance(player.x, player.y, enemy.x, enemy.y);
  return dist < player.radius + enemy.radius + 2;
}

export function damageEnemy(enemy: Enemy, damage: number): Enemy {
  const newHp = Math.max(0, enemy.hp - damage);
  return { ...enemy, hp: newHp };
}

export function isEnemyDead(enemy: Enemy): boolean {
  return enemy.hp <= 0;
}
