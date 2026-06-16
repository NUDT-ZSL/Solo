export type Quality = 'common' | 'fine' | 'epic';

export type EventType = 'success' | 'minorBoom' | 'majorBoom' | 'perfect';

export interface Ingredient {
  id: string;
  name: string;
  icon: string;
  baseSuccessRate: number;
  color: string;
  weight: number;
}

export interface PotionResult {
  name: string;
  probability: number;
  baseQuantity: number;
  baseQuality: Quality;
  basePrice: number;
}

export interface Recipe {
  ingredients: string[];
  results: PotionResult[];
}

export interface BrewResult {
  eventType: EventType;
  potionName: string;
  quality: Quality;
  quantity: number;
  goldPenalty: number;
  stopProgress: number;
}

export const INGREDIENTS: Ingredient[] = [
  {
    id: 'moonlight_grass',
    name: '月光草',
    icon: '🌿',
    baseSuccessRate: 0.05,
    color: '#88CCFF',
    weight: 10,
  },
  {
    id: 'fire_flower',
    name: '火焰花',
    icon: '🌺',
    baseSuccessRate: 0.03,
    color: '#FF6644',
    weight: 12,
  },
  {
    id: 'dragon_scale',
    name: '龙鳞',
    icon: '🐉',
    baseSuccessRate: 0.08,
    color: '#22CC66',
    weight: 25,
  },
  {
    id: 'unicorn_tear',
    name: '独角兽泪',
    icon: '💎',
    baseSuccessRate: 0.1,
    color: '#EEDDFF',
    weight: 8,
  },
];

export const RECIPES: Recipe[] = [
  {
    ingredients: ['moonlight_grass'],
    results: [
      { name: '微光药水', probability: 1, baseQuantity: 2, baseQuality: 'common', basePrice: 15 },
    ],
  },
  {
    ingredients: ['fire_flower'],
    results: [
      { name: '火焰药水', probability: 1, baseQuantity: 2, baseQuality: 'common', basePrice: 18 },
    ],
  },
  {
    ingredients: ['dragon_scale'],
    results: [
      { name: '坚肤药水', probability: 1, baseQuantity: 1, baseQuality: 'fine', basePrice: 35 },
    ],
  },
  {
    ingredients: ['unicorn_tear'],
    results: [
      { name: '净化药水', probability: 1, baseQuantity: 1, baseQuality: 'fine', basePrice: 40 },
    ],
  },
  {
    ingredients: ['fire_flower', 'moonlight_grass'],
    results: [
      { name: '治疗药水', probability: 0.5, baseQuantity: 3, baseQuality: 'common', basePrice: 20 },
      { name: '爆炸药水', probability: 0.5, baseQuantity: 3, baseQuality: 'common', basePrice: 22 },
    ],
  },
  {
    ingredients: ['dragon_scale', 'moonlight_grass'],
    results: [
      { name: '隐身药水', probability: 1, baseQuantity: 2, baseQuality: 'fine', basePrice: 45 },
    ],
  },
  {
    ingredients: ['dragon_scale', 'fire_flower'],
    results: [
      { name: '狂暴药水', probability: 1, baseQuantity: 2, baseQuality: 'fine', basePrice: 50 },
    ],
  },
  {
    ingredients: ['unicorn_tear', 'moonlight_grass'],
    results: [
      { name: '恢复药水', probability: 1, baseQuantity: 2, baseQuality: 'fine', basePrice: 55 },
    ],
  },
  {
    ingredients: ['unicorn_tear', 'dragon_scale'],
    results: [
      { name: '史诗治愈药水', probability: 1, baseQuantity: 1, baseQuality: 'epic', basePrice: 80 },
    ],
  },
  {
    ingredients: ['unicorn_tear', 'fire_flower', 'moonlight_grass'],
    results: [
      { name: '凤凰药水', probability: 1, baseQuantity: 1, baseQuality: 'epic', basePrice: 90 },
    ],
  },
  {
    ingredients: ['dragon_scale', 'fire_flower', 'moonlight_grass'],
    results: [
      { name: '龙息药水', probability: 1, baseQuantity: 2, baseQuality: 'fine', basePrice: 60 },
    ],
  },
  {
    ingredients: ['unicorn_tear', 'dragon_scale', 'fire_flower', 'moonlight_grass'],
    results: [
      { name: '传奇全能药水', probability: 1, baseQuantity: 1, baseQuality: 'epic', basePrice: 100 },
    ],
  },
];

