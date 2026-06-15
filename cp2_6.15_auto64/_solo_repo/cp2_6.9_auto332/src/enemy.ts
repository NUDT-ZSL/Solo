import { Maze, isWalkable } from './maze';

export type EnemyState = 'idle' | 'chase' | 'attack' | 'dead';

export interface Enemy {
  id: number;
  x: number;
  y: number;
  state: EnemyState;
  attackTimer: number;
  flashTimer: number;
  canCounter: boolean;
  counterTimer: number;
}

export const ATTACK_DURATION = 0.5;
export const ATTACK_FLASH = 0.3;
export const COUNTER_WINDOW = 0.3;

let enemyIdCounter = 0;

export function createEnemy(x: number, y: number): Enemy {
  return {
    id: ++enemyIdCounter,
    x,
    y,
    state: 'idle',
    attackTimer: 0,
    flashTimer: 0,
    canCounter: false,
    counterTimer: 0
  };
}

export function updateEnemyTimers(enemy: Enemy, dt: number): void {
  if (enemy.state === 'dead') return;
  if (enemy.attackTimer > 0) {
    enemy.attackTimer -= dt;
    if (enemy.attackTimer <= 0) {
      enemy.attackTimer = 0;
    }
  }
  if (enemy.flashTimer > 0) {
    enemy.flashTimer -= dt;
    if (enemy.flashTimer <= 0) {
      enemy.flashTimer = 0;
      if (enemy.state === 'attack') {
        enemy.canCounter = true;
        enemy.counterTimer = COUNTER_WINDOW;
      }
    }
  }
  if (enemy.counterTimer > 0) {
    enemy.counterTimer -= dt;
    if (enemy.counterTimer <= 0) {
      enemy.counterTimer = 0;
      enemy.canCounter = false;
      if (enemy.state === 'attack') {
        enemy.state = 'idle';
      }
    }
  }
}

export function moveEnemyTowards(enemy: Enemy, targetX: number, targetY: number, maze: Maze, enemies: Enemy[]): void {
  if (enemy.state === 'dead' || enemy.state === 'attack') return;
  if (enemy.attackTimer > 0 || enemy.flashTimer > 0 || enemy.canCounter) return;

  const dx = targetX - enemy.x;
  const dy = targetY - enemy.y;
  const candidates: { x: number; y: number; priority: number }[] = [];

  if (Math.abs(dx) > Math.abs(dy)) {
    if (dx !== 0) candidates.push({ x: enemy.x + Math.sign(dx), y: enemy.y, priority: 2 });
    if (dy !== 0) candidates.push({ x: enemy.x, y: enemy.y + Math.sign(dy), priority: 1 });
  } else {
    if (dy !== 0) candidates.push({ x: enemy.x, y: enemy.y + Math.sign(dy), priority: 2 });
    if (dx !== 0) candidates.push({ x: enemy.x + Math.sign(dx), y: enemy.y, priority: 1 });
  }
  candidates.push({ x: enemy.x + 1, y: enemy.y, priority: 0 });
  candidates.push({ x: enemy.x - 1, y: enemy.y, priority: 0 });
  candidates.push({ x: enemy.x, y: enemy.y + 1, priority: 0 });
  candidates.push({ x: enemy.x, y: enemy.y - 1, priority: 0 });

  candidates.sort((a, b) => b.priority - a.priority);

  for (const c of candidates) {
    if (c.x === targetX && c.y === targetY) continue;
    if (!isWalkable(maze, c.x, c.y)) continue;
    const occupied = enemies.some(e => e !== enemy && e.state !== 'dead' && e.x === c.x && e.y === c.y);
    if (occupied) continue;
    enemy.x = c.x;
    enemy.y = c.y;
    enemy.state = 'chase';
    return;
  }
  enemy.state = 'idle';
}

export function enemyStartAttack(enemy: Enemy): void {
  if (enemy.state === 'dead') return;
  enemy.state = 'attack';
  enemy.attackTimer = ATTACK_DURATION;
  enemy.flashTimer = ATTACK_FLASH;
  enemy.canCounter = false;
  enemy.counterTimer = 0;
}

export function isAdjacent(enemy: Enemy, x: number, y: number): boolean {
  const dist = Math.abs(enemy.x - x) + Math.abs(enemy.y - y);
  return dist === 1;
}

export function tryCounter(enemy: Enemy): boolean {
  if (enemy.canCounter && enemy.state !== 'dead') {
    enemy.state = 'dead';
    enemy.canCounter = false;
    enemy.counterTimer = 0;
    return true;
  }
  return false;
}
