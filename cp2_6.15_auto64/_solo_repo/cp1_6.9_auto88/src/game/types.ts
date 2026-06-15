export type TowerType = 'attract' | 'repel' | 'lock';

export interface Vector2 {
  x: number;
  y: number;
}

export interface PathPoint extends Vector2 {}

export interface TowerConfig {
  type: TowerType;
  cost: number;
  baseRadius: number;
  baseDamage: number;
  color: string;
  cooldown: number;
  upgradeCost: number;
}

export const TOWER_CONFIGS: Record<TowerType, TowerConfig> = {
  attract: {
    type: 'attract',
    cost: 50,
    baseRadius: 80,
    baseDamage: 0,
    color: '#4488FF',
    cooldown: 2,
    upgradeCost: 30,
  },
  repel: {
    type: 'repel',
    cost: 60,
    baseRadius: 100,
    baseDamage: 0,
    color: '#FF6644',
    cooldown: 2,
    upgradeCost: 35,
  },
  lock: {
    type: 'lock',
    cost: 80,
    baseRadius: 90,
    baseDamage: 15,
    color: '#AA66FF',
    cooldown: 2,
    upgradeCost: 45,
  },
};

export const GRID_SIZE = 40;
export const CELL_SIZE = 40;
export const BASE_SPEED = 40;
