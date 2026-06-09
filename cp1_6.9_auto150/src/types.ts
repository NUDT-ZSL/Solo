export interface Vector2 {
  x: number;
  y: number;
}

export type FragmentType = 'normal' | 'pulse' | 'dark';

export interface Fragment {
  id: number;
  pos: Vector2;
  vel: Vector2;
  radius: number;
  hue: number;
  mass: number;
  type: FragmentType;
  pulsePhase: number;
  inGravityZone: boolean;
  gravityZoneTimer: number;
  hovered: boolean;
  assignedZoneId: number | null;
}

export interface GravityBall {
  id: number;
  pos: Vector2;
  vel: Vector2;
  targetPos: Vector2;
  radius: number;
  mass: number;
  active: boolean;
  arrived: boolean;
  lifeTime: number;
  maxLifeTime: number;
}

export interface StarZone {
  id: number;
  gridX: number;
  gridY: number;
  lit: boolean;
  litCount: number;
  shape: 'hexagon' | 'star' | null;
  hue: number;
}

export interface GravityWave {
  id: number;
  pos: Vector2;
  radius: number;
  maxRadius: number;
  alpha: number;
  hue: number;
  life: number;
  maxLife: number;
}

export interface Particle {
  id: number;
  pos: Vector2;
  vel: Vector2;
  life: number;
  maxLife: number;
  radius: number;
  hue: number;
}

export interface DragState {
  dragging: boolean;
  startPos: Vector2 | null;
  currentPos: Vector2 | null;
}

export interface RenderData {
  fragments: Fragment[];
  gravityBalls: GravityBall[];
  starZones: StarZone[];
  gravityWaves: GravityWave[];
  particles: Particle[];
  stars: Array<{ x: number; y: number; size: number; phase: number; period: number }>;
  dragState: DragState;
  level: number;
  litCount: number;
  totalZones: number;
  canvasWidth: number;
  canvasHeight: number;
}

export const GAME_CONFIG = {
  CANVAS_RATIO: 16 / 9,
  MIN_WIDTH: 800,
  MIN_HEIGHT: 600,
  GRID_COLS: 6,
  GRID_ROWS: 6,
  FRAGMENT_SPAWN_INTERVAL: 3000,
  FRAGMENT_SPAWN_MIN: 15,
  FRAGMENT_SPAWN_MAX: 20,
  FRAGMENT_RADIUS_MIN: 6,
  FRAGMENT_RADIUS_MAX: 12,
  FRAGMENT_SPEED_MIN: 1,
  FRAGMENT_SPEED_MAX: 3,
  HUE_MIN: 0,
  HUE_MAX: 240,
  GRAVITY_BALL_MIN_RADIUS: 20,
  GRAVITY_BALL_MAX_RADIUS: 40,
  GRAVITY_BALL_MIN_MASS: 1,
  GRAVITY_BALL_MAX_MASS: 5,
  MASS_PER_100PX: 1,
  GRAVITY_RADIUS_PER_MASS: 30,
  GRAVITY_BALL_MIN_RADIUS_EFFECT: 100,
  GRAVITY_BALL_MAX_RADIUS_EFFECT: 250,
  GRAVITY_BALL_DURATION: 5000,
  MAX_GRAVITY_BALLS: 3,
  AGGREGATION_RADIUS: 25,
  AGGREGATION_SPACING: 30,
  AGGREGATION_TIME: 500,
  AGGREGATION_MIN_COUNT: 6,
  AGGREGATION_MAX_COUNT: 8,
  ZONES_PER_LEVEL: 4,
  LEVEL_SPEED_INCREASE: 0.1,
  WAVE_MAX_RADIUS: 150,
  WAVE_DURATION: 1000,
  PARTICLE_COUNT: 20,
  PARTICLE_DURATION: 500,
  FRAGMENT_MERGE_THRESHOLD: 5,
  FRAGMENT_MERGE_TRIGGER: 300,
  MAX_PHYSICS_CALCS: 500,
  PULSE_INTERVAL: 1500,
  AUTO_PULSE_INTERVAL: 10000,
  DARK_MASS_MULTIPLIER: 2
};
