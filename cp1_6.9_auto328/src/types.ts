export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type MaterialType = 'plant' | 'ore' | 'potion' | 'hazard';

export interface Material {
  id: string;
  name: string;
  type: MaterialType;
  color: string;
  icon: string;
  isHazard?: boolean;
  price?: number;
}

export interface Potion {
  id: string;
  name: string;
  recipe: string[];
  color: string;
  glowColor: string;
}

export interface Recipe {
  potionId: string;
  materials: string[];
  completed: boolean;
}

export type ParticleType =
  | 'plantDust'
  | 'oreSpark'
  | 'potionDrop'
  | 'steam'
  | 'successBurst'
  | 'failSmoke'
  | 'candleFlame'
  | 'furnaceFire'
  | 'dangerExplosion'
  | 'edgeGlow';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  type: ParticleType;
  alpha: number;
  rotation?: number;
  rotationSpeed?: number;
}

export type GamePhase =
  | 'menu'
  | 'recipeScroll'
  | 'playing'
  | 'brewing'
  | 'result'
  | 'shop'
  | 'levelComplete'
  | 'gameOver'
  | 'workshopClosed';

export interface GameState {
  phase: GamePhase;
  level: number;
  timeLeft: number;
  maxTime: number;
  health: number;
  maxHealth: number;
  coins: number;
  materials: Material[];
  hazardMaterials: Material[];
  currentRecipe: Recipe[];
  cauldronContents: string[];
  potions: Potion[];
  storedPotions: Potion[];
  brewedPotionIds: Set<string>;
  scrollProgress: number;
  brewingTimer: number;
  resultTimer: number;
  lastResult: 'success' | 'fail' | null;
  cauldronCooldown: number;
  cauldronErrorTimer: number;
  screenShake: number;
  screenShakeX: number;
  screenShakeY: number;
  redFlash: number;
  stunTimer: number;
  dangerMaskAlpha: number;
  inventory: Record<string, number>;
  shopOpen: boolean;
  shopSlideProgress: number;
  hoveredMaterial: string | null;
  hoveredPotion: number | null;
  dragMaterial: Material | null;
  dragPosition: Position;
  dragPotionIndex: number | null;
  sellWindowHighlight: boolean;
  successfulBreaks: number;
  backgroundPhase: number;
}

export interface LevelConfig {
  level: number;
  requiredPotions: number;
  includeHazards: boolean;
}

export const LEVEL_CONFIGS: LevelConfig[] = [
  { level: 1, requiredPotions: 3, includeHazards: false },
  { level: 2, requiredPotions: 4, includeHazards: false },
  { level: 3, requiredPotions: 5, includeHazards: true },
  { level: 4, requiredPotions: 5, includeHazards: true },
  { level: 5, requiredPotions: 5, includeHazards: true },
];
