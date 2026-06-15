export interface Aroma {
  id: number
  name: string
  category: 'floral' | 'woody' | 'fruity' | 'fresh' | 'spicy' | 'herbal'
  color: string
  description: string
  rgb: string
}

export interface SelectedAroma {
  aroma: Aroma
  ratio: number
}

export interface MixResult {
  color: string
  rgb: [number, number, number]
  name: string
}

export interface RecipeAroma {
  aroma_id: number
  name: string
  color: string
  ratio: number
}

export interface Recipe {
  id: number
  name: string
  created_at: string
  aromas: RecipeAroma[]
}
