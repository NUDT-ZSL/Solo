import { Recipe, Ingredient, RECIPES } from './recipesData';

export interface UserIngredient {
  name: string;
  quantity: number;
}

export interface MatchResult {
  recipe: Recipe;
  matchPercentage: number;
  matchLevel: 'perfect' | 'high' | 'medium' | 'low';
  matchedIngredients: string[];
  missingIngredients: Ingredient[];
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

export function isIngredientMatch(userName: string, recipeName: string): boolean {
  const normUser = normalizeName(userName);
  const normRecipe = normalizeName(recipeName);
  
  if (normUser === normRecipe) return true;
  
  if (normRecipe.includes(normUser) || normUser.includes(normRecipe)) return true;
  
  const aliases: Record<string, string[]> = {
    '葱姜蒜': ['葱', '姜', '蒜'],
    '生抽': ['酱油'],
    '花生油': ['油'],
    '橄榄油': ['油'],
    '西红柿': ['番茄']
  };
  
  for (const [key, values] of Object.entries(aliases)) {
    if (normUser === normalizeName(key) && values.some(v => normalizeName(v) === normRecipe)) return true;
    if (normRecipe === normalizeName(key) && values.some(v => normalizeName(v) === normUser)) return true;
  }
  
  return false;
}

export function calculateMatch(
  recipe: Recipe,
  userIngredients: UserIngredient[]
): MatchResult {
  const matched: string[] = [];
  const missing: Ingredient[] = [];
  
  recipe.ingredients.forEach(recipeIngredient => {
    const found = userIngredients.find(userIng =>
      isIngredientMatch(userIng.name, recipeIngredient.name)
    );
    
    if (found) {
      matched.push(recipeIngredient.name);
    } else {
      missing.push(recipeIngredient);
    }
  });
  
  const totalIngredients = recipe.ingredients.length;
  const matchPercentage = totalIngredients === 0
    ? 0
    : Math.round((matched.length / totalIngredients) * 100);
  
  let matchLevel: 'perfect' | 'high' | 'medium' | 'low';
  if (matchPercentage === 100) {
    matchLevel = 'perfect';
  } else if (matchPercentage >= 70) {
    matchLevel = 'high';
  } else if (matchPercentage >= 50) {
    matchLevel = 'medium';
  } else {
    matchLevel = 'low';
  }
  
  return {
    recipe,
    matchPercentage,
    matchLevel,
    matchedIngredients: matched,
    missingIngredients: missing
  };
}

export function matchRecipes(userIngredients: UserIngredient[]): MatchResult[] {
  const results = RECIPES.map(recipe => calculateMatch(recipe, userIngredients));
  
  results.sort((a, b) => {
    if (b.matchPercentage !== a.matchPercentage) {
      return b.matchPercentage - a.matchPercentage;
    }
    return a.recipe.ingredients.length - b.recipe.ingredients.length;
  });
  
  return results;
}
