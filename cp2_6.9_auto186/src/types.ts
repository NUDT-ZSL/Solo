export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface Vec2 {
  x: number;
  y: number;
}

export interface Jellyfish {
  id: number;
  pos: Vec2;
  vel: Vec2;
  radius: number;
  baseRadius: number;
  color: RGB;
  targetColor: RGB;
  colorBlendProgress: number;
  glowPhase: number;
  glowFrequency: number;
  baseGlowFrequency: number;
  energy: number;
  maxEnergy: number;
  age: number;
  lifespan: number;
  isDead: boolean;
  deathProgress: number;
  tentaclePhase: number;
  speedBoostTime: number;
  colorTransitionTime: number;
  warningPulsePhase: number;
}

export interface NutrientBall {
  id: number;
  pos: Vec2;
  color: RGB;
  radius: number;
  pulsePhase: number;
  targetPos: Vec2;
  spawnProgress: number;
  absorbed: boolean;
}

export interface MatingPair {
  id1: number;
  id2: number;
  proximityTime: number;
  lineActive: boolean;
  lineTime: number;
  offspringCreated: boolean;
}

export interface DisturbanceLine {
  points: Vec2[];
  startTime: number;
  duration: number;
  direction: Vec2;
}

export interface StatCard {
  label: string;
  value: number;
  lastAnimated: number;
  bounceProgress: number;
  prevValue: number;
}

export type NutrientColor = 'red' | 'blue' | 'purple' | 'green' | 'orange';

export const NUTRIENT_COLORS: Record<NutrientColor, RGB> = {
  red: { r: 255, g: 107, b: 107 },
  blue: { r: 78, g: 205, b: 196 },
  purple: { r: 155, g: 89, b: 182 },
  green: { r: 46, g: 204, b: 113 },
  orange: { r: 230, g: 126, b: 34 }
};

export const NUTRIENT_COLOR_KEYS: NutrientColor[] = ['red', 'blue', 'purple', 'green', 'orange'];

export const MAX_JELLYFISH = 20;
export const COLLISION_THRESHOLD = 2;
export const MATING_DISTANCE = 80;
export const MATING_REQUIRED_TIME = 3;
export const MATING_LINE_DURATION = 1;
export const ADULT_RADIUS = 40;
export const OFFSPRING_SPEED_MULTIPLIER = 1.5;
export const PARENT_SHRINK_FACTOR = 0.9;
export const MIN_PARENT_RADIUS = 25;
export const SPEED_BOOST_DURATION = 2;
export const SPEED_BOOST_MULTIPLIER = 1.5;
export const GLOW_BOOST_MULTIPLIER = 2;
export const DISTURBANCE_DURATION = 0.5;
export const DISTURBANCE_WIDTH = 40;
