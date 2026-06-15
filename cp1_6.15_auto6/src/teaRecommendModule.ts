import type { TasteVector, TeaCategory, TastingRecord } from './teaRecordModule';
import { TEA_CATEGORIES } from './teaRecordModule';

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

function generateReason(
  tea: TeaItem,
  vector: TasteVector,
  aspects: string[]
): string {
  if (vector.totalRecords === 0) {
    return `${tea.name}是${tea.category}中的经典之作，${tea.description.split('，')[0]}，非常适合开启您的品鉴之旅。`;
  }

  const reasons: string[] = [];
  const topCat = vector.preferredCategories[0];
  const topOrigin = vector.topOrigins[0];

  if (topCat && tea.category === topCat) {
    const catIntensity = vector.categoryWeights[topCat] > 2 ? '浓烈' : '醇厚';
    reasons.push(`因为您偏爱${topCat}的${catIntensity}`);
  }

  if (topOrigin && tea.origin.includes(topOrigin)) {
    reasons.push(`您多次品鉴${topOrigin}产区的茶品`);
  }

  if (aspects.includes('温度匹配')) {
    reasons.push(`冲泡温度与您的习惯相近`);
  }

  if (reasons.length === 0) {
    reasons.push(`在${tea.category}品类中综合评分较高`);
  }

  const extra = aspects.find(a => a !== '温度匹配' && !a.includes('产区') && !a.includes('品种'));
  const end = extra ? `，这款${tea.name}${extra.slice(0, 4)}更值得一试` : `，推荐这款${tea.name}`;

  return reasons.join('，') + end + '。';
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
      score += Math.min(tea.flavor.length * 0.1, 0.5);
    }

    const reason = generateReason(tea, tasteVector, matchAspects);

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
