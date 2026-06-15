export interface Potion {
  id: string;
  name: string;
  color: string;
  description: string;
  icon: string;
}

export interface Product {
  id: string;
  name: string;
  color: string;
  description: string;
  icon: string;
}

export interface Recipe {
  ingredients: [string, string];
  product: Product;
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  startColor: string;
  endColor: string;
  gravity: number;
}

export interface ReactionResult {
  success: boolean;
  product?: Product;
  particleConfig: {
    count: number;
    startColor: string;
    endColor: string;
    duration: number;
    spreadRadius: number;
    minSize: number;
    maxSize: number;
    gravity: number;
    emitFrom: 'bottom' | 'top' | 'center';
  };
  shakeDuration: number;
  shakeIntensity: number;
  liquidColor?: string;
}

export interface RenderState {
  particles: Particle[];
  liquidColor: string;
  shakeAngle: number;
  productDisplay: ProductDisplayState | null;
  crucibleHighlight: number;
  victoryParticles: Particle[];
  victoryActive: boolean;
}

export interface ProductDisplayState {
  product: Product;
  startTime: number;
  duration: number;
  typedText: string;
}

export interface DiscoveredRecipe {
  potionA: Potion;
  potionB: Potion;
  product: Product;
  discoveredAt: number;
}

export type DragState =
  | { active: false }
  | { active: true; potion: Potion; x: number; y: number };
