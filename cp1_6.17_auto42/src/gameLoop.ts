import type {
  Material,
  Recipe,
  CauldronIngredient,
  Potion,
  Quality,
  ActiveEvent,
  WorkshopState,
  ShopItem,
  LoggedEvent,
  RecipeIngredient
} from './types';

export const MATERIALS: Material[] = [
  { id: 'moonstone', name: '月光石', icon: '💎', quantity: 50 },
  { id: 'dragon_scale', name: '龙鳞', icon: '🐉', quantity: 30 },
  { id: 'fire_flower', name: '火焰花', icon: '🔥', quantity: 45 },
  { id: 'unicorn_tear', name: '独角兽泪', icon: '💧', quantity: 25 },
  { id: 'shadow_root', name: '暗影根须', icon: '🌿', quantity: 40 }
];

export const RECIPES: Recipe[] = [
  {
    id: 'health_potion',
    name: '生命药水',
    description: '恢复生命值的基础药水',
    ingredients: [
      { materialId: 'moonstone', minRatio: 0.2, maxRatio: 0.4, required: 2, tolerance: 0.10 },
      { materialId: 'unicorn_tear', minRatio: 0.6, maxRatio: 0.8, required: 3, tolerance: 0.10 }
    ],
    baseValue: 20,
    icon: '❤️'
  },
  {
    id: 'explosion_potion',
    name: '爆炸药水',
    description: '造成范围伤害的烈性药水',
    ingredients: [
      { materialId: 'dragon_scale', minRatio: 0.3, maxRatio: 0.5, required: 2, tolerance: 0.10 },
      { materialId: 'fire_flower', minRatio: 0.5, maxRatio: 0.7, required: 3, tolerance: 0.10 }
    ],
    baseValue: 35,
    icon: '💥'
  },
  {
    id: 'transformation_potion',
    name: '变形药水',
    description: '暂时改变形态的神秘药水',
    ingredients: [
      { materialId: 'shadow_root', minRatio: 0.4, maxRatio: 0.6, required: 2, tolerance: 0.10 },
      { materialId: 'unicorn_tear', minRatio: 0.2, maxRatio: 0.4, required: 1, tolerance: 0.10 },
      { materialId: 'moonstone', minRatio: 0.1, maxRatio: 0.3, required: 1, tolerance: 0.10 }
    ],
    baseValue: 50,
    icon: '🦎'
  },
  {
    id: 'invisibility_potion',
    name: '隐身药水',
    description: '让使用者暂时隐形',
    ingredients: [
      { materialId: 'shadow_root', minRatio: 0.5, maxRatio: 0.7, required: 3, tolerance: 0.10 },
      { materialId: 'moonstone', minRatio: 0.3, maxRatio: 0.5, required: 2, tolerance: 0.10 }
    ],
    baseValue: 45,
    icon: '👻'
  },
  {
    id: 'strength_potion',
    name: '力量药水',
    description: '增强体力和攻击力',
    ingredients: [
      { materialId: 'dragon_scale', minRatio: 0.4, maxRatio: 0.6, required: 2, tolerance: 0.10 },
      { materialId: 'fire_flower', minRatio: 0.2, maxRatio: 0.4, required: 1, tolerance: 0.10 },
      { materialId: 'moonstone', minRatio: 0.1, maxRatio: 0.3, required: 1, tolerance: 0.10 }
    ],
    baseValue: 40,
    icon: '💪'
  },
  {
    id: 'wisdom_potion',
    name: '智慧药水',
    description: '提升魔法能力和智力',
    ingredients: [
      { materialId: 'unicorn_tear', minRatio: 0.4, maxRatio: 0.6, required: 2, tolerance: 0.10 },
      { materialId: 'moonstone', minRatio: 0.3, maxRatio: 0.5, required: 2, tolerance: 0.10 },
      { materialId: 'shadow_root', minRatio: 0.1, maxRatio: 0.3, required: 1, tolerance: 0.10 }
    ],
    baseValue: 42,
    icon: '🧠'
  },
  {
    id: 'speed_potion',
    name: '疾速药水',
    description: '大幅提升移动速度',
    ingredients: [
      { materialId: 'fire_flower', minRatio: 0.3, maxRatio: 0.5, required: 2, tolerance: 0.10 },
      { materialId: 'dragon_scale', minRatio: 0.2, maxRatio: 0.4, required: 1, tolerance: 0.10 },
      { materialId: 'unicorn_tear', minRatio: 0.2, maxRatio: 0.4, required: 1, tolerance: 0.10 }
    ],
    baseValue: 38,
    icon: '⚡'
  },
  {
    id: 'healing_elixir',
    name: '治疗灵药',
    description: '强效治愈的高级药水',
    ingredients: [
      { materialId: 'unicorn_tear', minRatio: 0.3, maxRatio: 0.5, required: 2, tolerance: 0.10 },
      { materialId: 'moonstone', minRatio: 0.2, maxRatio: 0.4, required: 2, tolerance: 0.10 },
      { materialId: 'fire_flower', minRatio: 0.1, maxRatio: 0.3, required: 1, tolerance: 0.10 },
      { materialId: 'shadow_root', minRatio: 0.1, maxRatio: 0.3, required: 1, tolerance: 0.10 }
    ],
    baseValue: 65,
    icon: '✨'
  }
];

