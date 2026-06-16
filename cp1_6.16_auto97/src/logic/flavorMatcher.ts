import { FLAVOR_TAGS } from '@/constants/flavors';
import type { FlavorCategory } from '@/types';

export function matchFlavorProfile(flavorsA: string[], flavorsB: string[]): number {
  const allFlavors = FLAVOR_TAGS.map(f => f.id);
  const tf: Record<string, number[]> = {};

  allFlavors.forEach(flavor => {
    tf[flavor] = [
      flavorsA.includes(flavor) ? 1 : 0,
      flavorsB.includes(flavor) ? 1 : 0,
    ];
  });

  const docFreq: Record<string, number> = {};
  allFlavors.forEach(flavor => {
    docFreq[flavor] = tf[flavor].filter(v => v > 0).length;
  });

  const numDocs = 2;
  const idf: Record<string, number> = {};
  allFlavors.forEach(flavor => {
    idf[flavor] = Math.log((numDocs + 1) / (docFreq[flavor] + 1)) + 1;
  });

  const tfidfA: number[] = [];
  const tfidfB: number[] = [];
  allFlavors.forEach(flavor => {
    tfidfA.push(tf[flavor][0] * idf[flavor]);
    tfidfB.push(tf[flavor][1] * idf[flavor]);
  });

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < tfidfA.length; i++) {
    dotProduct += tfidfA[i] * tfidfB[i];
    normA += tfidfA[i] * tfidfA[i];
    normB += tfidfB[i] * tfidfB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function computeChallengeScore(isCorrect: boolean, streak: number): number {
  if (!isCorrect) return 0;
  const baseScore = 10;
  const streakBonus = streak >= 1 ? 5 : 0;
  return baseScore + streakBonus;
}

export function getFlavorCategory(flavorId: string): FlavorCategory | null {
  const tag = FLAVOR_TAGS.find(f => f.id === flavorId);
  return tag ? tag.category : null;
}

export function calculateFlavorStats(flavorLists: string[][]): Record<FlavorCategory, number> {
  const counts: Record<FlavorCategory, number> = {
    floral: 0,
    fruity: 0,
    nutty: 0,
    chocolate: 0,
    spicy: 0,
  };

  let total = 0;

  flavorLists.forEach(flavors => {
    flavors.forEach(fid => {
      const cat = getFlavorCategory(fid);
      if (cat) {
        counts[cat] += 1;
        total += 1;
      }
    });
  });

  if (total === 0) return counts;

  (Object.keys(counts) as FlavorCategory[]).forEach(cat => {
    counts[cat] = Math.round((counts[cat] / total) * 100);
  });

  return counts;
}
