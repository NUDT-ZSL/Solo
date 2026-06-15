import type { Enemy, Point, EnemyType } from './types';
import { ENEMY_STATS, PATH_WAYPOINTS, CANVAS_WIDTH, genId, CELL_SIZE } from './types';

const PATH_SEGMENTS: { length: number; start: Point; end: Point }[] = [];
let totalPathLength = 0;

function initPath() {
  totalPathLength = 0;
  PATH_SEGMENTS.length = 0;
  for (let i = 0; i < PATH_WAYPOINTS.length - 1; i++) {
    const a = PATH_WAYPOINTS[i];
    const b = PATH_WAYPOINTS[i + 1];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    PATH_SEGMENTS.push({ length: len, start: a, end: b });
    totalPathLength += len;
  }
}
initPath();

export function getTotalPathLength(): number {
  return totalPathLength;
}

export function getPositionOnPath(progress: number): Point {
  let remaining = progress;
  for (const seg of PATH_SEGMENTS) {
    if (remaining <= seg.length) {
      const t = remaining / seg.length;
      return {
        x: seg.start.x + (seg.end.x - seg.start.x) * t,
        y: seg.start.y + (seg.end.y - seg.start.y) * t,
      };
    }
    remaining -= seg.length;
  }
  const last = PATH_WAYPOINTS[PATH_WAYPOINTS.length - 1];
  return { x: last.x, y: last.y };
}

export function hasReachedEnd(progress: number): boolean {
  return progress >= totalPathLength;
}

export function createEnemy(type: EnemyType, waveMultiplier: number): Enemy {
  const stats = ENEMY_STATS[type];
  const hpMult = 1 + (waveMultiplier - 1) * 0.15;
  return {
    id: genId(),
    type,
    hp: Math.floor(stats.hp * hpMult),
    maxHp: Math.floor(stats.hp * hpMult),
    speed: stats.speed,
    baseSpeed: stats.speed,
    armor: stats.armor,
    pathProgress: 0,
    position: getPositionOnPath(0),
    slowTimer: 0,
    slowFactor: 0,
    flashTimer: 0,
    shakeTimer: 0,
    isDead: false,
    bossSummonTimer: stats.summonInterval > 0 ? stats.summonInterval : 0,
  };
}

export function updateEnemy(enemy: Enemy, dt: number): Enemy {
  if (enemy.isDead) return enemy;
  let speed = enemy.baseSpeed;
  if (enemy.slowTimer > 0) {
    speed *= (1 - enemy.slowFactor);
    enemy.slowTimer = Math.max(0, enemy.slowTimer - dt);
  } else {
    enemy.slowFactor = 0;
  }
  enemy.speed = speed;
  enemy.pathProgress += speed * dt * 0.06;
  enemy.position = getPositionOnPath(enemy.pathProgress);
  enemy.flashTimer = Math.max(0, enemy.flashTimer - dt);
  enemy.shakeTimer = Math.max(0, enemy.shakeTimer - dt);
  return enemy;
}

export function damageEnemy(enemy: Enemy, rawDamage: number): { killed: boolean; actualDamage: number } {
  const actualDamage = Math.max(1, rawDamage - enemy.armor);
  enemy.hp -= actualDamage;
  enemy.flashTimer = 120;
  enemy.shakeTimer = 150;
  if (enemy.hp <= 0) {
    enemy.hp = 0;
    enemy.isDead = true;
    return { killed: true, actualDamage };
  }
  return { killed: false, actualDamage };
}

export function applySlowToEnemy(enemy: Enemy, factor: number, duration: number) {
  const stats = ENEMY_STATS[enemy.type];
  if (stats.immuneToSlow) return;
  enemy.slowFactor = Math.max(enemy.slowFactor, factor);
  enemy.slowTimer = Math.max(enemy.slowTimer, duration);
}

export function getEnemySize(type: EnemyType): number {
  switch (type) {
    case 'normal': return CELL_SIZE * 0.3;
    case 'elite': return CELL_SIZE * 0.4;
    case 'boss': return CELL_SIZE * 0.55;
  }
}

export function getBossSummonStats(wave: number): { type: EnemyType; count: number } | null {
  return { type: 'normal', count: 2 };
}
