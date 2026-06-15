import type { TasteVector, TeaCategory, TastingRecord } from './teaRecordModule.ts';
import { TEA_CATEGORIES } from './teaRecordModule.ts';

export interface TeaItem {
  id: string;
  name: string;
  category: TeaCategory;
  origin: string;
  temp: number;
  flavor: string[];
  description: string;
}

export interface RecommendedTea extends TeaItem {
  score: number;
  reason: string;
  matchAspects: string[];
}

export interface UserPreferenceProfile {
  topCategory: TeaCategory | null;
  topOrigin: string | null;
  preferredFlavors: string[];
  avgRatingByCategory: Record<TeaCategory, number>;
  intensityPreference: '清爽' | '醇厚' | '浓烈';
  tastingHabit: string;
}

export function analyzeUserPreferences(records: TastingRecord[], vector: TasteVector): UserPreferenceProfile {
  const avgRatingByCategory = {} as Record<TeaCategory, number>;
  const categoryCount = {} as Record<TeaCategory, number>;

  TEA_CATEGORIES.forEach(c => {
    avgRatingByCategory[c] = 0;
    categoryCount[c] = 0;
  });

  const allFlavors = new Map<string, number>();

  records.forEach(r => {
    avgRatingByCategory[r.category] += r.rating;
    categoryCount[r.category]++;
    if (r.notes) {
      const flavorWords = ['醇厚', '回甘', '鲜爽', '清甜', '蜜香', '花香', '浓香', '岩韵', '兰香', '柔甜', '生津', '清爽', '陈香', '辛锐'];
      flavorWords.forEach(w => {
        if (r.notes.includes(w)) {
          allFlavors.set(w, (allFlavors.get(w) || 0) + r.rating);
        }
      });
    }
  });

  TEA_CATEGORIES.forEach(c => {
    if (categoryCount[c] > 0) {
      avgRatingByCategory[c] = avgRatingByCategory[c] / categoryCount[c];
    }
  });

  const topCategory = vector.preferredCategories[0] || null;
  const topOrigin = vector.topOrigins[0] || null;

  const preferredFlavors = Array.from(allFlavors.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4)
    .map(([f]) => f);

  let intensityPreference: '清爽' | '醇厚' | '浓烈' = '醇厚';
  if (topCategory === '绿茶' || topCategory === '白茶') {
    intensityPreference = '清爽';
  } else if (topCategory === '乌龙' || topCategory === '普洱') {
    const count = categoryCount[topCategory] || 0;
    intensityPreference = count >= 3 ? '浓烈' : '醇厚';
  }

  let tastingHabit = '偶尔品鉴';
  if (records.length >= 10) tastingHabit = '资深茶友';
  else if (records.length >= 5) tastingHabit = '品茗爱好者';
  else if (records.length >= 2) tastingHabit = '经常品鉴';

  return {
    topCategory,
    topOrigin,
    preferredFlavors,
    avgRatingByCategory,
    intensityPreference,
    tastingHabit
  };
}