export const ALCHEMY_DURATION_MS = 3000;
export const EVENT_CHECK_INTERVAL_MS = 300;
export const ALCHEMY_EVENT_TIMEOUT_MS = 500;
export const WORKSHOP_EVENT_INTERVAL = 3;

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

export function canAddMaterial(
  materials: Material[],
  materialId: string,
  cauldron: CauldronIngredient[],
  quantity: number
): boolean {
  const material = materials.find(m => m.id === materialId);
  if (!material) return false;
  
  const inCauldron = cauldron.find(c => c.materialId === materialId)?.quantity || 0;
  return material.quantity - inCauldron >= quantity;
}

export interface RatioValidationResult {
  valid: boolean;
  deviations: { materialId: string; deviation: number; allowedTolerance: number; outOfRange: boolean }[];
}

export function validateRatioDeviation(
  recipe: Recipe,
  cauldron: CauldronIngredient[]
): RatioValidationResult {
  const totalInCauldron = cauldron.reduce((sum, c) => sum + c.quantity, 0);
  if (totalInCauldron === 0) {
    return {
      valid: false,
      deviations: recipe.ingredients.map(ing => ({
        materialId: ing.materialId,
        deviation: 1,
        allowedTolerance: ing.tolerance,
        outOfRange: true
      }))
    };
  }

  const deviations = recipe.ingredients.map(ing => {
    const inCauldron = cauldron.find(c => c.materialId === ing.materialId)?.quantity || 0;
    const actualRatio = inCauldron / totalInCauldron;
    const idealRatio = (ing.minRatio + ing.maxRatio) / 2;
    const deviation = Math.abs(actualRatio - idealRatio);
    return {
      materialId: ing.materialId,
      deviation,
      allowedTolerance: ing.tolerance,
      outOfRange: deviation > ing.tolerance
    };
  });

  return {
    valid: deviations.every(d => !d.outOfRange),
    deviations
  };
}

export function validateRecipe(
  recipe: Recipe,
  cauldron: CauldronIngredient[],
  fluctuation: { materialId: string; multiplier: number } | null = null
): boolean {
  if (cauldron.length === 0) return false;
  
  const totalInCauldron = cauldron.reduce((sum, c) => sum + c.quantity, 0);
  if (totalInCauldron === 0) return false;

  for (const ingredient of recipe.ingredients) {
    const required = getAdjustedRequiredAmount(ingredient.required, ingredient.materialId, fluctuation);
    const inCauldron = cauldron.find(c => c.materialId === ingredient.materialId)?.quantity || 0;
    if (inCauldron < required) return false;
  }

  const ratioCheck = validateRatioDeviation(recipe, cauldron);
  if (!ratioCheck.valid) return false;

  return true;
}

