export interface Building {
  id: string
  x: number
  z: number
  width: number
  depth: number
  height: number
  color: string
  targetHeight: number
  hasCrown: boolean
}

export type PresetTemplate = 
  | 'default'
  | 'lowDensity'
  | 'commercial'
  | 'mixedUse'
  | 'waterfront'
  | 'futuristic'

export interface PresetConfig {
  name: string
  buildingCount: number
  heightRange: [number, number]
  colorPalette: string[]
  layout: 'random' | 'grid' | 'cluster' | 'linear'
}
