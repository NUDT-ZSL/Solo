import type { Potion, Product, Recipe, ReactionResult } from './types';

export const POTIONS: Potion[] = [
  {
    id: 'water',
    name: '水',
    color: '#4FC3F7',
    description: '流动清澈的元素，生命之源',
    icon: '💧'
  },
  {
    id: 'fire',
    name: '火',
    color: '#FF5252',
    description: '炽热燃烧的元素，毁灭与重生',
    icon: '🔥'
  },
  {
    id: 'earth',
    name: '土',
    color: '#8D6E63',
    description: '厚重坚实的元素，万物根基',
    icon: '🪨'
  },
  {
    id: 'wind',
    name: '风',
    color: '#81C784',
    description: '自由流动的元素，气息与速度',
    icon: '🌿'
  },
  {
    id: 'light',
    name: '光',
    color: '#FFD54F',
    description: '辉煌灿烂的元素，希望与净化',
    icon: '✨'
  },
  {
    id: 'dark',
    name: '暗',
    color: '#7E57C2',
    description: '深邃神秘的元素，隐匿与未知',
    icon: '🌙'
  }
];

const PRODUCTS: Record<string, Product> = {
  steam: {
    id: 'steam',
    name: '蒸汽',
    color: '#E0E0E0',
    description: '水与火交融而生的飘渺雾气，升腾于空中',
    icon: '♨️'
  },
  mud: {
    id: 'mud',
    name: '泥浆',
    color: '#6D4C41',
    description: '水与土混合的黏稠物质，孕育生命的温床',
    icon: '🟤'
  },
  lava: {
    id: 'lava',
    name: '熔岩',
    color: '#FF6F00',
    description: '火与土熔合的炽热熔浆，大地的愤怒',
    icon: '🌋'
  },
  dust: {
    id: 'dust',
    name: '尘埃',
    color: '#BCAAA4',
    description: '风与土扬起的细小微粒，时间的痕迹',
    icon: '💨'
  },
  lightning: {
    id: 'lightning',
    name: '闪电',
    color: '#FFEB3B',
    description: '风与火碰撞的狂暴能量，瞬间的璀璨',
    icon: '⚡'
  },
  ice: {
    id: 'ice',
    name: '寒冰',
    color: '#B3E5FC',
    description: '水与风凝结的透明晶体，永恒的寒冷',
    icon: '❄️'
  },
  holy: {
    id: 'holy',
    name: '生命之水',
    color: '#80DEEA',
    description: '泛着微光的淡蓝色液体，据说能治愈伤口',
    icon: '💎'
  },
  shadow: {
    id: 'shadow',
    name: '暗影精华',
    color: '#4527A0',
    description: '光与暗纠缠的神秘物质，蕴含无尽力量',
    icon: '🔮'
  }
};

export const ALL_PRODUCTS: Product[] = Object.values(PRODUCTS);

export const RECIPES: Recipe[] = [
  { ingredients: ['water', 'fire'], product: PRODUCTS.steam },
  { ingredients: ['water', 'earth'], product: PRODUCTS.mud },
  { ingredients: ['fire', 'earth'], product: PRODUCTS.lava },
  { ingredients: ['wind', 'earth'], product: PRODUCTS.dust },
  { ingredients: ['wind', 'fire'], product: PRODUCTS.lightning },
  { ingredients: ['water', 'wind'], product: PRODUCTS.ice },
  { ingredients: ['water', 'light'], product: PRODUCTS.holy },
  { ingredients: ['light', 'dark'], product: PRODUCTS.shadow }
];

export function getPotionById(id: string): Potion | undefined {
  return POTIONS.find(p => p.id === id);
}

export function findRecipe(potionAId: string, potionBId: string): Recipe | undefined {
  return RECIPES.find(
    r =>
      (r.ingredients[0] === potionAId && r.ingredients[1] === potionBId) ||
      (r.ingredients[0] === potionBId && r.ingredients[1] === potionAId)
  );
}

export function mixPotions(potionA: Potion, potionB: Potion): ReactionResult {
  const recipe = findRecipe(potionA.id, potionB.id);

  if (recipe) {
    const product = recipe.product;
    return {
      success: true,
      product,
      particleConfig: {
        count: 65,
        startColor: product.color,
        endColor: '#FFFFFF',
        duration: 2000,
        spreadRadius: 150,
        minSize: 3,
        maxSize: 8,
        gravity: -0.15,
        emitFrom: 'bottom'
      },
      shakeDuration: 800,
      shakeIntensity: 3,
      liquidColor: product.color
    };
  }

  return {
    success: false,
    particleConfig: {
      count: 20,
      startColor: '#212121',
      endColor: '#424242',
      duration: 1500,
      spreadRadius: 100,
      minSize: 4,
      maxSize: 8,
      gravity: -0.3,
      emitFrom: 'top'
    },
    shakeDuration: 400,
    shakeIntensity: 2,
    liquidColor: '#3E2723'
  };
}