export function calculateAccuracy(recipe: Recipe, cauldron: CauldronIngredient[]): number {
  const totalInCauldron = cauldron.reduce((sum, c) => sum + c.quantity, 0);
  if (totalInCauldron === 0) return 0;

  let totalDeviation = 0;
  let validIngredients = 0;

  for (const ingredient of recipe.ingredients) {
    const inCauldron = cauldron.find(c => c.materialId === ingredient.materialId)?.quantity || 0;
    const actualRatio = inCauldron / totalInCauldron;
    const idealRatio = (ingredient.minRatio + ingredient.maxRatio) / 2;
    const deviation = Math.abs(actualRatio - idealRatio);
    const normalizedDeviation = Math.min(1, deviation / Math.max(0.01, ingredient.tolerance));
    totalDeviation += normalizedDeviation;
    validIngredients++;
  }

  const avgDeviation = totalDeviation / validIngredients;
  const accuracy = Math.max(0, 1 - avgDeviation);
  return Math.min(1, accuracy);
}

export function calculateQuality(
  accuracy: number,
  qualityPenalty: number,
  eventBonus: number = 0
): Quality {
  const finalScore = Math.max(0, Math.min(1, accuracy - qualityPenalty + eventBonus));
  
  if (finalScore >= 0.9) return 'perfect';
  if (finalScore >= 0.7) return 'excellent';
  if (finalScore >= 0.5) return 'fine';
  return 'common';
}

export function generateRandomEvent(
  eventType: 'alchemy' | 'workshop',
  now: number = Date.now()
): ActiveEvent | null {
  if (eventType === 'alchemy') {
    const rand = Math.random();
    if (rand < 0.05) {
      return {
        id: generateId(),
        type: 'cauldron_smoke',
        message: '坩埚开始冒烟！快搅拌！',
        action: '搅拌',
        timeoutAt: now + ALCHEMY_EVENT_TIMEOUT_MS,
        createdAt: now
      };
    }
    if (rand < 0.08) {
      return {
        id: generateId(),
        type: 'spark_splash',
        message: '火花迸溅！需要冷却！',
        action: '冷却',
        timeoutAt: now + ALCHEMY_EVENT_TIMEOUT_MS,
        createdAt: now
      };
    }
    return null;
  } else {
    const events: Omit<ActiveEvent, 'id' | 'createdAt'>[] = [
      {
        type: 'price_fluctuation',
        message: '材料价格波动！下一次炼金某种材料需求数量变化',
        timeoutAt: now + 3000
      },
      {
        type: 'apprentice_gift',
        message: '学徒送来神秘祝福！下一次炼金必定产出高品质药水',
        timeoutAt: now + 3000
      }
    ];
    const selected = events[Math.floor(Math.random() * events.length)];
    return {
      ...selected,
      id: generateId(),
      createdAt: now
    };
  }
}

export function updateAlchemyProgress(
  startTime: number,
  now: number = Date.now()
): { progress: number; isComplete: boolean } {
  const elapsed = now - startTime;
  const progress = Math.min(1, elapsed / ALCHEMY_DURATION_MS);
  return {
    progress,
    isComplete: progress >= 1
  };
}

export function shouldCheckForEvent(
  lastCheckTime: number,
  now: number = Date.now()
): boolean {
  return now - lastCheckTime >= EVENT_CHECK_INTERVAL_MS;
}

export function isEventTimedOut(
  event: ActiveEvent,
  now: number = Date.now()
): boolean {
  return now > event.timeoutAt;
}

export function getRemainingEventTime(
  event: ActiveEvent,
  now: number = Date.now()
): number {
  return Math.max(0, event.timeoutAt - now);
}

export function handleEventTimeout(
  event: ActiveEvent,
  currentState: {
    materialLossMultiplier: number;
    qualityPenalty: number;
    isBrewFailed: boolean;
  }
): {
  materialLossMultiplier: number;
  qualityPenalty: number;
  isBrewFailed: boolean;
} {
  if (event.type === 'cauldron_smoke') {
    return {
      materialLossMultiplier: Math.min(1.5, currentState.materialLossMultiplier + 0.2),
      qualityPenalty: currentState.qualityPenalty,
      isBrewFailed: true
    };
  } else if (event.type === 'spark_splash') {
    return {
      materialLossMultiplier: currentState.materialLossMultiplier,
      qualityPenalty: Math.min(0.5, currentState.qualityPenalty + 0.2),
      isBrewFailed: currentState.isBrewFailed
    };
  }
  return currentState;
}

