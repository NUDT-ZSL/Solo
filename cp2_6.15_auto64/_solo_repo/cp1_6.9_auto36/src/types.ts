export type LaneIndex = 0 | 1 | 2;

export type EnergyColor = 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple';

export const ENERGY_COLORS: EnergyColor[] = ['red', 'orange', 'yellow', 'green', 'blue', 'purple'];

export const ENERGY_HEX: Record<EnergyColor, string> = {
  red: '#FF4444',
  orange: '#FF8C00',
  yellow: '#FFD700',
  green: '#00FF00',
  blue: '#0088FF',
  purple: '#9932CC'
};

export const ENERGY_HUE: Record<EnergyColor, number> = {
  red: 0,
  orange: 30,
  yellow: 55,
  green: 120,
  blue: 210,
  purple: 280
};

export type GameState = 'ready' | 'playing' | 'ended';

export interface CarState {
  x: number;
  y: number;
  targetLane: LaneIndex;
  speed: number;
  baseSpeed: number;
  energy: Record<EnergyColor, number>;
  energyFull: boolean;
  skillCooldown: number;
  boostTimer: number;
  boostMultiplier: number;
  slowTimer: number;
  slowMultiplier: number;
  currentHue: number;
}

export type ObstacleType = 'block' | 'cone' | 'fence';

export interface Obstacle {
  id: number;
  type: ObstacleType;
  x: number;
  lane: LaneIndex;
  width: number;
  height: number;
  moveOffset?: number;
  moveSpeed?: number;
  destroyed?: boolean;
}

export interface EnergyBlock {
  id: number;
  color: EnergyColor;
  x: number;
  lane: LaneIndex;
  collected: boolean;
}

export interface BoostPad {
  id: number;
  x: number;
  width: number;
  activated: boolean;
}

export type ParticleType = 'trail' | 'debris' | 'explosion';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  type: ParticleType;
}

export interface Shockwave {
  active: boolean;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  progress: number;
  hits: Set<number>;
}

export interface CollisionEvent {
  type: 'obstacle' | 'energy' | 'boost';
  obstacleId?: number;
  energyColor?: EnergyColor;
  padId?: number;
}

export interface SceneData {
  gameState: GameState;
  car: CarState;
  obstacles: Obstacle[];
  energyBlocks: EnergyBlock[];
  boostPads: BoostPad[];
  particles: Particle[];
  shockwave: Shockwave;
  score: number;
  distance: number;
  redFlashTimer: number;
  skillReadyPulse: number;
  trackOffset: number;
}

export interface InputState {
  upPressed: boolean;
  downPressed: boolean;
  spacePressed: boolean;
}

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 400;
export const CAR_WIDTH = 30;
export const CAR_HEIGHT = 25;
export const LANE_COUNT = 3;
export const TRACK_TOP = 60;
export const TRACK_BOTTOM = 340;
export const TRACK_HEIGHT = TRACK_BOTTOM - TRACK_TOP;
export const LANE_HEIGHT = TRACK_HEIGHT / LANE_COUNT;

export function getLaneY(lane: LaneIndex): number {
  return TRACK_TOP + LANE_HEIGHT * lane + LANE_HEIGHT / 2;
}
