import { v4 as uuidv4 } from 'uuid';
import type { ClothingItem, RecommendResult } from '../types';
import { calculateColorMatch } from './colorMatching';

export const STYLE_COMPATIBILITY: Record<string, Record<string, number>> = {
  '风衣': {
    '阔腿裤': 0.9, '直筒裤': 0.85, '牛仔裤': 0.8, '连衣裙': 0.75,
    '短裙': 0.6, '马甲': 0.7, '衬衫': 0.85, '高领毛衣': 0.8,
  },
  '马甲': {
    '衬衫': 0.9, '高领毛衣': 0.85, '阔腿裤': 0.8, '直筒裤': 0.8,
    '牛仔裤': 0.75, '短裙': 0.7, '连衣裙': 0.6, '风衣': 0.7,
  },
  '阔腿裤': {
    '风衣': 0.9, '衬衫': 0.85, '高领毛衣': 0.85, '马甲': 0.8,
    '针织衫': 0.8, '西装外套': 0.85, '短外套': 0.7,
  },
  '直筒裤': {
    '风衣': 0.85, '衬衫': 0.9, '高领毛衣': 0.85, '马甲': 0.8,
    '针织衫': 0.8, '西装外套': 0.9, '短外套': 0.75,
  },
  '牛仔裤': {
    'T恤': 0.9, '衬衫': 0.85, '毛衣': 0.85, '短外套': 0.9,
    '风衣': 0.8, '马甲': 0.75, '牛仔外套': 0.95,
  },
  '连衣裙': {
    '风衣': 0.75, '短外套': 0.85, '针织开衫': 0.9, '马甲': 0.6,
    '高跟鞋': 0.85, '乐福鞋': 0.8, '丝巾': 0.75,
  },
  '短裙': {
    '毛衣': 0.85, '衬衫': 0.8, '短外套': 0.85, '风衣': 0.6,
    '马甲': 0.7, '长筒靴': 0.9, '乐福鞋': 0.8,
  },
  '衬衫': {
    '风衣': 0.85, '马甲': 0.9, '阔腿裤': 0.85, '直筒裤': 0.9,
    '牛仔裤': 0.85, '短裙': 0.8, '西装裤': 0.95,
  },
  '高领毛衣': {
    '风衣': 0.8, '马甲': 0.85, '阔腿裤': 0.85, '直筒裤': 0.85,
    '牛仔裤': 0.85, '短裙': 0.85, '长裙': 0.8,
  },
  '针织衫': {
    '阔腿裤': 0.8, '直筒裤': 0.8, '牛仔裤': 0.85, '长裙': 0.85,
    '短裙': 0.8, '风衣': 0.75, '短外套': 0.8,
  },
  '短外套': {
    '连衣裙': 0.85, '短裙': 0.85, '牛仔裤': 0.9, 'T恤': 0.9,
    '针织衫': 0.8, '衬衫': 0.85,
  },
  '西装外套': {
    '直筒裤': 0.9, '阔腿裤': 0.85, '衬衫': 0.9, '高领毛衣': 0.85,
    '西装裤': 0.95, '半裙': 0.85,
  },
  'T恤': {
    '牛仔裤': 0.9, '短外套': 0.9, '休闲裤': 0.85, '运动裤': 0.9,
    '牛仔外套': 0.85,
  },
  '毛衣': {
    '牛仔裤': 0.85, '短裙': 0.85, '直筒裤': 0.8, '阔腿裤': 0.8,
    '长筒靴': 0.85, '围巾': 0.8,
  },
};

interface CacheEntry {
  result: RecommendResult[];
  timestamp: number;
}

const CACHE_TTL = 5 * 60 * 1000;
const MAX_CANDIDATES = 30;
const MIN_COMPATIBILITY = 0.5;
const RECOMMEND_COUNT = 8;

const recommendationCache = new Map<string, CacheEntry>();

function getCacheKey(
  itemId: string,
  options?: { season?: string; occasion?: string }
): string {
  return `${itemId}:${options?.season || 'all'}:${options?.occasion || 'all'}`;
}

function getCachedRecommendations(key: string): RecommendResult[] | null {
  const entry = recommendationCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    recommendationCache.delete(key);
    return null;
  }
  return entry.result;
}

function setCachedRecommendations(key: string, result: RecommendResult[]): void {
  recommendationCache.set(key, {
    result,
    timestamp: Date.now(),
  });
}

function pruneCandidates(
  item: ClothingItem,
  allItems: ClothingItem[],
  options?: { season?: string; occasion?: string }
): ClothingItem[] {
  let candidates = allItems.filter((i) => i.id !== item.id);

  if (options?.season) {
    candidates = candidates.filter((i) => i.season.includes(options.season!));
  }
  if (options?.occasion) {
    candidates = candidates.filter((i) => i.occasion.includes(options.occasion!));
  }

  if (candidates.length > MAX_CANDIDATES) {
    const scored = candidates.map((c) => {
      const seasonMatch = item.season.some((s) => c.season.includes(s)) ? 1 : 0;
      const occasionMatch = item.occasion.some((o) => c.occasion.includes(o)) ? 1 : 0;
      return { item: c, score: seasonMatch + occasionMatch };
    });
    scored.sort((a, b) => b.score - a.score);
    candidates = scored.slice(0, MAX_CANDIDATES).map((s) => s.item);
  }

  return candidates;
}