const EVENT_PROBABILITIES: { type: EventType; probability: number }[] = [
  { type: 'success', probability: 0.5 },
  { type: 'minorBoom', probability: 0.25 },
  { type: 'majorBoom', probability: 0.1 },
  { type: 'perfect', probability: 0.15 },
];

export function getIngredientById(id: string): Ingredient | undefined {
  return INGREDIENTS.find((ing) => ing.id === id);
}

export function matchRecipe(ingredientIds: string[]): Recipe | null {
  const sorted = [...ingredientIds].sort().join(',');
  for (const recipe of RECIPES) {
    const recipeKey = [...recipe.ingredients].sort().join(',');
    if (recipeKey === sorted) {
      return recipe;
    }
  }
  return null;
}

function rollEvent(): EventType {
  const rand = Math.random();
  let cumulative = 0;
  for (const event of EVENT_PROBABILITIES) {
    cumulative += event.probability;
    if (rand < cumulative) {
      return event.type;
    }
  }
  return 'success';
}

function upgradeQuality(quality: Quality): Quality {
  if (quality === 'common') return 'fine';
  if (quality === 'fine') return 'epic';
  return 'epic';
}

export function brewPotion(ingredientIds: string[]): BrewResult | null {
  const recipe = matchRecipe(ingredientIds);
  if (!recipe) return null;

  let selectedResult: PotionResult = recipe.results[0];
  const rand = Math.random();
  let cumulative = 0;
  for (const result of recipe.results) {
    cumulative += result.probability;
    if (rand < cumulative) {
      selectedResult = result;
      break;
    }
  }

  const eventType = rollEvent();
  let quantity = selectedResult.baseQuantity;
  let quality = selectedResult.baseQuality;
  let goldPenalty = 0;
  let stopProgress = 100;

  switch (eventType) {
    case 'success':
      stopProgress = 100;
      break;
    case 'minorBoom':
      quantity = Math.floor(quantity * 0.5);
      stopProgress = 80;
      break;
    case 'majorBoom':
      quantity = 0;
      goldPenalty = 5;
      stopProgress = 50;
      break;
    case 'perfect':
      quantity = quantity * 2;
      quality = upgradeQuality(quality);
      stopProgress = 100;
      break;
  }

  return {
    eventType,
    potionName: selectedResult.name,
    quality,
    quantity,
    goldPenalty,
    stopProgress,
  };
}

export function getQualityLabel(quality: Quality): string {
  switch (quality) {
    case 'common':
      return '普通';
    case 'fine':
      return '优秀';
    case 'epic':
      return '史诗';
  }
}

export function getQualityStars(quality: Quality): string {
  switch (quality) {
    case 'common':
      return '⭐';
    case 'fine':
      return '⭐⭐';
    case 'epic':
      return '⭐⭐⭐';
  }
}

export function getQualityColor(quality: Quality): string {
  switch (quality) {
    case 'common':
      return '#AAAAAA';
    case 'fine':
      return '#44AA44';
    case 'epic':
      return '#AA44FF';
  }
}

export function getPriceRange(quality: Quality): { min: number; max: number } {
  switch (quality) {
    case 'common':
      return { min: 10, max: 30 };
    case 'fine':
      return { min: 30, max: 60 };
    case 'epic':
      return { min: 60, max: 100 };
  }
}

export function mixIngredientColors(ingredientIds: string[]): string {
  if (ingredientIds.length === 0) {
    return '#6B4E71';
  }

  let r = 0,
    g = 0,
    b = 0;
  for (const id of ingredientIds) {
    const ing = getIngredientById(id);
    if (ing) {
      const color = ing.color;
      r += parseInt(color.slice(1, 3), 16);
      g += parseInt(color.slice(3, 5), 16);
      b += parseInt(color.slice(5, 7), 16);
    }
  }

  r = Math.floor(r / ingredientIds.length);
  g = Math.floor(g / ingredientIds.length);
  b = Math.floor(b / ingredientIds.length);

  return `rgb(${r}, ${g}, ${b})`;
}
