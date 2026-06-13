export interface Position {
  x: number;
  y: number;
}

export interface HexCell {
  q: number;
  r: number;
  x: number;
  y: number;
  occupied: boolean;
  plantId?: string;
}

export type PlantType = 'sunflower' | 'peashooter' | 'wallnut';
export type EnemyType = 'bee' | 'beetle' | 'butterfly';

export interface PlantConfig {
  type: PlantType;
  name: string;
  cost: number;
  health: number;
  damage: number;
  attackSpeed: number;
  range: number;
  color: string;
  size: number;
}

export interface EnemyConfig {
  type: EnemyType;
  name: string;
  health: number;
  speed: number;
  damage: number;
  score: number;
  color: string;
  size: number;
  dodgeChance?: number;
}

export interface PlantUnit {
  id: string;
  type: PlantType;
  cellQ: number;
  cellR: number;
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  cooldown: number;
  maxCooldown: number;
  attackTimer: number;
  scale: number;
  spawnTime: number;
}

export interface EnemyUnit {
  id: string;
  type: EnemyType;
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  speed: number;
  pathIndex: number;
  path: Position[];
  targetPlantId?: string;
  attackTimer: number;
  dodgeChance: number;
}

export interface Bullet {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  targetId: string;
  color: string;
  trail: BulletTrail[];
}

export interface BulletTrail {
  x: number;
  y: number;
  alpha: number;
  radius: number;
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  radius: number;
  alpha: number;
  decay: number;
  life: number;
  maxLife: number;
}

export interface GameState {
  score: number;
  health: number;
  sunlight: number;
  wave: number;
  isGameOver: boolean;
  isPaused: boolean;
  selectedPlant: PlantType | null;
}

export const PLANT_CONFIGS: Record<PlantType, PlantConfig> = {
  sunflower: {
    type: 'sunflower',
    name: '向日葵',
    cost: 50,
    health: 100,
    damage: 0,
    attackSpeed: 5,
    range: 0,
    color: '#FFD700',
    size: 30,
  },
  peashooter: {
    type: 'peashooter',
    name: '豌豆射手',
    cost: 100,
    health: 100,
    damage: 10,
    attackSpeed: 1.5,
    range: 400,
    color: '#4CAF50',
    size: 28,
  },
  wallnut: {
    type: 'wallnut',
    name: '坚果墙',
    cost: 50,
    health: 500,
    damage: 0,
    attackSpeed: 0,
    range: 0,
    color: '#8B4513',
    size: 34,
  },
};

export const ENEMY_CONFIGS: Record<EnemyType, EnemyConfig> = {
  bee: {
    type: 'bee',
    name: '蜜蜂',
    health: 30,
    speed: 80,
    damage: 10,
    score: 10,
    color: '#FFEB3B',
    size: 18,
  },
  beetle: {
    type: 'beetle',
    name: '甲虫',
    health: 80,
    speed: 40,
    damage: 20,
    score: 20,
    color: '#5D4037',
    size: 24,
  },
  butterfly: {
    type: 'butterfly',
    name: '蝴蝶',
    health: 20,
    speed: 120,
    damage: 5,
    score: 5,
    color: '#E91E63',
    size: 16,
    dodgeChance: 0.3,
  },
};

export const HEX_CONFIG = {
  size: 40,
  horizontalSpacing: 80,
  verticalSpacing: 70,
  rowOffset: 40,
  cols: 8,
  rows: 8,
};
