export type CuisineType = 'chinese' | 'western' | 'japanese' | 'korean'

export interface Ingredient {
  name: string
  isMain?: boolean
}

export interface Recipe {
  id: string
  title: string
  steps: string
  coverImage: string
  cuisine: CuisineType
  ingredients: { name: string; isMain: boolean }[]
  rating: number
  ratingCount: number
  authorId: string
  createdAt: string
}

export interface Comment {
  id: string
  recipeId: string
  content: string
  likes: number
  dislikes: number
  userLike: 'like' | 'dislike' | null
  createdAt: string
}

export type MatchLevel = 'perfect' | 'partial' | 'little'

export interface MatchedRecipe extends Recipe {
  matchLevel: MatchLevel
  matchedIngredients: string[]
}
