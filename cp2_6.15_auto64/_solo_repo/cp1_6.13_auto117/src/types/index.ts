export type HarmonyType = 'complementary' | 'analogous' | 'triadic' | 'split-complementary'

export interface ColorScheme {
  _id?: string
  userId: string
  name: string
  colors: string[]
  harmonyType: HarmonyType
  isFavorite: boolean
  createdAt: number
  updatedAt: number
}

export interface SaveColorRequest {
  name: string
  colors: string[]
  userId: string
  harmonyType?: HarmonyType
}

export interface ToggleFavoriteRequest {
  userId: string
  schemeId: string
  isFavorite: boolean
}

export interface HSL {
  h: number
  s: number
  l: number
}

export interface RGB {
  r: number
  g: number
  b: number
}

export interface HarmonySchemes {
  complementary: string[]
  analogous: string[]
  triadic: string[]
  'split-complementary': string[]
}
