export interface RGB {
  r: number
  g: number
  b: number
}

export interface HSL {
  h: number
  s: number
  l: number
}

export interface ColorValue {
  hex: string
  rgb: RGB
  hsl: HSL
}

export interface PaletteVersion {
  id: string
  name: string
  createdAt: string
  colors: ColorValue[]
}

export interface ComparisonItem {
  index: number
  color1: ColorValue
  color2: ColorValue
  difference: number
  level: string
  levelColor: string
}

export interface ComparisonResult {
  version1: PaletteVersion
  version2: PaletteVersion
  comparisons: ComparisonItem[]
  overallDifference: number
  overallLevel: string
  overallLevelColor: string
}

export type ThemeMode = 'light' | 'dark'
