export type TowerType = 'arrow' | 'cannon' | 'magic';
export type EnemyType = 'normal' | 'heavy' | 'flying';
export type ResourceType = 'gold' | 'wood';

export interface Position {
  x: number;
  y: number;
}

export interface Tower {
  id: string;
  type: TowerType;
  gridX: number;
  gridY: number;
  level: number;
  rotation: number;
  placeTime: number;
  lastAttackTime: number;
  flashTime: number;
}

export interface Enemy {
  id: string;
  type: EnemyType;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  pathIndex: number;
  isDead: boolean;
  deathTime: number;
  isFrozen: boolean;
  frozenTime: number;
}

export interface Projectile {
  id: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  color: string;
  speed: number;
  towerType: TowerType;
  targetId: string;
}

export interface ResourcePoint {
  id: string;
  type: ResourceType;
  gridX: number;
  gridY: number;
  remainingClicks: number;
  lastCollectTime: number;
  floatTexts: FloatText[];
}

export interface FloatText {
  id: string;
  text: string;
  color: string;
  x: number;
  y: number;
  startTime: number;
  duration: number;
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  maxLife: number;
  type: 'explosion' | 'ice' | 'shockwave';
  size?: number;
}

export interface GameState {
  towers: Tower[];
  enemies: Enemy[];
  projectiles: Projectile[];
  resources: ResourcePoint[];
  particles: Particle[];
  gold: number;
  wood: number;
  lives: number;
  wave: number;
  isPlaying: boolean;
  freezeActive: boolean;
  freezeEndTime: number;
  freezeCooldownEnd: number;
  warningFlashTime: number;
}

export const TOWER_CONFIG: Record<TowerType, {
  range: number;
  damage: number;
  attackSpeed: number;
  color: string;
  projectileColor: string;
  cost: { gold: number; wood: number };
}> = {
  arrow: {
    range: 2,
    damage: 15,
    attackSpeed: 500,
    color: '#4a7c59',
    projectileColor: '#00ff00',
    cost: { gold: 50, wood: 30 }
  },
  cannon: {
    range: 3,
    damage: 40,
    attackSpeed: 1200,
    color: '#8b4513',
    projectileColor: '#ff4444',
    cost: { gold: 100, wood: 50 }
  },
  magic: {
    range: 4,
    damage: 25,
    attackSpeed: 800,
    color: '#6a0dad',
    projectileColor: '#9932cc',
    cost: { gold: 80, wood: 40 }
  }
};

export const ENEMY_CONFIG: Record<EnemyType, {
  hp: number;
  speed: number;
  color: string;
}> = {
  normal: { hp: 50, speed: 1.2, color: '#6c757d' },
  heavy: { hp: 200, speed: 0.5, color: '#495057' },
  flying: { hp: 80, speed: 0.9, color: '#74c0fc' }
};

export const GRID_SIZE = 4;
export const CELL_SIZE = 100;
export const CANVAS_WIDTH = GRID_SIZE * CELL_SIZE;
export const CANVAS_HEIGHT = GRID_SIZE * CELL_SIZE;
