import type { Season } from '../plantData'

export interface SeasonColorResult {
  color: string
  emissive: string
  emissiveIntensity: number
}

const seasonColorMap: Record<Season, SeasonColorResult> = {
  spring: { color: '#a5d6a7', emissive: '#66bb6a', emissiveIntensity: 0.15 },
  summer: { color: '#2e7d32', emissive: '#1b5e20', emissiveIntensity: 0.1 },
  autumn: { color: '#ff8f00', emissive: '#e65100', emissiveIntensity: 0.2 },
  winter: { color: '#9e9e9e', emissive: '#616161', emissiveIntensity: 0.05 }
}

export function getSeasonColor(season: Season): SeasonColorResult {
  return seasonColorMap[season]
}
