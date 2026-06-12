export interface Ingredient {
  id: string
  name: string
  emoji: string
  quantity: number
  unit: string
  expireDate: string
}

export interface RecipeIngredient {
  ingredientId: string
  name: string
  emoji: string
  requiredQuantity: number
  unit: string
}

export interface Recipe {
  id: string
  name: string
  thumbnail: string
  heroImage: string
  estimatedTime: number
  isUserCreated: boolean
  ingredients: RecipeIngredient[]
  steps: string[]
  createdAt: string
}

export interface ShoppingItem {
  ingredientId: string
  name: string
  emoji: string
  quantity: number
  unit: string
  isRequired: boolean
}

export interface RecommendationResult {
  recipeId: string
  recipeName: string
  missingItems: ShoppingItem[]
  lowStockItems: ShoppingItem[]
  completeness: number
}

export interface GenerateResult {
  recommendations: RecommendationResult[]
  allMissing: ShoppingItem[]
  allLowStock: ShoppingItem[]
}
