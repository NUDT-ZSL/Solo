import { Material, Recipe, BrewingState, FinishedPotion } from './gameLogic';

export interface AppState {
  materials: Material[];
  recipeTemplates: Recipe[];
  currentRecipe: Recipe | null;
  brewingState: BrewingState;
  inventory: Record<string, number>;
  finishedPotions: FinishedPotion[];
  draggingMaterial: Material | null;
  dragPosition: { x: number; y: number };
  isBrewing: boolean;
  showResult: boolean;
  lastResult: { success: boolean; quality: number; feedback: string } | null;
  splashParticles: SplashParticle[];
  vortexParticles: VortexParticle[];
  smokeParticles: SmokeParticle[];
  glowFlashes: GlowFlash[];
  bottleFlash: boolean;
  potionGlow: boolean;
}

export interface SplashParticle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  maxLife: number;
}

export interface VortexParticle {
  id: number;
  angle: number;
  radius: number;
  speed: number;
  color: string;
  life: number;
}

export interface SmokeParticle {
  id: number;
  x: number;
  y: number;
  size: number;
  alpha: number;
  vy: number;
  life: number;
}

export interface GlowFlash {
  id: number;
  x: number;
  y: number;
  color: string;
  life: number;
  maxLife: number;
  maxRadius: number;
}

export type AppAction =
  | { type: 'SET_MATERIALS'; payload: Material[] }
  | { type: 'SET_RECIPES'; payload: Recipe[] }
  | { type: 'SET_CURRENT_RECIPE'; payload: Recipe }
  | { type: 'GENERATE_NEW_RECIPE' }
  | { type: 'ADD_MATERIAL'; payload: { materialId: string; amount: number } }
  | { type: 'SET_HEAT'; payload: number }
  | { type: 'INCREMENT_STIR' }
  | { type: 'RESET_BREWING' }
  | { type: 'START_DRAGGING'; payload: Material }
  | { type: 'UPDATE_DRAG_POSITION'; payload: { x: number; y: number } }
  | { type: 'STOP_DRAGGING' }
  | { type: 'DROP_MATERIAL'; payload: { materialId: string; x: number; y: number } }
  | { type: 'ADD_SPLASH_PARTICLES'; payload: SplashParticle[] }
  | { type: 'ADD_VORTEX_PARTICLE'; payload: VortexParticle }
  | { type: 'REMOVE_PARTICLES' }
  | { type: 'BOTTLE_POTION' }
  | { type: 'SET_RESULT'; payload: { success: boolean; quality: number; feedback: string } }
  | { type: 'HIDE_RESULT' }
  | { type: 'ADD_SMOKE_PARTICLES'; payload: SmokeParticle[] }
  | { type: 'TRIGGER_BOTTLE_FLASH' }
  | { type: 'SET_POTION_GLOW'; payload: boolean }
  | { type: 'ADD_GLOW_FLASH'; payload: GlowFlash };
