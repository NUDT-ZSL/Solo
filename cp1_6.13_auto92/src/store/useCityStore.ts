import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import type { Building, PresetTemplate, PresetConfig } from '../types'

const DEFAULT_PALETTE = ['#4a90d9', '#f5a623', '#7ed321', '#d0021b', '#9013fe']

const PRESET_CONFIGS: Record<PresetTemplate, PresetConfig> = {
  default: {
    name: '默认场景',
    buildingCount: 12,
    heightRange: [20, 80],
    colorPalette: DEFAULT_PALETTE,
    layout: 'random'
  },
  lowDensity: {
    name: '低密度住宅区',
    buildingCount: 15,
    heightRange: [20, 40],
    colorPalette: ['#e8d5b7', '#c9b896', '#a89070', '#8b7355', '#6b5344'],
    layout: 'grid'
  },
  commercial: {
    name: '商业中心区',
    buildingCount: 20,
    heightRange: [40, 120],
    colorPalette: ['#2c3e50', '#34495e', '#3d566e', '#4a6572', '#5a7a8a'],
    layout: 'cluster'
  },
  mixedUse: {
    name: '混合功能区',
    buildingCount: 22,
    heightRange: [25, 90],
    colorPalette: ['#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6'],
    layout: 'random'
  },
  waterfront: {
    name: '滨水开发区',
    buildingCount: 18,
    heightRange: [30, 100],
    colorPalette: ['#5dade2', '#85c1e9', '#aed6f1', '#d4e6f1', '#2980b9'],
    layout: 'linear'
  },
  futuristic: {
    name: '未来城市',
    buildingCount: 25,
    heightRange: [50, 120],
    colorPalette: ['#00d4ff', '#7b2cbf', '#c77dff', '#00ff87', '#ff6b6b'],
    layout: 'cluster'
  }
}

const TERRAIN_SIZE = 200
const TERRAIN_HALF = TERRAIN_SIZE / 2
const BUFFER = 15

const generateBuildings = (config: PresetConfig, startHidden = false): Building[] => {
  const buildings: Building[] = []
  const { buildingCount, heightRange, colorPalette, layout } = config

  for (let i = 0; i < buildingCount; i++) {
    let x: number, z: number
    const width = 10 + Math.random() * 30
    const depth = 10 + Math.random() * 30
    const targetHeight = heightRange[0] + Math.random() * (heightRange[1] - heightRange[0])
    const color = colorPalette[Math.floor(Math.random() * colorPalette.length)]
    const hasCrown = Math.random() > 0.4

    switch (layout) {
      case 'grid': {
        const cols = Math.ceil(Math.sqrt(buildingCount))
        const row = Math.floor(i / cols)
        const col = i % cols
        const cellW = (TERRAIN_SIZE - BUFFER * 2) / cols
        const cellH = (TERRAIN_SIZE - BUFFER * 2) / cols
        x = -TERRAIN_HALF + BUFFER + col * cellW + cellW / 2 + (Math.random() - 0.5) * 8
        z = -TERRAIN_HALF + BUFFER + row * cellH + cellH / 2 + (Math.random() - 0.5) * 8
        break
      }
      case 'cluster': {
        const angle = (i / buildingCount) * Math.PI * 2
        const radius = 15 + Math.random() * 70
        x = Math.cos(angle) * radius + (Math.random() - 0.5) * 15
        z = Math.sin(angle) * radius + (Math.random() - 0.5) * 15
        x = Math.max(-TERRAIN_HALF + BUFFER, Math.min(TERRAIN_HALF - BUFFER, x))
        z = Math.max(-TERRAIN_HALF + BUFFER, Math.min(TERRAIN_HALF - BUFFER, z))
        break
      }
      case 'linear': {
        const t = i / buildingCount
        x = -TERRAIN_HALF + BUFFER + t * (TERRAIN_SIZE - BUFFER * 2) + (Math.random() - 0.5) * 10
        z = (Math.random() - 0.5) * 80
        z = Math.max(-TERRAIN_HALF + BUFFER, Math.min(TERRAIN_HALF - BUFFER, z))
        break
      }
      default: {
        x = (Math.random() - 0.5) * (TERRAIN_SIZE - BUFFER * 2)
        z = (Math.random() - 0.5) * (TERRAIN_SIZE - BUFFER * 2)
      }
    }

    buildings.push({
      id: uuidv4(),
      x,
      z,
      width,
      depth,
      height: startHidden ? 0 : targetHeight,
      targetHeight,
      color,
      hasCrown
    })
  }

  return buildings
}

interface CityState {
  buildings: Building[]
  selectedIds: Set<string>
  selectedCount: number
  currentTemplate: PresetTemplate
  isTransitioning: boolean
  selectBuilding: (id: string, additive?: boolean) => void
  selectBuildings: (ids: string[]) => void
  clearSelection: () => void
  updateBuilding: (id: string, updates: Partial<Building>) => void
  batchUpdateHeight: (height: number) => void
  batchUpdateColor: (color: string) => void
  setTemplate: (template: PresetTemplate) => void
}

export const useCityStore = create<CityState>((set, get) => ({
  buildings: generateBuildings(PRESET_CONFIGS.default, true),
  selectedIds: new Set(),
  selectedCount: 0,
  currentTemplate: 'default',
  isTransitioning: false,

  selectBuilding: (id, additive = false) => {
    set((state) => {
      const newSelected = new Set(additive ? state.selectedIds : new Set())
      if (newSelected.has(id)) {
        newSelected.delete(id)
      } else {
        if (!additive) newSelected.clear()
        newSelected.add(id)
      }
      return { selectedIds: newSelected, selectedCount: newSelected.size }
    })
  },

  selectBuildings: (ids) => {
    const newSet = new Set(ids)
    set({ selectedIds: newSet, selectedCount: newSet.size })
  },

  clearSelection: () => {
    set({ selectedIds: new Set(), selectedCount: 0 })
  },

  updateBuilding: (id, updates) => {
    set((state) => ({
      buildings: state.buildings.map((b) =>
        b.id === id ? { ...b, ...updates, targetHeight: updates.height ?? b.targetHeight } : b
      )
    }))
  },

  batchUpdateHeight: (height) => {
    const { selectedIds, buildings } = get()
    if (selectedIds.size === 0) return
    set({
      buildings: buildings.map((b) =>
        selectedIds.has(b.id) ? { ...b, height, targetHeight: height } : b
      )
    })
  },

  batchUpdateColor: (color) => {
    const { selectedIds, buildings } = get()
    if (selectedIds.size === 0) return
    set({
      buildings: buildings.map((b) =>
        selectedIds.has(b.id) ? { ...b, color } : b
      )
    })
  },

  setTemplate: (template) => {
    const config = PRESET_CONFIGS[template]
    const newBuildings = generateBuildings(config, true)
    set({
      buildings: newBuildings,
      selectedIds: new Set(),
      selectedCount: 0,
      currentTemplate: template,
      isTransitioning: true
    })

    requestAnimationFrame(() => {
      set((state) => ({
        buildings: state.buildings.map((b) => ({ ...b, height: b.targetHeight }))
      }))
      setTimeout(() => {
        set({ isTransitioning: false })
      }, 1000)
    })
  }
}))

export { PRESET_CONFIGS }
