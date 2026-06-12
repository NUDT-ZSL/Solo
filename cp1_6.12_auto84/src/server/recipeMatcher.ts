import { Recipe, UserPreference } from './db';

export interface MatchedRecipe extends Recipe {
  matchPercentage: number;
  matchedIngredients: string[];
  missingIngredients: string[];
  score: number;
  scoreBreakdown: {
    coverage: number;
    categoryPreference: number;
    ratingPreference: number;
    selfFavorite: number;
    selfRating: number;
    searchHistory: number;
  };
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

function calculateCategoryPreference(
  recipe: Recipe,
  preferences: UserPreference,
  allRecipes: Recipe[]
): number {
  const favoriteIds = new Set(preferences.favoriteRecipes.map((f) => f.recipeId));
  const highRatedIds = new Set(
    Object.entries(preferences.ratings)
      .filter(([, r]) => r >= 4)
      .map(([id]) => id)
  );

  const categoryCount: Record<string, number> = {};
  for (const r of allRecipes) {
    if (favoriteIds.has(r.id) || highRatedIds.has(r.id)) {
      categoryCount[r.category] = (categoryCount[r.category] || 0) + 1;
    }
  }

  const totalPreferred =
    preferences.favoriteRecipes.length +
    Object.values(preferences.ratings).filter((r) => r >= 4).length;

  if (totalPreferred === 0 || !categoryCount[recipe.category]) {
    return 0;
  }

  const categoryRatio = categoryCount[recipe.category] / totalPreferred;
  return Math.round(categoryRatio * 25);
}

function calculateRatingPreference(
  recipe: Recipe,
  preferences: UserPreference,
  allRecipes: Recipe[]
): number {
  const categoryRatings: Record<string, number[]> = {};
  for (const [id, rating] of Object.entries(preferences.ratings)) {
    const r = allRecipes.find((x) => x.id === id);
    if (r) {
      if (!categoryRatings[r.category]) {
        categoryRatings[r.category] = [];
      }
      categoryRatings[r.category].push(rating);
    }
  }

  const ratings = categoryRatings[recipe.category];
  if (!ratings || ratings.length === 0) {
    return 0;
  }

  const avgRating = ratings.reduce((a, b) => a + b, 0) / ratings.length;
  return Math.round((avgRating / 5) * 15);
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
      if (
        normalizedUser.some(
          (u) => u.includes(recipeName) || recipeName.includes(u)
        )
      ) {
        matchedIngredients.push(originalName);
      } else {
        missingIngredients.push(originalName);
      }
    }

    const total = recipe.ingredients.length;
    const matchPercentage =
      total === 0 ? 0 : Math.round((matchedIngredients.length / total) * 100);

    if (matchPercentage >= 60) {
      const coverageScore = matchPercentage * 0.6;

      const categoryPreference = calculateCategoryPreference(
        recipe,
        preferences,
        recipes
      );

      const ratingPreference = calculateRatingPreference(
        recipe,
        preferences,
        recipes
      );

      const selfFavorite = preferences.favoriteRecipes.some(
        (f) => f.recipeId === recipe.id
      )
        ? 10
        : 0;

      const selfRating = preferences.ratings[recipe.id]
        ? preferences.ratings[recipe.id] * 2
        : 0;

      const searchHistoryCount = preferences.searchHistory.filter((history) =>
        history.some((ing) =>
          recipe.ingredients.some((ri) =>
            normalizeName(ri.name).includes(normalizeName(ing))
          )
        )
      ).length;
      const searchHistory = Math.min(searchHistoryCount * 1.5, 8);

      const totalScore =
        coverageScore +
        categoryPreference +
        ratingPreference +
        selfFavorite +
        selfRating +
        searchHistory;

      matched.push({
        ...recipe,
        matchPercentage,
        matchedIngredients,
        missingIngredients,
        score: Math.round(totalScore * 100) / 100,
        scoreBreakdown: {
          coverage: Math.round(coverageScore * 100) / 100,
          categoryPreference,
          ratingPreference,
          selfFavorite,
          selfRating,
          searchHistory
        }
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
    const categoryPreference = calculateCategoryPreference(
      recipe,
      preferences,
      recipes
    );
    const ratingPreference = calculateRatingPreference(
      recipe,
      preferences,
      recipes
    );

    let score = 0;
    if (categoryCount[recipe.category]) {
      score += categoryCount[recipe.category] * 8;
    }
    if (recentIngredients.length > 0) {
      const normalizedRecent = recentIngredients.map(normalizeName);
      const matchCount = recipe.ingredients.filter((ri) =>
        normalizedRecent.some(
          (r) =>
            normalizeName(ri.name).includes(r) ||
            r.includes(normalizeName(ri.name))
        )
      ).length;
      score += matchCount * 4;
    }
    const rating = preferences.ratings[recipe.id] || 0;
    score += rating * 3;
    if (favoriteIds.includes(recipe.id)) {
      score += 8;
    }
    score += categoryPreference + ratingPreference;

    const matchedIngredients: string[] = [];
    const missingIngredients: string[] = [];
    const normalizedRecent = recentIngredients.map(normalizeName);
    for (const ing of recipe.ingredients) {
      if (
        normalizedRecent.some(
          (r) =>
            normalizeName(ing.name).includes(r) ||
            r.includes(normalizeName(ing.name))
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
        : Math.round(
            (matchedIngredients.length / recipe.ingredients.length) * 100
          );

    return {
      ...recipe,
      matchPercentage,
      matchedIngredients,
      missingIngredients,
      score,
      scoreBreakdown: {
        coverage: 0,
        categoryPreference,
        ratingPreference,
        selfFavorite: favoriteIds.includes(recipe.id) ? 10 : 0,
        selfRating: rating * 2,
        searchHistory: 0
      }
    } as MatchedRecipe;
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 3);
}
