import type { FlavorProfile, Taste, NetworkNode, NetworkEdge, SimilarFood } from '../data/mockData.js';

function cosineSimilarity(a: Taste, b: Taste): number {
  const keys: (keyof Taste)[] = ['sweet', 'salty', 'sour', 'bitter', 'umami', 'spicy'];
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (const key of keys) {
    dotProduct += a[key] * b[key];
    normA += a[key] * a[key];
    normB += b[key] * b[key];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function findSimilarFoods(profiles: FlavorProfile[], targetId: string, topN: number = 5): SimilarFood[] {
  const target = profiles.find(p => p.id === targetId);
  if (!target) return [];

  const similarities = profiles
    .filter(p => p.id !== targetId)
    .map(p => ({
      id: p.id,
      foodName: p.foodName,
      imageUrl: p.imageUrl,
      similarity: Math.round(cosineSimilarity(target.taste, p.taste) * 100),
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topN);

  return similarities;
}

export function generateNetworkData(profiles: FlavorProfile[]): { nodes: NetworkNode[]; edges: NetworkEdge[] } {
  const moodColors: Record<string, string> = {
    happy: '#D4845A',
    relaxed: '#8FB996',
    excited: '#E07A5F',
    nostalgic: '#C9A96E',
    neutral: '#9CA3AF',
  };

  const centerX = 400;
  const centerY = 300;
  const radius = 220;

  const nodes: NetworkNode[] = profiles.map((p, i) => {
    const angle = (2 * Math.PI * i) / profiles.length - Math.PI / 2;
    const maxLikes = Math.max(...profiles.map(fp => fp.likes));
    const normalizedLikes = p.likes / maxLikes;
    return {
      id: p.id,
      foodName: p.foodName,
      size: 15 + normalizedLikes * 30,
      color: moodColors[p.moodType] || moodColors.neutral,
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    };
  });

  const edges: NetworkEdge[] = [];
  const threshold = 0.5;

  for (let i = 0; i < profiles.length; i++) {
    for (let j = i + 1; j < profiles.length; j++) {
      const sim = cosineSimilarity(profiles[i].taste, profiles[j].taste);
      if (sim >= threshold) {
        edges.push({
          source: profiles[i].id,
          target: profiles[j].id,
          weight: Math.round(sim * 100) / 100,
        });
      }
    }
  }

  return { nodes, edges };
}
