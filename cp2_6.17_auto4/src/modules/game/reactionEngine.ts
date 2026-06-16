import recipes from '../data/recipes.json'

export interface Material {
  id: string
  name: string
  color: string
}

export interface Recipe {
  id: string
  name: string
  formula: string
  description: string
  materials: string[]
  minTemp: number
  maxTemp: number
  requireStir?: boolean
}

export interface ReactionResult {
  recipe: Recipe
  timestamp: number
}

export const MATERIALS: Material[] = [
  { id: 'sulfur', name: '硫磺', color: '#ffd700' },
  { id: 'mercury', name: '水银', color: '#c0c0c0' },
  { id: 'salt', name: '盐', color: '#ffffff' },
  { id: 'lead', name: '铅', color: '#6b7280' },
  { id: 'copper', name: '铜', color: '#b87333' },
  { id: 'iron', name: '铁', color: '#708090' },
  { id: 'tin', name: '锡', color: '#a8a8a8' },
  { id: 'silver', name: '银', color: '#e8e8e8' },
]

export function getMaterialById(id: string): Material | undefined {
  return MATERIALS.find((m) => m.id === id)
}

export function checkReaction(
  materialsInCauldron: string[],
  temperature: number,
  recentlyStirred: boolean
): ReactionResult | null {
  if (materialsInCauldron.length === 0) return null

  const sortedMaterials = [...materialsInCauldron].sort()

  for (const recipe of recipes as Recipe[]) {
    const sortedRecipeMaterials = [...recipe.materials].sort()

    if (sortedMaterials.length !== sortedRecipeMaterials.length) continue

    const match = sortedMaterials.every(
      (m, i) => m === sortedRecipeMaterials[i]
    )

    if (!match) continue

    if (temperature < recipe.minTemp || temperature > recipe.maxTemp) continue

    if (recipe.requireStir && !recentlyStirred) continue

    return { recipe, timestamp: Date.now() }
  }

  return null
}
