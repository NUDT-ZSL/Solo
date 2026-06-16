import type {
  Material,
  Recipe,
  CauldronIngredient,
  Potion,
  Quality,
  ActiveEvent,
  WorkshopState,
  ShopItem,
  LoggedEvent
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
      { materialId: 'moonstone', minRatio: 0.2, maxRatio: 0.4, required: 2 },
      { materialId: 'unicorn_tear', minRatio: 0.6, maxRatio: 0.8, required: 3 }
    ],
    baseValue: 20,
    icon: '❤️'
  },
  {
    id: 'explosion_potion',
    name: '爆炸药水',
    description: '造成范围伤害的烈性药水',
    ingredients: [
      { materialId: 'dragon_scale', minRatio: 0.3, maxRatio: 0.5, required: 2 },
      { materialId: 'fire_flower', minRatio: 0.5, maxRatio: 0.7, required: 3 }
    ],
    baseValue: 35,
    icon: '💥'
  },
  {
    id: 'transformation_potion',
    name: '变形药水',
    description: '暂时改变形态的神秘药水',
    ingredients: [
      { materialId: 'shadow_root', minRatio: 0.4, maxRatio: 0.6, required: 2 },
      { materialId: 'unicorn_tear', minRatio: 0.2, maxRatio: 0.4, required: 1 },
      { materialId: 'moonstone', minRatio: 0.1, maxRatio: 0.3, required: 1 }
    ],
    baseValue: 50,
    icon: '🦎'
  },
  {
    id: 'invisibility_potion',
    name: '隐身药水',
    description: '让使用者暂时隐形',
    ingredients: [
      { materialId: 'shadow_root', minRatio: 0.5, maxRatio: 0.7, required: 3 },
      { materialId: 'moonstone', minRatio: 0.3, maxRatio: 0.5, required: 2 }
    ],
    baseValue: 45,
    icon: '👻'
  },
  {
    id: 'strength_potion',
    name: '力量药水',
    description: '增强体力和攻击力',
    ingredients: [
      { materialId: 'dragon_scale', minRatio: 0.4, maxRatio: 0.6, required: 2 },
      { materialId: 'fire_flower', minRatio: 0.2, maxRatio: 0.4, required: 1 },
      { materialId: 'moonstone', minRatio: 0.1, maxRatio: 0.3, required: 1 }
    ],
    baseValue: 40,
    icon: '💪'
  },
  {
    id: 'wisdom_potion',
    name: '智慧药水',
    description: '提升魔法能力和智力',
    ingredients: [
      { materialId: 'unicorn_tear', minRatio: 0.4, maxRatio: 0.6, required: 2 },
      { materialId: 'moonstone', minRatio: 0.3, maxRatio: 0.5, required: 2 },
      { materialId: 'shadow_root', minRatio: 0.1, maxRatio: 0.3, required: 1 }
    ],
    baseValue: 42,
    icon: '🧠'
  },
  {
    id: 'speed_potion',
    name: '疾速药水',
    description: '大幅提升移动速度',
    ingredients: [
      { materialId: 'fire_flower', minRatio: 0.3, maxRatio: 0.5, required: 2 },
      { materialId: 'dragon_scale', minRatio: 0.2, maxRatio: 0.4, required: 1 },
      { materialId: 'unicorn_tear', minRatio: 0.2, maxRatio: 0.4, required: 1 }
    ],
    baseValue: 38,
    icon: '⚡'
  },
  {
    id: 'healing_elixir',
    name: '治疗灵药',
    description: '强效治愈的高级药水',
    ingredients: [
      { materialId: 'unicorn_tear', minRatio: 0.3, maxRatio: 0.5, required: 2 },
      { materialId: 'moonstone', minRatio: 0.2, maxRatio: 0.4, required: 2 },
      { materialId: 'fire_flower', minRatio: 0.1, maxRatio: 0.3, required: 1 },
      { materialId: 'shadow_root', minRatio: 0.1, maxRatio: 0.3, required: 1 }
    ],
    baseValue: 65,
    icon: '✨'
  }
];

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

export function validateRecipe(recipe: Recipe, cauldron: CauldronIngredient[]): boolean {
  if (cauldron.length === 0) return false;
  
  const totalInCauldron = cauldron.reduce((sum, c) => sum + c.quantity, 0);
  if (totalInCauldron === 0) return false;

  for (const ingredient of recipe.ingredients) {
    const inCauldron = cauldron.find(c => c.materialId === ingredient.materialId)?.quantity || 0;
    if (inCauldron < ingredient.required) return false;
  }

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
    totalDeviation += deviation;
    validIngredients++;
  }

  const avgDeviation = totalDeviation / validIngredients;
  const accuracy = Math.max(0, 1 - avgDeviation * 3);
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
  eventType: 'alchemy' | 'workshop'
): ActiveEvent | null {
  const now = Date.now();

  if (eventType === 'alchemy') {
    const rand = Math.random();
    if (rand < 0.05) {
      return {
        id: generateId(),
        type: 'cauldron_smoke',
        message: '坩埚开始冒烟！快搅拌！',
        action: '搅拌',
        timeoutAt: now + 500,
        createdAt: now
      };
    }
    if (rand < 0.08) {
      return {
        id: generateId(),
        type: 'spark_splash',
        message: '火花迸溅！需要冷却！',
        action: '冷却',
        timeoutAt: now + 500,
        createdAt: now
      };
    }
    return null;
  } else {
    const events: Omit<ActiveEvent, 'id' | 'createdAt'>[] = [
      {
        type: 'price_fluctuation',
        message: '市场价格波动！所有商品售价调整30%',
        timeoutAt: now + 3000
      },
      {
        type: 'apprentice_gift',
        message: '学徒送来意外收获！获得随机材料',
        timeoutAt: now + 3000
      },
      {
        type: 'quality_mutation',
        message: '魔法能量异常！下一瓶药水品质提升',
        timeoutAt: now + 3000
      },
      {
        type: 'cauldron_explosion',
        message: '坩埚压力过大！下一次炼金材料损耗增加',
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

export function runAlchemy(
  recipe: Recipe,
  cauldron: CauldronIngredient[],
  qualityPenalty: number,
  materialLossMultiplier: number,
  isFailed: boolean
): { success: boolean; potion?: Potion; waste?: CauldronIngredient[] } {
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

  const quality = calculateQuality(accuracy, qualityPenalty);
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

export function applyWorkshopEvent(
  event: ActiveEvent,
  state: WorkshopState
): Partial<WorkshopState> {
  switch (event.type) {
    case 'price_fluctuation': {
      const change = (Math.random() - 0.5) * 0.6;
      return { priceMultiplier: Math.max(0.5, Math.min(1.5, 1 + change)) };
    }
    case 'apprentice_gift': {
      const randomMaterial = MATERIALS[Math.floor(Math.random() * MATERIALS.length)];
      const bonusAmount = Math.floor(Math.random() * 5) + 1;
      const newMaterials = state.materials.map(m =>
        m.id === randomMaterial.id
          ? { ...m, quantity: m.quantity + bonusAmount }
          : m
      );
      return { materials: newMaterials };
    }
    case 'quality_mutation': {
      return { qualityPenalty: Math.max(0, state.qualityPenalty - 0.2) };
    }
    case 'cauldron_explosion': {
      return { materialLossMultiplier: Math.min(1.5, state.materialLossMultiplier + 0.2) };
    }
    default:
      return {};
  }
}

export function logEvent(event: ActiveEvent): LoggedEvent {
  return {
    id: event.id,
    type: event.type,
    message: event.message,
    timestamp: Date.now()
  };
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
    itemsPerPage: 6
  };
}
