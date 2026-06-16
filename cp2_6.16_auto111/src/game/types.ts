export interface Vector2 {
  x: number;
  y: number;
}

export interface Room {
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

export interface Corridor {
  from: Vector2;
  to: Vector2;
}

export interface Mushroom {
  x: number;
  y: number;
  radius: number;
  phase: number;
  colorStart: string;
  colorEnd: string;
}

export interface Torch {
  x: number;
  y: number;
  radius: number;
  color: string;
}

export interface Potion {
  x: number;
  y: number;
  radius: number;
  collected: boolean;
}

export interface GameMap {
  width: number;
  height: number;
  rooms: Room[];
  corridors: Corridor[];
  walls: Vector2[];
  floorTiles: Vector2[];
  mushrooms: Mushroom[];
  torches: Torch[];
  potions: Potion[];
  isWall: (x: number, y: number) => boolean;
  isFloor: (x: number, y: number) => boolean;
}

export interface LightSource {
  x: number;
  y: number;
  type: 'flashlight' | 'torch' | 'mushroom';
  radius: number;
  angle?: number;
  direction?: number;
  color: string;
  intensity: number;
}

export interface PlayerState {
  x: number;
  y: number;
  width: number;
  height: number;
  baseHeight: number;
  velocityX: number;
  velocityY: number;
  isSneaking: boolean;
  sneakAnimation: number;
  visibility: number;
  targetVisibility: number;
  opacity: number;
  health: number;
  maxHealth: number;
  hasPotion: boolean;
  potionActive: boolean;
  potionTimer: number;
  potionCooldown: number;
  potionMaxCooldown: number;
  facing: number;
}

export type EnemyState = 'patrol' | 'chase' | 'alert';

export interface Enemy {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  baseSpeed: number;
  state: EnemyState;
  patrolPoints: Vector2[];
  currentPatrolIndex: number;
  patrolDirection: 1 | -1;
  viewAngle: number;
  viewDistance: number;
  facing: number;
  alertTimer: number;
  chaseTimer: number;
  alertAnimation: number;
  playerLastSeen: Vector2 | null;
}

export interface GameState {
  player: PlayerState;
  enemies: Enemy[];
  map: GameMap;
  lightSources: LightSource[];
  lightIntensityAtPlayer: number;
  screenEffect: {
    type: 'danger' | 'success' | null;
    timer: number;
    intensity: number;
  };
  score: number;
  time: number;
  isPaused: boolean;
}

export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  sneak: boolean;
  usePotion: boolean;
}
