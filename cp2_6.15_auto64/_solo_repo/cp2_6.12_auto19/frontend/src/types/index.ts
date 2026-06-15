export type Category = 'top' | 'bottom' | 'shoes' | 'accessory'

export interface ClothingStyle {
  id: string
  name: string
  category: Category
  colors: string[]
  shape: 'tshirt' | 'shirt' | 'sweater' | 'jacket' | 'coat' | 'pants' | 'skirt' | 'shorts' | 'dress' | 'sneakers' | 'boots' | 'heels' | 'loafers' | 'hat' | 'bag' | 'necklace' | 'bracelet' | 'scarf'
  yPosition: number
  scale: number
}

export interface SelectedClothing {
  styleId: string
  color: string
}

export interface OutfitSelection {
  top: SelectedClothing | null
  bottom: SelectedClothing | null
  shoes: SelectedClothing | null
  accessory: SelectedClothing | null
}

export interface Outfit {
  id: string
  name: string
  createdAt: string
  top: SelectedClothing
  bottom: SelectedClothing
  shoes: SelectedClothing
  accessory: SelectedClothing | null
  thumbnail: string
  likes: number
}

export interface SaveOutfitRequest {
  name: string
  top: SelectedClothing
  bottom: SelectedClothing
  shoes: SelectedClothing
  accessory: SelectedClothing | null
  thumbnail: string
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}
