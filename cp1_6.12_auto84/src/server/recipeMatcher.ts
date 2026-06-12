import { Recipe, UserPreference } from './db';

export interface MatchedRecipe extends Recipe {
  matchPercentage: number;
  matchedIngredients: string[];
  missingIngredients: string[];
  score: number;
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

export function matchRecipes(
  recipes: Recipe[],
  userIngredients: string[],
  preferences: UserPreference
): MatchedRecipe[] {
  const normalizedUser = userIngredients.map(normalizeName);
  const matched: MatchedRecipe[] = [];

  for (const recipe of recipes) {
    const recipeIngredientNames = recipe.ingredients.map((ing) =>
      normalizeName(ing.name)
    );
    const matchedIngredients: string[] = [];
    const missingIngredients: string[] = [];

    for (let i = 0; i < recipe.ingredients.length; i++) {
      const recipeName = recipeIngredientNames[i];
      const originalName = recipe.ingredients[i].name;
      if (normalizedUser.some((u) => u.includes(recipeName) || recipeName.includes(u))) {
        matchedIngredients.push(originalName);
      } else {
        missingIngredients.push(originalName);
      }
    }

    const total = recipe.ingredients.length;
    const matchPercentage = total === 0 ? 0 : Math.round((matchedIngredients.length / total) * 100);

    if (matchPercentage >= 60) {
      let preferenceScore = 0;
      const favEntry = preferences.favoriteRecipes.find(
        (f) => f.recipeId === recipe.id
      );
      if (favEntry) {
        preferenceScore += 15;
      }
      const rating = preferences.ratings[recipe.id];
      if (rating) {
        preferenceScore += rating * 5;
      }
      const categoryCount = preferences.searchHistory.filter((history) =>
        history.some((ing) =>
          recipe.ingredients.some((ri) =>
            normalizeName(ri.name).includes(normalizeName(ing))
          )
        )
      ).length;
      preferenceScore += Math.min(categoryCount * 2, 10);

      matched.push({
        ...recipe,
        matchPercentage,
        matchedIngredients,
        missingIngredients,
        score: matchPercentage + preferenceScore
      });
    }
  }

  matched.sort((a, b) => b.score - a.score);
  return matched.slice(0, 10);
}

export function getRecommendations(
  recipes: Recipe[],
  preferences: UserPreference,
  recentIngredients: string[]
): MatchedRecipe[] {
  const favoriteIds = preferences.favoriteRecipes.map((f) => f.recipeId);
  const highRatedIds = Object.entries(preferences.ratings)
    .filter(([, r]) => r >= 4)
    .map(([id]) => id);
  const targetIds = new Set([...favoriteIds, ...highRatedIds]);

  const categoryCount: Record<string, number> = {};
  for (const recipe of recipes) {
    if (targetIds.has(recipe.id)) {
      categoryCount[recipe.category] = (categoryCount[recipe.category] || 0) + 1;
    }
  }

  const scored = recipes.map((recipe) => {
    let score = 0;
    if (categoryCount[recipe.category]) {
      score += categoryCount[recipe.category] * 10;
    }
    if (recentIngredients.length > 0) {
      const normalizedRecent = recentIngredients.map(normalizeName);
      const matchCount = recipe.ingredients.filter((ri) =>
        normalizedRecent.some((r) =>
          normalizeName(ri.name).includes(r) || r.includes(normalizeName(ri.name))
        )
      ).length;
      score += matchCount * 5;
    }
    const rating = preferences.ratings[recipe.id] || 0;
    score += rating * 3;
    if (favoriteIds.includes(recipe.id)) {
      score += 5;
    }

    const matchedIngredients: string[] = [];
    const missingIngredients: string[] = [];
    const normalizedRecent = recentIngredients.map(normalizeName);
    for (const ing of recipe.ingredients) {
      if (
        normalizedRecent.some(
          (r) =>
            normalizeName(ing.name).includes(r) || r.includes(normalizeName(ing.name))
        )
      ) {
        matchedIngredients.push(ing.name);
      } else {
        missingIngredients.push(ing.name);
      }
    }
    const matchPercentage =
      recipe.ingredients.length === 0
        ? 0
        : Math.round((matchedIngredients.length / recipe.ingredients.length) * 100);

    return {
      ...recipe,
      matchPercentage,
      matchedIngredients,
      missingIngredients,
      score
    } as MatchedRecipe;
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 3);
}
