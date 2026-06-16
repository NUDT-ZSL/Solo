export interface FlavorItem {
  name: string;
  color: string;
  category: string;
  description: string;
}

const CATEGORY_WEIGHTS: Record<string, number> = {
  花香: 1.2,
  果香: 1.0,
  坚果: 0.9,
  巧克力: 0.9,
  香料: 1.1,
};

const FLAVOR_IDF: Record<string, number> = {};
const ALL_FLAVORS = [
  '茉莉', '玫瑰', '洋甘菊',
  '柑橘', '莓果', '热带水果', '核果',
  '榛果', '杏仁', '核桃',
  '黑巧克力', '牛奶巧克力', '可可',
  '肉桂', '丁香', '黑胡椒',
];

ALL_FLAVORS.forEach((f) => {
  FLAVOR_IDF[f] = 1 + Math.log(ALL_FLAVORS.length / (1 + ALL_FLAVORS.filter((x) => x.includes(f.charAt(0))).length));
});

function toVector(flavors: FlavorItem[]): Record<string, number> {
  const vec: Record<string, number> = {};
  flavors.forEach((f) => {
    const tf = 1;
    const idf = FLAVOR_IDF[f.name] || 1;
    const weight = CATEGORY_WEIGHTS[f.category] || 1;
    vec[f.name] = tf * idf * weight;
  });
  return vec;
}

function cosineSimilarity(vecA: Record<string, number>, vecB: Record<string, number>): number {
  const allKeys = new Set([...Object.keys(vecA), ...Object.keys(vecB)]);
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  allKeys.forEach((key) => {
    const a = vecA[key] || 0;
    const b = vecB[key] || 0;
    dotProduct += a * b;
    normA += a * a;
    normB += b * b;
  });

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : Math.max(0, Math.min(1, dotProduct / denom));
}

export function matchFlavorProfile(flavorsA: FlavorItem[], flavorsB: FlavorItem[]): number {
  return cosineSimilarity(toVector(flavorsA), toVector(flavorsB));
}

export function computeChallengeScore(isCorrect: boolean, streak: number): number {
  if (!isCorrect) return 0;
  const baseScore = 10;
  const bonus = streak >= 2 ? 5 : 0;
  return baseScore + bonus;
}
