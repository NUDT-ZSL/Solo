export interface Step {
  id: string
  index: number
  title: string
  action: string
  ingredients: string[]
  duration: number
  detail?: string
  image?: string
}

export interface Recipe {
  id: string
  title: string
  rawText: string
  steps: Step[]
  createdAt: number
  updatedAt: number
}

export interface RecipesData {
  recipes: Recipe[]
}
