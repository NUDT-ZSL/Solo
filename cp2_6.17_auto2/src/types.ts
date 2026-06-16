export interface Tile {
  x: number;
  y: number;
  type: 0 | 1 | 2 | 3;
}

export interface Enemy {
  id: string;
  type: 'patrol' | 'searchlight' | 'dog';
  x: number;
  y: number;
  pathPoints: { x: number; y: number }[];
  currentPathIndex?: number;
  direction?: number;
  state?: 'patrol' | 'alert' | 'chase' | 'investigate';
  alertTimer?: number;
  detectTimer?: number;
  visionAngle?: number;
  rotationSpeed?: number;
  barkCooldown?: number;
}

export interface TargetItem {
  id: string;
  x: number;
  y: number;
  name: string;
  stealTime: number;
  stolen: boolean;
}

export interface LevelData {
  id: string;
  name: string;
  width: number;
  height: number;
  tileSize: number;
  tiles: number[][];
  enemies: Enemy[];
  targetItems: TargetItem[];
  playerSpawn: { x: number; y: number };
  exitPoint: { x: number; y: number };
}

export interface LevelProgress {
  levelId: string;
  stolenItems: string[];
  completed: boolean;
  unlocked: boolean;
}

export interface GameState {
  currentScene: 'menu' | 'levelSelect' | 'playing' | 'paused' | 'gameover' | 'victory';
  currentLevel: string | null;
  progress: Record<string, LevelProgress>;
}

export type AlertLevel = 'safe' | 'warning' | 'alarm';

export interface HUDData {
  alertLevel: AlertLevel;
  stolenCount: number;
  totalItems: number;
  echoCooldown: number;
  maxEchoCooldown: number;
  detectionProgress: number;
  currentLevelName: string;
}
