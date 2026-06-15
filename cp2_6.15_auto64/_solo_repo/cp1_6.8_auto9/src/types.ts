export enum Dimension {
  Reality = 'reality',
  Mirror = 'mirror',
}

export enum GameState {
  Menu = 'menu',
  Playing = 'playing',
  DimensionTransition = 'dimension_transition',
  BossFight = 'boss_fight',
  LevelTransition = 'level_transition',
  GameOver = 'game_over',
  Victory = 'victory',
}

export interface Vector2 {
  x: number;
  y: number;
}

export interface PlayerState {
  position: Vector2;
  velocity: Vector2;
  facing: 1 | -1;
  isMoving: boolean;
  isOnGround: boolean;
  health: number;
  maxHealth: number;
  isAttacking: boolean;
  attackCooldown: number;
  isCastingDecoy: boolean;
  decoyCooldown: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  opacity: number;
  type: 'dust' | 'fragment_glow' | 'ink_splash' | 'boss_shatter';
}

export interface GameObject {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: string;
  interactive: boolean;
  solid: boolean;
  realityForm: { color: string; label: string; state: string };
  mirrorForm: { color: string; label: string; state: string };
}

export interface Platform {
  x: number;
  y: number;
  width: number;
  height: number;
  dimension: Dimension | 'both';
  type: 'ground' | 'bridge' | 'floating';
}

export interface GameSnapshot {
  gameState: GameState;
  currentDimension: Dimension;
  currentLevel: number;
  timeRemaining: number;
  fragmentsCollected: number;
  totalFragments: number;
  playerHealth: number;
  maxHealth: number;
  bossHealth: number;
  bossMaxHealth: number;
  isMobile: boolean;
  transitionProgress: number;
  levelName: string;
  isPortalActive: boolean;
  bossWeakPointExposed: boolean;
}
