export interface Vector2 {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export enum Role {
  HUNTER = 'hunter',
  STALKER = 'stalker'
}

export enum MoveSpeed {
  SPRINT = 3,
  WALK = 1.5,
  CROUCH = 0.5
}

export interface Player {
  role: Role;
  position: Vector2;
  velocity: Vector2;
  moveSpeed: MoveSpeed;
  isCrouching: boolean;
  isOnWall: boolean;
  direction: number;
  shadowCloneCooldown: number;
  shadowCloneActive: boolean;
  health: number;
  shield: number;
}

export interface SonarWave {
  id: number;
  origin: Vector2;
  radius: number;
  maxRadius: number;
  speed: number;
  reflections: SonarReflection[];
  isFake: boolean;
  createdAt: number;
}

export interface SonarReflection {
  points: Vector2[];
  isHit: boolean;
  hitTime: number;
  signalStrength: number;
}

export interface SonarFeedbackPoint {
  position: Vector2;
  isHit: boolean;
  timestamp: number;
  strength: number;
}

export interface Room {
  bounds: Rect;
  corridors: Rect[];
  furniture: Rect[];
}

export interface GameMap {
  width: number;
  height: number;
  walls: Rect[];
  rooms: Room[];
  furniture: Rect[];
  floorGrid: Vector2[];
}

export interface HunterStats {
  captureTime: number;
  sonarCount: number;
  detectionCount: number;
}

export interface StalkerStats {
  surviveTime: number;
  moveDistance: number;
  shadowCloneCount: number;
}

export interface GameStats {
  hunter: HunterStats;
  stalker: StalkerStats;
  winner: Role | null;
  gameOver: boolean;
}

export interface GameState {
  timeRemaining: number;
  totalTime: number;
  stats: GameStats;
  hunter: Player;
  stalker: Player;
  map: GameMap;
  sonarWaves: SonarWave[];
  sonarFeedback: SonarFeedbackPoint[];
  isRunning: boolean;
  hitFlash: number;
  shadowEffect: {
    active: boolean;
    startTime: number;
    duration: number;
  };
}

export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  sprint: boolean;
  crouch: boolean;
  onWall: boolean;
  skill: boolean;
}
