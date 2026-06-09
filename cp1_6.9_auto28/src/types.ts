export interface Ingredient {
  id: string
  name: string
  icon: string
  category: 'vegetable' | 'protein' | 'staple' | 'seasoning'
  calories: number
  protein: number
  fat: number
  carbs: number
}

export interface WorkspaceIngredient extends Ingredient {
  amount: number
}

export interface NutritionData {
  totalCalories: number
  protein: number
  fat: number
  carbs: number
  proteinPercent: number
  fatPercent: number
  carbsPercent: number
}

export type Difficulty = 'easy' | 'medium' | 'hard'

export interface RecipeMetadata {
  name: string
  difficulty: Difficulty
  duration: number
  description: string
}

export interface RecipeData {
  name: string
  difficulty: Difficulty
  duration: number
  description: string
  ingredients: WorkspaceIngredient[]
  nutrition: NutritionData
}

export interface SavedRecipe extends RecipeData {
  id: string
  createdAt: number
}

export interface CategoryInfo {
  key: string
  label: string
  icon: string
  color: string
}

export const CATEGORIES: CategoryInfo[] = [
  { key: 'vegetable', label: '蔬菜', icon: '🥬', color: '#7CB342' },
  { key: 'protein', label: '蛋白质', icon: '🍗', color: '#E65100' },
  { key: 'staple', label: '主食', icon: '🍚', color: '#F9A825' },
  { key: 'seasoning', label: '调料', icon: '🧂', color: '#8D6E63' }
]

export const DIFFICULTY_STARS: Record<Difficulty, number> = {
  easy: 1,
  medium: 2,
  hard: 3
}

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: '简单',
  medium: '中等',
  hard: '困难'
}
