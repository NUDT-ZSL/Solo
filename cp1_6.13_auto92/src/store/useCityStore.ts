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

const generateBuildings = (config: PresetConfig): Building[] => {
  const buildings: Building[] = []
  const { buildingCount, heightRange, colorPalette, layout } = config

  for (let i = 0; i < buildingCount; i++) {
    let x: number, z: number
    const width = 15 + Math.random() * 20
    const depth = 15 + Math.random() * 20
    const height = heightRange[0] + Math.random() * (heightRange[1] - heightRange[0])
    const color = colorPalette[Math.floor(Math.random() * colorPalette.length)]
    const hasCrown = Math.random() > 0.4

    switch (layout) {
      case 'grid': {
        const cols = Math.ceil(Math.sqrt(buildingCount))
        const row = Math.floor(i / cols)
        const col = i % cols
        const spacing = 180 / cols
        x = -90 + col * spacing + spacing / 2 + (Math.random() - 0.5) * 10
        z = -90 + row * spacing + spacing / 2 + (Math.random() - 0.5) * 10
        break
      }
      case 'cluster': {
        const angle = (i / buildingCount) * Math.PI * 2
        const radius = 20 + Math.random() * 70
        x = Math.cos(angle) * radius + (Math.random() - 0.5) * 20
        z = Math.sin(angle) * radius + (Math.random() - 0.5) * 20
        break
      }
      case 'linear': {
        const t = i / buildingCount
        x = -80 + t * 160 + (Math.random() - 0.5) * 20
        z = (Math.random() - 0.5) * 60
        break
      }
      default: {
        x = (Math.random() - 0.5) * 160
        z = (Math.random() - 0.5) * 160
      }
    }

    buildings.push({
      id: uuidv4(),
      x,
      z,
      width,
      depth,
      height: 0,
      targetHeight: height,
      color,
      hasCrown
    })
  }

  return buildings
}

interface CityState {
  buildings: Building[]
  selectedIds: Set<string>
  currentTemplate: PresetTemplate
  isTransitioning: boolean
  selectBuilding: (id: string, additive?: boolean) => void
  selectBuildings: (ids: string[]) => void
  clearSelection: () => void
  updateBuilding: (id: string, updates: Partial<Building>) => void
  batchUpdate: (updates: Partial<Building>) => void
  setTemplate: (template: PresetTemplate) => void
  setTransitioning: (value: boolean) => void
  animateBuildings: () => void
}

export const useCityStore = create<CityState>((set, get) => ({
  buildings: generateBuildings(PRESET_CONFIGS.default),
  selectedIds: new Set(),
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
      return { selectedIds: newSelected }
    })
  },

  selectBuildings: (ids) => {
    set({ selectedIds: new Set(ids) })
  },

  clearSelection: () => {
    set({ selectedIds: new Set() })
  },

  updateBuilding: (id, updates) => {
    set((state) => ({
      buildings: state.buildings.map((b) =>
        b.id === id ? { ...b, ...updates } : b
      )
    }))
  },

  batchUpdate: (updates) => {
    const { selectedIds, buildings } = get()
    if (selectedIds.size === 0) return
    set({
      buildings: buildings.map((b) =>
        selectedIds.has(b.id) ? { ...b, ...updates } : b
      )
    })
  },

  setTemplate: (template) => {
    const config = PRESET_CONFIGS[template]
    const newBuildings = generateBuildings(config)
    set({
      buildings: newBuildings,
      selectedIds: new Set(),
      currentTemplate: template,
      isTransitioning: true
    })
  },

  setTransitioning: (value) => {
    set({ isTransitioning: value })
  },

  animateBuildings: () => {
    const { buildings } = get()
    set({
      buildings: buildings.map((b) => ({ ...b, height: b.targetHeight }))
    })
  }
}))

export { PRESET_CONFIGS }
