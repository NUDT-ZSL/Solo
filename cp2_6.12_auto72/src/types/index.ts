export type ToolType = 'digital' | 'watercolor' | 'pencil'

export interface Artwork {
  id: string
  title: string
  imageUrl: string
  thumbnailUrl: string
  createdAt: string
  year: number
  tools: ToolType[]
  size: string
  description: string
  colorPalette: ColorSwatch[]
  styleMetrics: StyleMetrics
}

export interface ColorSwatch {
  hex: string
  percentage: number
}

export interface StyleMetrics {
  warmRatio: number
  coolRatio: number
  saturation: number
  brightness: number
  contrast: number
}

export interface TrendDataPoint {
  label: string
  value: number
  date: string
}
