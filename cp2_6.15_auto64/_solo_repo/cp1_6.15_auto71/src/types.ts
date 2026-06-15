export type FishSpecies = 'clownfish' | 'angelfish' | 'pufferfish';

export const FISH_COLORS: Record<FishSpecies, { primary: string; secondary: string }> = {
  clownfish: { primary: '#FF6B35', secondary: '#1E90FF' },
  angelfish: { primary: '#4ECDC4', secondary: '#2C8C85' },
  pufferfish: { primary: '#FFE66D', secondary: '#CCB800' }
};

export const FISH_NAMES: Record<FishSpecies, string> = {
  clownfish: '小丑鱼',
  angelfish: '神仙鱼',
  pufferfish: '河豚'
};

export interface Point {
  x: number;
  y: number;
}

export interface Fish {
  id: number;
  species: FishSpecies;
  x: number;
  y: number;
  baseSpeed: number;
  currentSpeed: number;
  direction: number;
  targetDirection: number;
  turnProgress: number;
  isTurning: boolean;
  pathType: 'sine' | 'zigzag';
  pathPhase: number;
  pathAmplitude: number;
  pathFrequency: number;
  health: number;
  maxHealth: number;
  isDying: boolean;
  deathProgress: number;
  isEating: boolean;
  eatProgress: number;
  chaseTarget: Point | null;
  returnTarget: Point | null;
  birthTime: number;
  lastHealthDecay: number;
}

export interface Food {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  eaten: boolean;
}

export interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  maxAlpha: number;
  progress: number;
  duration: number;
}

export interface Bubble {
  x: number;
  y: number;
  radius: number;
  speed: number;
  alpha: number;
  wobblePhase: number;
  wobbleAmplitude: number;
}

export interface Seaweed {
  x: number;
  baseHeight: number;
  segments: { angle: number; length: number }[];
  swayPhase: number;
  swaySpeed: number;
}

export interface Tooltip {
  x: number;
  y: number;
  text: string;
  alpha: number;
  duration: number;
  elapsed: number;
}

export interface FishManagerState {
  fishes: Fish[];
  ripples: Ripple[];
  feedCount: number;
}

export interface FoodManagerState {
  foods: Food[];
}
