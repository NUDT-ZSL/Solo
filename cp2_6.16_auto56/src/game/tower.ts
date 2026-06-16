export type TowerType = 'archer' | 'mage' | 'cannon' | 'ice';

export interface TowerConfig {
  type: TowerType;
  name: string;
  cost: number;
  baseDamage: number;
  baseRange: number;
  baseAttackInterval: number;
  color: string;
  specialEffect?: 'slow' | 'splash';
  splashRadius?: number;
  slowFactor?: number;
  slowDuration?: number;
  description: string;
}

export interface TowerInstance {
  id: string;
  type: TowerType;
  gridX: number;
  gridY: number;
  level: number;
  cooldown: number;
  damage: number;
  range: number;
  attackInterval: number;
  color: string;
  specialEffect?: 'slow' | 'splash';
  splashRadius?: number;
  slowFactor?: number;
  slowDuration?: number;
  targetId: string | null;
}

export const TowerConfigs: TowerConfig[] = [
  {
    type: 'archer',
    name: '弓箭塔',
    cost: 100,
    baseDamage: 15,
    baseRange: 150,
    baseAttackInterval: 500,
    color: '#3a86ff',
    description: '单体快速攻击，射程中等',
  },
  {
    type: 'mage',
    name: '魔法塔',
    cost: 150,
    baseDamage: 45,
    baseRange: 200,
    baseAttackInterval: 1500,
    color: '#9b59b6',
    description: '单体高伤害慢速，射程远',
  },
  {
    type: 'cannon',
    name: '炮塔',
    cost: 200,
    baseDamage: 35,
    baseRange: 120,
    baseAttackInterval: 1200,
    color: '#e67e22',
    specialEffect: 'splash',
    splashRadius: 50,
    description: '范围溅射伤害，射程短',
  },
  {
    type: 'ice',
    name: '冰冻塔',
    cost: 120,
    baseDamage: 0,
    baseRange: 130,
    baseAttackInterval: 800,
    color: '#1abc9c',
    specialEffect: 'slow',
    slowFactor: 0.5,
    slowDuration: 2000,
    description: '范围减速但不造成伤害',
  },
];

export function getTowerConfig(type: TowerType): TowerConfig {
  const config = TowerConfigs.find((t) => t.type === type);
  if (!config) throw new Error(`未知塔类型: ${type}`);
  return config;
}

export function getUpgradeCost(type: TowerType, currentLevel: number): number {
  const config = getTowerConfig(type);
  return Math.floor(config.cost * 0.8 * currentLevel);
}

export function createTower(
  id: string,
  type: TowerType,
  gridX: number,
  gridY: number
): TowerInstance {
  const config = getTowerConfig(type);
  return {
    id,
    type,
    gridX,
    gridY,
    level: 1,
    cooldown: 0,
    damage: config.baseDamage,
    range: config.baseRange,
    attackInterval: config.baseAttackInterval,
    color: config.color,
    specialEffect: config.specialEffect,
    splashRadius: config.splashRadius,
    slowFactor: config.slowFactor,
    slowDuration: config.slowDuration,
    targetId: null,
  };
}

export function upgradeTower(tower: TowerInstance): TowerInstance {
  const factor = 1.2;
  return {
    ...tower,
    level: tower.level + 1,
    damage: Math.floor(tower.damage * factor),
    range: Math.floor(tower.range * factor),
    attackInterval: Math.floor(tower.attackInterval * 0.9),
  };
}

export const GRID_COLS = 9;
export const GRID_ROWS = 6;
export const CELL_SIZE = 80;

export const GAME_WIDTH = GRID_COLS * CELL_SIZE;
export const GAME_HEIGHT = GRID_ROWS * CELL_SIZE;

export const CANVAS_WIDTH = 960;
export const CANVAS_HEIGHT = 540;

export const GRID_OFFSET_X = (CANVAS_WIDTH - GAME_WIDTH) / 2;
export const GRID_OFFSET_Y = (CANVAS_HEIGHT - GAME_HEIGHT) / 2;

export const PATH_ROWS = [2, 3, 4];

export function isPathCell(gridX: number, gridY: number): boolean {
  return PATH_ROWS.includes(gridY);
}
