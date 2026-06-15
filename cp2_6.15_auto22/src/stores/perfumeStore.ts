import { create } from 'zustand'

export interface Aroma {
  id: number
  name: string
  category: string
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

interface PerfumeState {
  aromas: Aroma[]
  selectedAromas: SelectedAroma[]
  mixResult: MixResult | null
  showModal: boolean
  setAromas: (aromas: Aroma[]) => void
  addAroma: (aroma: Aroma) => void
  removeAroma: (aromaId: number) => void
  updateRatio: (aromaId: number, ratio: number) => void
  mix: () => void
  closeModal: () => void
  reset: () => void
}

const namePrefixes: Record<string, string[]> = {
  floral: ['晨曦', '月下', '春风', '芳华'],
  woody: ['暮色', '深林', '古韵', '沉香'],
  fruity: ['阳光', '果园', '甘露', '金辉'],
  fresh: ['清泉', '晨露', '碧波', '微风'],
  spicy: ['烈焰', '丝路', '琥珀', '暖阳'],
  herbal: ['绿野', '幽谷', '禅意', '青岚'],
}

const nameSuffixes: Record<string, string[]> = {
  floral: ['花语', '绮梦', '芳踪'],
  woody: ['木语', '禅心', '古意'],
  fruity: ['果韵', '甜香', '蜜意'],
  fresh: ['清韵', '澄净', '沁心'],
  spicy: ['辛香', '暖意', '浓情'],
  herbal: ['草香', '幽径', '自然'],
}

function generateName(selectedAromas: SelectedAroma[]): string {
  if (selectedAromas.length === 0) return '无名之香'
  const dominant = [...selectedAromas].sort((a, b) => b.ratio - a.ratio)[0]
  const category = dominant.aroma.category
  const prefixes = namePrefixes[category] || namePrefixes.floral
  const suffixes = nameSuffixes[category] || nameSuffixes.floral
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)]
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)]
  const mainName = selectedAromas.slice(0, 2).map((s) => s.aroma.name).join('')
  return `${prefix}${mainName}${suffix}`
}

function mixColors(selectedAromas: SelectedAroma[]): [number, number, number] {
  if (selectedAromas.length === 0) return [255, 255, 255]
  const totalRatio = selectedAromas.reduce((sum, s) => sum + s.ratio, 0)
  let r = 0, g = 0, b = 0
  for (const s of selectedAromas) {
    const rgb = JSON.parse(s.aroma.rgb) as [number, number, number]
    const weight = s.ratio / totalRatio
    r += rgb[0] * weight
    g += rgb[1] * weight
    b += rgb[2] * weight
  }
  return [Math.round(r), Math.round(g), Math.round(b)]
}

function rgbToHex(rgb: [number, number, number]): string {
  return '#' + rgb.map((c) => Math.min(255, Math.max(0, c)).toString(16).padStart(2, '0')).join('')
}

export const usePerfumeStore = create<PerfumeState>((set, get) => ({
  aromas: [],
  selectedAromas: [],
  mixResult: null,
  showModal: false,

  setAromas: (aromas) => set({ aromas }),

  addAroma: (aroma) => {
    const { selectedAromas } = get()
    if (selectedAromas.some((s) => s.aroma.id === aroma.id)) return
    const equalRatio = selectedAromas.length === 0 ? 1 : 1 / (selectedAromas.length + 1)
    const newAromas = [
      ...selectedAromas.map((s) => ({ ...s, ratio: equalRatio })),
      { aroma, ratio: equalRatio },
    ]
    set({ selectedAromas: newAromas, mixResult: null })
  },

  removeAroma: (aromaId) => {
    const { selectedAromas } = get()
    const filtered = selectedAromas.filter((s) => s.aroma.id !== aromaId)
    if (filtered.length > 0) {
      const total = filtered.reduce((sum, s) => sum + s.ratio, 0)
      const normalized = filtered.map((s) => ({ ...s, ratio: s.ratio / total }))
      set({ selectedAromas: normalized, mixResult: null })
    } else {
      set({ selectedAromas: [], mixResult: null })
    }
  },

  updateRatio: (aromaId, ratio) => {
    const { selectedAromas } = get()
    const idx = selectedAromas.findIndex((s) => s.aroma.id === aromaId)
    if (idx === -1) return
    const updated = [...selectedAromas]
    updated[idx] = { ...updated[idx], ratio }
    const total = updated.reduce((sum, s) => sum + s.ratio, 0)
    const normalized = updated.map((s) => ({ ...s, ratio: s.ratio / total }))
    set({ selectedAromas: normalized, mixResult: null })
  },

  mix: () => {
    const { selectedAromas } = get()
    if (selectedAromas.length === 0) return
    const rgb = mixColors(selectedAromas)
    const name = generateName(selectedAromas)
    set({
      mixResult: { color: rgbToHex(rgb), rgb, name },
      showModal: true,
    })
  },

  closeModal: () => set({ showModal: false }),

  reset: () => set({ selectedAromas: [], mixResult: null, showModal: false }),
}))