function cosineSimilarity(
  vecA: Record<string, number>,
  vecB: Record<string, number>
): number {
  const allKeys = new Set([...Object.keys(vecA), ...Object.keys(vecB)]);
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  allKeys.forEach(key => {
    const a = vecA[key] || 0;
    const b = vecB[key] || 0;
    dotProduct += a * b;
    normA += a * a;
    normB += b * b;
  });

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

function tempSimilarity(pref: number, actual: number): number {
  const diff = Math.abs(pref - actual);
  if (diff === 0) return 1;
  if (diff > 25) return 0;
  return 1 - (diff / 25);
}

const CATEGORY_INTENSITY_MAP: Record<TeaCategory, Record<string, string>> = {
  '绿茶': { light: '鲜爽', medium: '醇厚', strong: '浓烈' },
  '红茶': { light: '鲜甜', medium: '醇厚', strong: '浓强' },
  '乌龙': { light: '清香', medium: '醇厚', strong: '岩韵' },
  '普洱': { light: '柔甜', medium: '醇厚', strong: '浓烈' },
  '白茶': { light: '清甜', medium: '醇厚', strong: '陈香' }
};

function generateReason(
  tea: TeaItem,
  vector: TasteVector,
  aspects: string[],
  profile: UserPreferenceProfile,
  records: TastingRecord[]
): string {
  if (vector.totalRecords === 0) {
    const feature = tea.flavor[0] || '特色鲜明';
    return `${tea.name}是${tea.category}中的经典入门茶品，${tea.description.split('，')[0]}，${feature}突出，非常适合开启您的品鉴之旅。`;
  }

  const reasons: string[] = [];
  const { topCategory, topOrigin, preferredFlavors, intensityPreference, avgRatingByCategory } = profile;

  if (topCategory && tea.category === topCategory) {
    const catRating = avgRatingByCategory[topCategory];
    const intensity = CATEGORY_INTENSITY_MAP[topCategory];
    let quality = intensity.medium;
    if (catRating >= 4.5) quality = intensity.strong;
    else if (catRating >= 3.5) quality = intensity.medium;
    else quality = intensity.light;

    const originPrefix = topOrigin && tea.origin.includes(topOrigin) ? `${topOrigin}核心产区` : '';
    if (originPrefix) {
      reasons.push(`您是${originPrefix}${topCategory}的爱好者`);
      reasons.push(`尤其偏爱${quality}口感`);
    } else {
      reasons.push(`因为您偏爱${topCategory}的${quality}`);
    }
  } else if (topOrigin && tea.origin.includes(topOrigin)) {
    const catMatch = aspects.find(a => a.startsWith('品种匹配'));
    if (catMatch) {
      reasons.push(`${topOrigin}产区是您的心头好`);
      reasons.push(`这款${tea.category}延续了该产区的优良品质`);
    } else {
      reasons.push(`您多次品鉴${topOrigin}产区的茶品，风味认同感强`);
    }
  }

  const matchingFlavors = preferredFlavors.filter(f =>
    tea.flavor.some(tf => tf.includes(f) || f.includes(tf))
  );
  if (matchingFlavors.length > 0 && !reasons.some(r => r.includes('口感') || r.includes('风味'))) {
    reasons.push(`您偏好的${matchingFlavors.slice(0, 2).join('、')}风味尤为突出`);
  }

  if (aspects.includes('温度匹配') && reasons.length < 2) {
    reasons.push(`冲泡温度与您的习惯高度契合`);
  }

  if (reasons.length === 0) {
    const rating = avgRatingByCategory[tea.category];
    if (rating > 0) {
      reasons.push(`您给${tea.category}的平均评分达到${rating.toFixed(1)}分`);
    } else {
      reasons.push(`在${tea.category}品类中综合表现突出`);
    }
  }

  let ending = `，推荐这款${tea.name}`;
  const tastedCount = records.filter(r => r.category === tea.category).length;
  if (tastedCount >= 3 && !tea.name.includes(topCategory || '')) {
    ending = `，不妨试试这款${tea.name}拓宽味蕾边界`;
  } else if (aspects.includes('未品鉴') && tea.flavor.length > 0) {
    ending = `，这款${tea.name}的${tea.flavor[0]}值得您品鉴`;
  }

  return reasons.join('，') + ending + '。';
}

export function calculateRecommendations(
  allTeas: TeaItem[],
  tasteVector: TasteVector,
  records: TastingRecord[],
  topN: number = 5
): RecommendedTea[] {
  if (allTeas.length === 0) return [];

  const tastedNames = new Set(records.map(r => r.teaName));
  const tastedOrigins = new Set(records.map(r => r.origin));
  const userProfile = analyzeUserPreferences(records, tasteVector);

  const scored = allTeas.map(tea => {
    const matchAspects: string[] = [];
    let score = 0;

    if (tasteVector.totalRecords > 0) {
      const categoryVec: Record<string, number> = {};
      TEA_CATEGORIES.forEach(c => {
        categoryVec[c] = tasteVector.categoryWeights[c];
      });
      const teaCatVec: Record<string, number> = {};
      teaCatVec[tea.category] = 1;
      const catSim = cosineSimilarity(categoryVec, teaCatVec);
      score += catSim * 4.5;
      if (catSim > 0.5) matchAspects.push(`品种匹配:${tea.category}`);

      const originVec: Record<string, number> = {};
      Object.entries(tasteVector.originWeights).forEach(([o, w]) => {
        originVec[o] = w;
      });
      const teaOriginVec: Record<string, number> = {};
      teaOriginVec[tea.origin] = 1;
      const originSim = cosineSimilarity(originVec, teaOriginVec);
      score += originSim * 3.0;
      if (originSim > 0.3) matchAspects.push(`产区契合:${tea.origin}`);

      const tempSim = tempSimilarity(tasteVector.tempPreference, tea.temp);
      score += tempSim * 1.5;
      if (tempSim > 0.7) matchAspects.push('温度匹配');
    } else {
      score = 5;
      matchAspects.push('精选入门茶品');
    }

    if (!tastedNames.has(tea.name)) {
      score += 0.8;
      matchAspects.push('未品鉴');
    }

    if (tastedOrigins.has(tea.origin) && !tastedNames.has(tea.name)) {
      score += 0.5;
    }

    if (tea.flavor && tea.flavor.length > 0) {
      const matchingFlavors = userProfile.preferredFlavors.filter(f =>
        tea.flavor.some(tf => tf.includes(f) || f.includes(tf))
      );
      score += Math.min(matchingFlavors.length * 0.25, 0.75);
      if (matchingFlavors.length > 0) {
        matchAspects.push(`风味契合:${matchingFlavors.join('、')}`);
      }
    }

    const reason = generateReason(tea, tasteVector, matchAspects, userProfile, records);

    return {
      ...tea,
      score: Math.round(score * 100) / 100,
      reason,
      matchAspects
    } as RecommendedTea;
  });

  scored.sort((a, b) => b.score - a.score);

  const result: RecommendedTea[] = [];
  const usedCategories = new Set<TeaCategory>();
  for (const item of scored) {
    if (result.length >= topN) break;
    if (!usedCategories.has(item.category) || result.length >= TEA_CATEGORIES.length) {
      result.push(item);
      usedCategories.add(item.category);
    }
  }

  while (result.length < topN && scored.length > result.length) {
    const next = scored.find(s => !result.includes(s));
    if (next) result.push(next);
    else break;
  }

  return result;
}

export interface QuickFillData {
  teaName: string;
  category: TeaCategory;
  origin: string;
  temperature: number;
}

export function createQuickFill(tea: TeaItem): QuickFillData {
  return {
    teaName: tea.name,
    category: tea.category,
    origin: tea.origin,
    temperature: tea.temp
  };
}

export interface PerformanceResult<T> {
  result: T;
  durationMs: number;
}

export function measurePerformance<T>(fn: () => T, label: string = 'operation'): PerformanceResult<T> {
  const start = performance.now();
  const result = fn();
  const durationMs = performance.now() - start;
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Performance] ${label}: ${durationMs.toFixed(2)}ms`);
  }
  return { result, durationMs };
}
