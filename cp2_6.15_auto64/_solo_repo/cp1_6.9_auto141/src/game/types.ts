export enum MovePattern {
  LINEAR = 'linear',
  SINUSOIDAL = 'sinusoidal',
  JITTER = 'jitter'
}

export enum CellType {
  PLAYER = 'player',
  ENEMY = 'enemy',
  NUTRIENT = 'nutrient'
}

export interface Vec2 {
  x: number;
  y: number;
}

export interface CellEntityData {
  id: string;
  parentId: string | null;
  cellType: CellType;
  position: Vec2;
  velocity: Vec2;
  targetPosition?: Vec2;
  hue: number;
  saturation: number;
  lightness: number;
  radius: number;
  divisionCount: number;
  energy: number;
  movePattern: MovePattern;
  isSelected: boolean;
  birthTime: number;
  deathTime?: number;
  aiMode?: 'wander' | 'chase';
  wanderAngle?: number;
  sinePhase?: number;
  jitterTimer?: number;
}

export interface EvolutionNode {
  cellId: string;
  hue: number;
  radius: number;
  divisionCount: number;
  birthTime: number;
  deathTime?: number;
  children: EvolutionNode[];
}

export interface GameState {
  status: 'playing' | 'gameover';
  score: number;
  survivalTime: number;
  selectedCellId: string | null;
  playerCells: string[];
  enemySpawnTimer: number;
}

export interface SplitRipple {
  x: number;
  y: number;
  hue: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  startTime: number;
  duration: number;
}

export interface BackgroundParticle {
  x: number;
  y: number;
  radius: number;
  baseAlpha: number;
  phase: number;
  speed: number;
}

export interface GameEngineCallbacks {
  onStateChange: (state: Partial<GameState>) => void;
  onGameOver: (rootNode: EvolutionNode) => void;
  onSelectedCellChange: (cell: CellEntityData | null) => void;
}
