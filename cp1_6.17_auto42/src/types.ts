export type Quality = 'common' | 'fine' | 'excellent' | 'perfect';

export type EventType = 
  | 'cauldron_smoke' 
  | 'spark_splash' 
  | 'price_fluctuation' 
  | 'apprentice_gift'
  | 'quality_mutation'
  | 'cauldron_explosion';

export interface Material {
  id: string;
  name: string;
  icon: string;
  quantity: number;
}

export interface RecipeIngredient {
  materialId: string;
  minRatio: number;
  maxRatio: number;
  required: number;
}

export interface Recipe {
  id: string;
  name: string;
  description: string;
  ingredients: RecipeIngredient[];
  baseValue: number;
  icon: string;
}

export interface Potion {
  id: string;
  recipeId: string;
  name: string;
  quality: Quality;
  icon: string;
  quantity: number;
  createdAt: number;
}

export interface ShopItem {
  id: string;
  potionId: string;
  potionName: string;
  quality: Quality;
  price: number;
  sellerId: string;
  listedAt: number;
}

export interface CauldronIngredient {
  materialId: string;
  quantity: number;
}

export interface ActiveEvent {
  id: string;
  type: EventType;
  message: string;
  action?: string;
  timeoutAt: number;
  createdAt: number;
}

export interface LoggedEvent {
  id: string;
  type: EventType;
  message: string;
  timestamp: number;
}

export interface WorkshopState {
  materials: Material[];
  recipes: Recipe[];
  selectedRecipeId: string | null;
  cauldron: CauldronIngredient[];
  inventory: Potion[];
  shopItems: ShopItem[];
  gold: number;
  alchemyProgress: number;
  isAlchemizing: boolean;
  alchemyStartTime: number | null;
  activeEvent: ActiveEvent | null;
  eventLog: LoggedEvent[];
  successfulAlchemies: number;
  qualityPenalty: number;
  materialLossMultiplier: number;
  priceMultiplier: number;
  isBrewFailed: boolean;
  showRecipePanel: boolean;
  currentPage: number;
  itemsPerPage: number;
}

export type AlchemyAction =
  | { type: 'SELECT_RECIPE'; recipeId: string | null }
  | { type: 'ADD_MATERIAL'; materialId: string; quantity: number }
  | { type: 'REMOVE_MATERIAL'; materialId: string; quantity: number }
  | { type: 'CLEAR_CAULDRON' }
  | { type: 'START_ALCHEMY' }
  | { type: 'UPDATE_PROGRESS'; progress: number }
  | { type: 'TRIGGER_EVENT'; event: ActiveEvent }
  | { type: 'RESOLVE_EVENT'; success: boolean }
  | { type: 'FINISH_ALCHEMY'; result: { success: boolean; potion?: Potion } }
  | { type: 'LOG_EVENT'; event: LoggedEvent }
  | { type: 'LIST_FOR_SALE'; potionId: string; price: number }
  | { type: 'BUY_ITEM'; itemId: string; buyerId: string }
  | { type: 'UPDATE_MATERIALS'; materials: Material[] }
  | { type: 'UPDATE_PRICE_MULTIPLIER'; multiplier: number }
  | { type: 'UPDATE_QUALITY_PENALTY'; penalty: number }
  | { type: 'INCREMENT_SUCCESS_COUNT' }
  | { type: 'TOGGLE_RECIPE_PANEL' }
  | { type: 'SET_PAGE'; page: number }
  | { type: 'ADD_GOLD'; amount: number }
  | { type: 'ADD_MATERIAL_BONUS'; materialId: string; quantity: number };

export const QUALITY_COLORS: Record<Quality, string> = {
  common: '#9E9E9E',
  fine: '#2196F3',
  excellent: '#9C27B0',
  perfect: '#FFD700'
};

export const QUALITY_STARS: Record<Quality, number> = {
  common: 1,
  fine: 2,
  excellent: 3,
  perfect: 4
};
