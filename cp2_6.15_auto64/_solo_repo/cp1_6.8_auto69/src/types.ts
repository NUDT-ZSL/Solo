export interface Vec2 {
  x: number;
  y: number;
}

export type AIStyle = 'aggressive' | 'defensive' | 'balanced';
export type ItemType = 'nitro' | 'shield' | null;
export type GamePhase = 'countdown' | 'racing' | 'finished';

export interface TrackSegment {
  center: Vec2;
  left: Vec2;
  right: Vec2;
  angle: number;
  width: number;
}

export interface TrailPoint {
  x: number;
  y: number;
  alpha: number;
}

export interface VehicleState {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  speed: number;
  maxSpeed: number;
  accel: number;
  handling: number;
  isPlayer: boolean;
  isDrifting: boolean;
  driftFactor: number;
  item: ItemType;
  shieldActive: boolean;
  shieldTimer: number;
  nitroActive: boolean;
  nitroTimer: number;
  cooldown: number;
  color: string;
  trailColor: string;
  trail: TrailPoint[];
  lap: number;
  checkpointIdx: number;
  lapTimes: number[];
  lapStartTime: number;
  isHit: boolean;
  hitTimer: number;
  aiStyle: AIStyle;
  name: string;
  finished: boolean;
  finishTime: number;
  itemsCollected: number;
  trackProgress: number;
  steerAngle: number;
}

export interface Hazard {
  type: 'rock' | 'crack';
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  rotation: number;
  rotSpeed: number;
  life: number;
  maxLife: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  kind: 'fire' | 'smoke' | 'spark' | 'nitro' | 'shield';
}

export interface ItemPickup {
  x: number;
  y: number;
  type: ItemType;
  radius: number;
  segIdx: number;
  collected: boolean;
  respawn: number;
}

export interface PlayerInput {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  drift: boolean;
  useItem: boolean;
}

export interface RankingEntry {
  id: number;
  name: string;
  lap: number;
  progress: number;
  finished: boolean;
  finishTime: number;
  color: string;
}

export interface ResultEntry {
  name: string;
  color: string;
  totalTime: number;
  fastestLap: number;
  itemsCollected: number;
  rank: number;
}

export interface GameResult {
  rankings: ResultEntry[];
  playerRank: number;
  fastestLap: number;
  itemsCollected: number;
  totalTime: number;
}

export interface GameUIState {
  phase: GamePhase;
  countdown: number;
  speed: number;
  maxSpeed: number;
  item: ItemType;
  shieldActive: boolean;
  nitroActive: boolean;
  cooldown: number;
  lap: number;
  totalLaps: number;
  rank: number;
  rankings: RankingEntry[];
  elapsed: number;
  result: GameResult | null;
  track: TrackSegment[];
  vehicles: VehicleState[];
}

export const TRACK_POINTS = 400;
export const TRACK_WIDTH = 150;
export const TOTAL_LAPS = 3;
export const AI_COUNT = 4;
export const CAR_LEN = 28;
export const CAR_WID = 14;
