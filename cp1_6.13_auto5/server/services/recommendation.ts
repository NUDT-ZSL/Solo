import type { Ingredient, Recipe, RecipeIngredient, ShoppingItem, RecommendationResult } from '../database'

function findIngredientInInventory(ingredientId: string, inventory: Ingredient[]): Ingredient | undefined {
  return inventory.find(item => item.id === ingredientId)
}

function calculateRecipeDeficiency(
  recipe: Recipe,
  inventory: Ingredient[]
): { missingItems: ShoppingItem[]; lowStockItems: ShoppingItem[]; completeness: number } {
  const missingItems: ShoppingItem[] = []
  const lowStockItems: ShoppingItem[] = []
  const totalIngredients = recipe.ingredients.length
  let completeCount = 0

  for (const req of recipe.ingredients) {
    const inStock = findIngredientInInventory(req.ingredientId, inventory)

    if (!inStock) {
      missingItems.push({
        ingredientId: req.ingredientId,
        name: req.name,
        emoji: req.emoji,
        quantity: req.requiredQuantity,
        unit: req.unit,
        isRequired: true,
      })
      continue
    }

    if (inStock.quantity < req.requiredQuantity) {
      lowStockItems.push({
        ingredientId: req.ingredientId,
        name: req.name,
        emoji: req.emoji,
        quantity: req.requiredQuantity - inStock.quantity,
        unit: req.unit,
        isRequired: false,
      })
    } else {
      completeCount++
    }
  }

  const completeness = totalIngredients > 0
    ? Math.round((completeCount / totalIngredients) * 100)
    : 100

  return { missingItems, lowStockItems, completeness }
}

export function generateRecommendations(
  recipes: Recipe[],
  inventory: Ingredient[]
): {
  recommendations: RecommendationResult[]
  allMissing: ShoppingItem[]
  allLowStock: ShoppingItem[]
} {
  const recommendations: RecommendationResult[] = []
  const missingMap = new Map<string, ShoppingItem>()
  const lowStockMap = new Map<string, ShoppingItem>()

  for (const recipe of recipes) {
    const { missingItems, lowStockItems, completeness } = calculateRecipeDeficiency(recipe, inventory)

    recommendations.push({
      recipeId: recipe.id,
      recipeName: recipe.name,
      missingItems,
      lowStockItems,
      completeness,
    })

    for (const item of missingItems) {
      const existing = missingMap.get(item.ingredientId)
      if (existing) {
        existing.quantity += item.quantity
      } else {
        missingMap.set(item.ingredientId, { ...item })
      }
    }

    for (const item of lowStockItems) {
      const existing = lowStockMap.get(item.ingredientId)
      if (existing) {
        existing.quantity += item.quantity
      } else {
        lowStockMap.set(item.ingredientId, { ...item })
      }
    }
  }

  const allMissing = Array.from(missingMap.values())
  const allLowStock = Array.from(lowStockMap.values())

  return { recommendations, allMissing, allLowStock }
}

export function generateShoppingListForRecipes(
  recipeIds: string[],
  recipes: Recipe[],
  inventory: Ingredient[],
  checkedIngredientIds: string[] = []
): { items: ShoppingItem[] } {
  const selectedRecipes = recipes.filter(r => recipeIds.includes(r.id))
  const itemMap = new Map<string, ShoppingItem>()

  for (const recipe of selectedRecipes) {
    const { missingItems, lowStockItems } = calculateRecipeDeficiency(recipe, inventory)

    const allNeeded = [...missingItems, ...lowStockItems]

    for (const item of allNeeded) {
      if (checkedIngredientIds.includes(item.ingredientId)) continue

      const existing = itemMap.get(item.ingredientId)
      if (existing) {
        existing.quantity += item.quantity
      } else {
        itemMap.set(item.ingredientId, { ...item })
      }
    }
  }

  return { items: Array.from(itemMap.values()) }
}