export function shouldTriggerWorkshopEvent(
  successfulAlchemies: number,
  lastTriggeredCount: number
): boolean {
  if (successfulAlchemies === 0) return false;
  return successfulAlchemies % WORKSHOP_EVENT_INTERVAL === 0 && successfulAlchemies > lastTriggeredCount;
}

export function runAlchemy(
  recipe: Recipe,
  cauldron: CauldronIngredient[],
  qualityPenalty: number,
  materialLossMultiplier: number,
  isFailed: boolean,
  guaranteedHighQuality: boolean = false,
  materialFluctuation: { materialId: string; multiplier: number } | null = null
): { success: boolean; potion?: Potion; waste?: CauldronIngredient[] } {
  if (!validateRecipe(recipe, cauldron, materialFluctuation)) {
    const waste = cauldron.map(c => ({
      ...c,
      quantity: Math.ceil(c.quantity * materialLossMultiplier)
    }));
    return { success: false, waste };
  }

  if (isFailed) {
    const waste = cauldron.map(c => ({
      ...c,
      quantity: Math.ceil(c.quantity * materialLossMultiplier)
    }));
    return { success: false, waste };
  }

  const accuracy = calculateAccuracy(recipe, cauldron);
  if (accuracy < 0.3) {
    const waste = cauldron.map(c => ({
      ...c,
      quantity: Math.ceil(c.quantity * materialLossMultiplier)
    }));
    return { success: false, waste };
  }

  const baseQuality = calculateQuality(accuracy, qualityPenalty);
  const quality = getFinalQuality(baseQuality, guaranteedHighQuality);
  const potion: Potion = {
    id: generateId(),
    recipeId: recipe.id,
    name: recipe.name,
    quality,
    icon: recipe.icon,
    quantity: 1,
    createdAt: Date.now()
  };

  return { success: true, potion };
}

export function executeTrade(
  shopItems: ShopItem[],
  inventory: Potion[],
  itemId: string,
  buyerGold: number
): { success: boolean; newShopItems: ShopItem[]; newInventory: Potion[]; goldChange: number; error?: string } {
  const item = shopItems.find(i => i.id === itemId);
  if (!item) {
    return { success: false, newShopItems: shopItems, newInventory: inventory, goldChange: 0, error: '商品不存在' };
  }

  if (buyerGold < item.price) {
    return { success: false, newShopItems: shopItems, newInventory: inventory, goldChange: 0, error: '金币不足' };
  }

  const potionInInventory = inventory.find(p => p.id === item.potionId);
  if (!potionInInventory) {
    return { success: false, newShopItems: shopItems, newInventory: inventory, goldChange: 0, error: '库存不足' };
  }

  let newInventory: Potion[];
  if (potionInInventory.quantity > 1) {
    newInventory = inventory.map(p =>
      p.id === item.potionId
        ? { ...p, quantity: p.quantity - 1 }
        : p
    );
  } else {
    newInventory = inventory.filter(p => p.id !== item.potionId);
  }

  const newShopItems = shopItems.filter(i => i.id !== itemId);

  return {
    success: true,
    newShopItems,
    newInventory,
    goldChange: -item.price
  };
}

export function listForSale(
  inventory: Potion[],
  potionId: string,
  price: number,
  shopItems: ShopItem[]
): { success: boolean; newInventory: Potion[]; newShopItems: ShopItem[]; error?: string } {
  const potion = inventory.find(p => p.id === potionId);
  if (!potion) {
    return { success: false, newInventory: inventory, newShopItems: shopItems, error: '药水不存在' };
  }

  if (price < 5 || price > 100) {
    return { success: false, newInventory: inventory, newShopItems: shopItems, error: '价格必须在5-100金之间' };
  }

  let newInventory: Potion[];
  const potionToSell = { ...potion, quantity: 1 };
  
  if (potion.quantity > 1) {
    newInventory = inventory.map(p =>
      p.id === potionId ? { ...p, quantity: p.quantity - 1 } : p
    );
  } else {
    newInventory = inventory.filter(p => p.id !== potionId);
  }

  const newItem: ShopItem = {
    id: generateId(),
    potionId: generateId(),
    potionName: potion.name,
    quality: potion.quality,
    price,
    sellerId: 'player',
    listedAt: Date.now()
  };

  const newPotionInInventory: Potion = {
    ...potionToSell,
    id: newItem.potionId,
    quantity: 1
  };
  newInventory = [...newInventory, newPotionInInventory];

  return {
    success: true,
    newInventory,
    newShopItems: [newItem, ...shopItems]
  };
}

