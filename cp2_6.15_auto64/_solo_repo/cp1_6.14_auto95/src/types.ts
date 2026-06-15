export interface Ingredient {
  name: string
  amount: string
}

export interface Step {
  id: string
  text: string
  duration: number
}

export interface Recipe {
  id: string
  name: string
  description: string
  tags: string[]
  imageUrl: string
  ingredients: Ingredient[]
  steps: Step[]
  servings: number
}

export interface TimerItem {
  id: string
  label: string
  duration: number
  remaining: number
  running: boolean
  finished: boolean
}
