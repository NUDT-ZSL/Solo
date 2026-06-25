import type { Recipe, Recommendation } from '../types';

function tokenize(text: string): string[] {
  return text.toLowerCase().match(/[\w\u4e00-\u9fa5]+/g) || [];
}

function getWordFrequency(tokens: string[]): Map<string, number> {
  const freq = new Map<string, number>();
  for (const token of tokens) {
    freq.set(token, (freq.get(token) || 0) + 1);
  }
  return freq;
}

function cosineSimilarity(textA: string, textB: string): number {
  const tokensA = tokenize(textA);
  const tokensB = tokenize(textB);

  if (tokensA.length === 0 || tokensB.length === 0) return 0;

  const freqA = getWordFrequency(tokensA);
  const freqB = getWordFrequency(tokensB);

  const allWords = new Set([...freqA.keys(), ...freqB.keys()]);

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (const word of allWords) {
    const a = freqA.get(word) || 0;
    const b = freqB.get(word) || 0;
    dotProduct += a * b;
    normA += a * a;
    normB += b * b;
  }

  if (normA === 0 || normB === 0) return 0;

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

function calculateRecipeSimilarity(recipeA: Recipe, recipeB: Recipe): number {
  if (recipeA.steps.length === 0 || recipeB.steps.length === 0) return 0;

  const allDescriptionsA = recipeA.steps.map(s => s.description).join(' ');
  const allDescriptionsB = recipeB.steps.map(s => s.description).join(' ');

  return cosineSimilarity(allDescriptionsA, allDescriptionsB);
}

export function clusterRecipes(
  currentRecipe: Recipe,
  allRecipes: Recipe[],
  threshold: number = 0.6
): Recommendation[] {
  const recommendations: Recommendation[] = [];

  for (const recipe of allRecipes) {
    if (recipe.id === currentRecipe.id) continue;

    const similarity = calculateRecipeSimilarity(currentRecipe, recipe);

    if (similarity >= threshold) {
      recommendations.push({ recipe, similarity });
    }
  }

  return recommendations
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 3);
}

export function recommendImprovements(currentRecipe: Recipe, similarRecipes: Recommendation[]): string[] {
  const improvements: string[] = [];

  for (const { recipe, similarity } of similarRecipes) {
    if (recipe.averageRating > currentRecipe.averageRating) {
      improvements.push(
        `参考《${recipe.name}》（相似度 ${(similarity * 100).toFixed(1)}%）的高分做法，可尝试优化调味比例`
      );
    }

    if (recipe.totalDuration < currentRecipe.totalDuration * 0.8) {
      improvements.push(
        `《${recipe.name}》的制作效率更高，可参考其步骤简化方式（节省${Math.round(currentRecipe.totalDuration - recipe.totalDuration)}分钟）`
      );
    }

    if (recipe.steps.length < currentRecipe.steps.length) {
      improvements.push(
        `《${recipe.name}》仅用${recipe.steps.length}步完成，可能有更简洁的步骤组合方式`
      );
    }
  }

  return improvements.slice(0, 3);
}
