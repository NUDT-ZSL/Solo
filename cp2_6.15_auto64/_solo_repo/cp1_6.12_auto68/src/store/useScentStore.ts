import { create } from 'zustand'

export interface ScentElement {
  id: string
  name: string
  color: string
  gradientStart: string
  gradientEnd: string
}

export interface RecipeItem {
  scentId: string
  ratio: number
}

export const SCENT_ELEMENTS: ScentElement[] = [
  { id: 'citrus', name: '柑橘', color: '#fbbf24', gradientStart: '#fde047', gradientEnd: '#f59e0b' },
  { id: 'lavender', name: '薰衣草', color: '#a78bfa', gradientStart: '#c4b5fd', gradientEnd: '#8b5cf6' },
  { id: 'rose', name: '玫瑰', color: '#f472b6', gradientStart: '#f9a8d4', gradientEnd: '#ec4899' },
  { id: 'sandalwood', name: '檀香', color: '#d97706', gradientStart: '#fbbf24', gradientEnd: '#b45309' },
  { id: 'ocean', name: '海洋', color: '#38bdf8', gradientStart: '#7dd3fc', gradientEnd: '#0ea5e9' },
  { id: 'pine', name: '松木香', color: '#22c55e', gradientStart: '#4ade80', gradientEnd: '#16a34a' },
  { id: 'vanilla', name: '香草', color: '#fcd34d', gradientStart: '#fef08a', gradientEnd: '#eab308' },
  { id: 'jasmine', name: '茉莉', color: '#fef3c7', gradientStart: '#ffffff', gradientEnd: '#fde68a' },
  { id: 'musk', name: '麝香', color: '#94a3b8', gradientStart: '#cbd5e1', gradientEnd: '#64748b' },
  { id: 'pepper', name: '胡椒', color: '#ef4444', gradientStart: '#fca5a5', gradientEnd: '#dc2626' }
]

interface ScentState {
  recipe: RecipeItem[]
  addScent: (scentId: string) => void
  removeScent: (scentId: string) => void
  updateRatio: (scentId: string, newRatio: number) => void
  adjustRatio: (scentId: string, delta: number) => void
  getTotalRatio: () => number
  getNormalizedRecipe: () => RecipeItem[]
  getMixedColor: () => { r: number; g: number; b: number }
}

const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : { r: 100, g: 100, b: 150 }
}

export const useScentStore = create<ScentState>((set, get) => ({
  recipe: [],

  addScent: (scentId: string) => {
    const { recipe } = get()
    if (recipe.find(r => r.scentId === scentId)) return
    const baseRatio = recipe.length === 0 ? 100 : Math.floor(100 / (recipe.length + 1))
    const newRecipe = [...recipe.map(r => ({ ...r, ratio: baseRatio })), { scentId, ratio: baseRatio }]
    const total = newRecipe.reduce((sum, r) => sum + r.ratio, 0)
    if (total !== 100 && newRecipe.length > 0) {
      newRecipe[0].ratio += (100 - total)
    }
    set({ recipe: newRecipe })
  },

  removeScent: (scentId: string) => {
    const { recipe } = get()
    const removed = recipe.find(r => r.scentId === scentId)
    if (!removed) return
    const remaining = recipe.filter(r => r.scentId !== scentId)
    if (remaining.length > 0) {
      const share = Math.floor(removed.ratio / remaining.length)
      remaining.forEach(r => r.ratio += share)
      const total = remaining.reduce((sum, r) => sum + r.ratio, 0)
      if (total !== 100) remaining[0].ratio += (100 - total)
    }
    set({ recipe: remaining })
  },

  updateRatio: (scentId: string, newRatio: number) => {
    const { recipe } = get()
    const clampedRatio = Math.max(1, Math.min(99, Math.round(newRatio)))
    const target = recipe.find(r => r.scentId === scentId)
    if (!target) return

    const others = recipe.filter(r => r.scentId !== scentId)
    if (others.length === 0) {
      set({ recipe: [{ scentId, ratio: 100 }] })
      return
    }

    const othersTotal = 100 - clampedRatio
    if (othersTotal <= 0) return

    const currentOthersTotal = others.reduce((sum, r) => sum + r.ratio, 0)
    const scale = currentOthersTotal > 0 ? othersTotal / currentOthersTotal : 1

    let scaledOthers = others.map(r => ({
      ...r,
      ratio: Math.max(1, Math.round(r.ratio * scale))
    }))

    let total = scaledOthers.reduce((sum, r) => sum + r.ratio, 0) + clampedRatio
    let idx = 0
    while (total !== 100 && scaledOthers.length > 0) {
      const diff = total < 100 ? 1 : -1
      scaledOthers[idx % scaledOthers.length].ratio += diff
      scaledOthers[idx % scaledOthers.length].ratio = Math.max(1, scaledOthers[idx % scaledOthers.length].ratio)
      total = scaledOthers.reduce((sum, r) => sum + r.ratio, 0) + clampedRatio
      idx++
      if (idx > 200) break
    }

    set({ recipe: [...scaledOthers, { scentId, ratio: clampedRatio }] })
  },

  adjustRatio: (scentId: string, delta: number) => {
    const { recipe, updateRatio } = get()
    const target = recipe.find(r => r.scentId === scentId)
    if (!target) return
    updateRatio(scentId, target.ratio + delta)
  },

  getTotalRatio: () => {
    return get().recipe.reduce((sum, r) => sum + r.ratio, 0)
  },

  getNormalizedRecipe: () => {
    const { recipe } = get()
    const total = recipe.reduce((sum, r) => sum + r.ratio, 0)
    if (total === 0) return []
    return recipe.map(r => ({
      ...r,
      ratio: Math.round((r.ratio / total) * 100)
    }))
  },

  getMixedColor: () => {
    const { recipe } = get()
    if (recipe.length === 0) return { r: 80, g: 80, b: 140 }

    const total = recipe.reduce((sum, r) => sum + r.ratio, 0)
    if (total === 0) return { r: 80, g: 80, b: 140 }

    let r = 0, g = 0, b = 0
    recipe.forEach(item => {
      const scent = SCENT_ELEMENTS.find(s => s.id === item.scentId)
      if (scent) {
        const rgb = hexToRgb(scent.color)
        const weight = item.ratio / total
        r += rgb.r * weight
        g += rgb.g * weight
        b += rgb.b * weight
      }
    })

    return { r: Math.round(r), g: Math.round(g), b: Math.round(b) }
  }
}))
