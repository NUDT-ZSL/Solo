import { EnemyType, ENEMY_CONFIG, Enemy, CELL_SIZE } from './types';

let enemyIdCounter = 0;

export function generateEnemyId(): string {
  return `enemy_${++enemyIdCounter}`;
}

export function generateWaveEnemyCount(wave: number): number {
  return 8 + Math.floor(Math.random() * 5);
}

export function getRandomEnemyType(wave: number): EnemyType {
  const rand = Math.random();
  if (wave < 3) {
    if (rand < 0.7) return 'normal';
    if (rand < 0.9) return 'heavy';
    return 'flying';
  } else {
    if (rand < 0.5) return 'normal';
    if (rand < 0.8) return 'heavy';
    return 'flying';
  }
}

export function createEnemy(type: EnemyType, wave: number, gridY: number): Enemy {
  const config = ENEMY_CONFIG[type];
  const hpMultiplier = 1 + wave * 0.15;
  return {
    id: generateEnemyId(),
    type,
    x: -CELL_SIZE / 2,
    y: gridY * CELL_SIZE + CELL_SIZE / 2,
    hp: config.hp * hpMultiplier,
    maxHp: config.hp * hpMultiplier,
    speed: config.speed,
    pathIndex: 0,
    isDead: false,
    deathTime: 0,
    isFrozen: false,
    frozenTime: 0
  };
}

export function getEnemyPathRow(): number {
  return Math.random() < 0.5 ? 1 : 2;
}
