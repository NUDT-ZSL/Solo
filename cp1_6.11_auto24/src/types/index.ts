export interface RecipeStep {
  id: string
  stepNumber: number
  action: string
  duration: number
  ingredients: string[]
  detail: string
  imageUrl: string
  status: 'pending' | 'active' | 'completed'
}

export interface Recipe {
  id: string
  title: string
  rawText: string
  steps: RecipeStep[]
  createdAt: number
  updatedAt: number
}
