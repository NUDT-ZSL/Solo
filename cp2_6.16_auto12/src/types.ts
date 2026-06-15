export type EnemyType = 'normal' | 'elite' | 'boss';

export type BulletPatternType = 'aimed' | 'fan' | 'spiral';

export type PlayableStatus = 'ready' | 'running' | 'paused' | 'victory' | 'defeat';

export interface Position {
  x: number;
  y: number;
}

export interface BezierPath {
  controlPoints: [Position, Position, Position];
  duration: number;
}

export interface BulletPattern {
  type: BulletPatternType;
  fireRate: number;
  bulletSpeed: number;
  bulletColor: string;
  bulletSize: number;
  angle?: number;
  count?: number;
}

export interface EnemyInstance {
  id: string;
  type: EnemyType;
  spawnTime: number;
  initialPosition: Position;
  path: BezierPath;
  bulletPattern: BulletPattern;
  health: number;
}

export interface LevelData {
  id: string;
  name: string;
  duration: number;
  enemies: EnemyInstance[];
}

export interface EnemyConfig {
  type: EnemyType;
  width: number;
  height: number;
  color: string;
  health: number;
}

export const ENEMY_CONFIGS: Record<EnemyType, EnemyConfig> = {
  normal: { type: 'normal', width: 40, height: 30, color: '#64b5f6', health: 1 },
  elite: { type: 'elite', width: 50, height: 40, color: '#e65100', health: 3 },
  boss: { type: 'boss', width: 80, height: 60, color: '#7b1fa2', health: 20 }
};

export const BULLET_PATTERN_PRESETS: Record<BulletPatternType, Omit<BulletPattern, 'type'>> = {
  aimed: { fireRate: 5, bulletSpeed: 200, bulletColor: '#ff1744', bulletSize: 7, count: 1 },
  fan: { fireRate: 2, bulletSpeed: 180, bulletColor: '#ea80fc', bulletSize: 6, count: 6, angle: 60 },
  spiral: { fireRate: 8, bulletSpeed: 240, bulletColor: '#448aff', bulletSize: 8, count: 8 }
};

export interface GameState {
  mode: 'editor' | 'play';
  isPaused: boolean;
  score: number;
  lives: number;
  wave: number;
  currentTime: number;
}

export type PlayableCallback = (status: PlayableStatus) => void;