export function generateMaterialFluctuation(): { materialId: string; multiplier: number } {
  const randomMaterial = MATERIALS[Math.floor(Math.random() * MATERIALS.length)];
  const multiplier = Math.random() > 0.5 ? 2 : 0.5;
  return { materialId: randomMaterial.id, multiplier };
}

export function applyWorkshopEvent(
  event: ActiveEvent,
  state: WorkshopState
): Partial<WorkshopState> {
  switch (event.type) {
    case 'price_fluctuation': {
      const fluctuation = generateMaterialFluctuation();
      return {
        activeMaterialFluctuation: fluctuation
      };
    }
    case 'apprentice_gift': {
      return {
        guaranteedHighQuality: true
      };
    }
    default:
      return {};
  }
}

export function getAdjustedRequiredAmount(
  baseRequired: number,
  materialId: string,
  fluctuation: { materialId: string; multiplier: number } | null
): number {
  if (!fluctuation || fluctuation.materialId !== materialId) {
    return baseRequired;
  }
  return Math.max(1, Math.round(baseRequired * fluctuation.multiplier));
}

export function getFinalQuality(
  baseQuality: Quality,
  guaranteedHigh: boolean
): Quality {
  if (!guaranteedHigh) return baseQuality;
  const qualityOrder: Quality[] = ['common', 'fine', 'excellent', 'perfect'];
  const baseIndex = qualityOrder.indexOf(baseQuality);
  const minHighIndex = qualityOrder.indexOf('fine');
  return qualityOrder[Math.max(baseIndex, minHighIndex)];
}

export function logEvent(event: ActiveEvent): LoggedEvent {
  return {
    id: event.id,
    type: event.type,
    message: event.message,
    timestamp: Date.now()
  };
}

export function addPotionToInventory(
  inventory: Potion[],
  potion: Potion
): Potion[] {
  const existingPotion = inventory.find(
    p => p.name === potion.name && p.quality === potion.quality
  );
  if (existingPotion) {
    return inventory.map(p =>
      p.id === existingPotion.id
        ? { ...p, quantity: p.quantity + 1 }
        : p
    );
  }
  return [...inventory, potion];
}

export function consumeMaterials(
  materials: Material[],
  cauldron: CauldronIngredient[],
  wasteMultiplier: number
): Material[] {
  return materials.map(m => {
    const inCauldron = cauldron.find(c => c.materialId === m.id);
    if (inCauldron) {
      const consumed = Math.ceil(inCauldron.quantity * wasteMultiplier);
      return { ...m, quantity: Math.max(0, m.quantity - consumed) };
    }
    return m;
  });
}

export function getInitialState(): WorkshopState {
  return {
    materials: JSON.parse(JSON.stringify(MATERIALS)),
    recipes: RECIPES,
    selectedRecipeId: null,
    cauldron: [],
    inventory: [],
    shopItems: [],
    gold: 100,
    alchemyProgress: 0,
    isAlchemizing: false,
    alchemyStartTime: null,
    activeEvent: null,
    eventLog: [],
    successfulAlchemies: 0,
    qualityPenalty: 0,
    materialLossMultiplier: 1,
    priceMultiplier: 1,
    isBrewFailed: false,
    showRecipePanel: true,
    currentPage: 1,
    itemsPerPage: 6,
    lastWorkshopEventCount: 0,
    lastEventCheckTime: 0,
    activeMaterialFluctuation: null,
    guaranteedHighQuality: false
  };
}

export type { RecipeIngredient };