function getStyleCompatibility(style1: string, style2: string): number {
  const compat1 = STYLE_COMPATIBILITY[style1]?.[style2];
  const compat2 = STYLE_COMPATIBILITY[style2]?.[style1];
  if (compat1 !== undefined) return compat1;
  if (compat2 !== undefined) return compat2;
  return 0.5;
}

function calculateTotalScore(
  baseItem: ClothingItem,
  items: ClothingItem[]
): number {
  const allItems = [baseItem, ...items];
  const colors = allItems.map((i) => i.color);
  const colorScore = calculateColorMatch(colors);

  let styleScore = 0;
  let styleCount = 0;
  for (let i = 0; i < allItems.length; i++) {
    for (let j = i + 1; j < allItems.length; j++) {
      styleScore += getStyleCompatibility(allItems[i].style, allItems[j].style);
      styleCount++;
    }
  }
  const avgStyleScore = styleCount > 0 ? styleScore / styleCount : 0.5;

  const categories = new Set(allItems.map((i) => i.category));
  const diversityBonus = Math.min(categories.size / 4, 1) * 0.1;

  return avgStyleScore * 0.5 + colorScore * 0.4 + diversityBonus;
}

function generateDescription(items: ClothingItem[]): string {
  const styles = items.map((i) => i.style).join('、');
  return `${styles}的经典组合`;
}

function generateStyleNote(baseItem: ClothingItem, items: ClothingItem[]): string {
  const allItems = [baseItem, ...items];
  const hasOuter = allItems.some((i) => i.category === 'outer');
  const hasDress = allItems.some((i) => i.category === 'dress');

  if (hasDress && hasOuter) {
    return '外搭外套增加层次感，适合春秋季节的优雅穿搭';
  }
  if (baseItem.category === 'outer') {
    return `${baseItem.style}作为主单品，内搭选择${items[0]?.style || '简约上衣'}，打造复古时尚感`;
  }
  if (items.length >= 2) {
    return `上半身${items[0]?.style}搭配下半身${items[1]?.style}，整体协调统一`;
  }
  return '经典复古搭配，适合多种场合穿着';
}

function generateCombinations(
  baseItem: ClothingItem,
  candidates: ClothingItem[]
): RecommendResult[] {
  const results: RecommendResult[] = [];
  const usedCombos = new Set<string>();

  const categories = ['top', 'bottom', 'outer', 'dress', 'accessory'] as const;
  const byCategory: Record<string, ClothingItem[]> = {};
  for (const cat of categories) {
    byCategory[cat] = candidates.filter((c) => c.category === cat);
  }

  const neededCategories = categories.filter((c) => c !== baseItem.category);

  function buildCombo(
    currentItems: ClothingItem[],
    usedCategories: Set<string>,
    startIdx: number
  ): void {
    if (currentItems.length >= 2 && currentItems.length <= 3) {
      const comboKey = [...currentItems].map((i) => i.id).sort().join('|');
      if (!usedCombos.has(comboKey)) {
        usedCombos.add(comboKey);
        const score = calculateTotalScore(baseItem, currentItems);
        if (score >= MIN_COMPATIBILITY) {
          results.push({
            id: uuidv4(),
            items: [baseItem, ...currentItems],
            matchScore: score,
            description: generateDescription([baseItem, ...currentItems]),
            styleNote: generateStyleNote(baseItem, currentItems),
          });
        }
      }
    }

    if (currentItems.length >= 3 || results.length >= RECOMMEND_COUNT * 3) {
      return;
    }

    for (let i = startIdx; i < neededCategories.length; i++) {
      const cat = neededCategories[i];
      if (usedCategories.has(cat)) continue;

      const itemsInCat = byCategory[cat] || [];
      for (const item of itemsInCat) {
        const lastItem = currentItems[currentItems.length - 1] || baseItem;
        if (getStyleCompatibility(lastItem.style, item.style) < MIN_COMPATIBILITY) {
          continue;
        }

        usedCategories.add(cat);
        currentItems.push(item);
        buildCombo(currentItems, usedCategories, i + 1);
        currentItems.pop();
        usedCategories.delete(cat);
      }
    }
  }

  buildCombo([], new Set(), 0);

  results.sort((a, b) => b.matchScore - a.matchScore);
  return results.slice(0, RECOMMEND_COUNT);
}

export function generateRecommendations(
  item: ClothingItem,
  allItems: ClothingItem[],
  options?: { season?: string; occasion?: string }
): RecommendResult[] {
  const cacheKey = getCacheKey(item.id, options);
  const cached = getCachedRecommendations(cacheKey);
  if (cached) {
    return cached;
  }

  const startTime = performance.now();

  const candidates = pruneCandidates(item, allItems, options);
  const results = generateCombinations(item, candidates);

  setCachedRecommendations(cacheKey, results);

  const endTime = performance.now();
  console.debug(`推荐计算完成，耗时: ${(endTime - startTime).toFixed(2)}ms，候选数: ${candidates.length}，结果数: ${results.length}`);

  return results;
}

export function clearCache(): void {
  recommendationCache.clear();
}

export function getCacheSize(): number {
  return recommendationCache.size;
}
