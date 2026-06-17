import { getRecipeById, Ingredient } from './recipesData';
import { UserIngredient, isIngredientMatch } from './matchingEngine';

export interface ShoppingItem {
  name: string;
  quantity: number;
  unit?: string;
}

function mergeQuantities(items: ShoppingItem[]): ShoppingItem[] {
  const merged: Record<string, ShoppingItem> = {};
  
  items.forEach(item => {
    const key = item.name + (item.unit || '');
    
    if (merged[key]) {
      merged[key].quantity += item.quantity;
    } else {
      merged[key] = { ...item };
    }
  });
  
  return Object.values(merged);
}

export function generateShoppingList(
  recipeIds: string[],
  userIngredients: UserIngredient[]
): ShoppingItem[] {
  let allMissingIngredients: Ingredient[] = [];
  
  recipeIds.forEach(recipeId => {
    const recipe = getRecipeById(recipeId);
    
    if (!recipe) return;
    
    recipe.ingredients.forEach(ingredient => {
      const hasIngredient = userIngredients.some(userIng =>
        isIngredientMatch(userIng.name, ingredient.name)
      );
      
      if (!hasIngredient) {
        allMissingIngredients.push(ingredient);
      }
    });
  });
  
  const shoppingItems: ShoppingItem[] = allMissingIngredients.map(ing => ({
    name: ing.name,
    quantity: ing.quantity,
    unit: ing.unit
  }));
  
  return mergeQuantities(shoppingItems);
}

export function generateShoppingListForSingleRecipe(
  recipeId: string,
  userIngredients: UserIngredient[]
): ShoppingItem[] {
  return generateShoppingList([recipeId], userIngredients);
}
