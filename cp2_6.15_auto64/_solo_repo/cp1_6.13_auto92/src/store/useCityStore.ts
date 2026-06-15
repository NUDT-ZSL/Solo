import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import type { Building, PresetTemplate, PresetConfig } from '../types'

const DEFAULT_PALETTE = ['#4a90d9', '#f5a623', '#7ed321', '#d0021b', '#9013fe']

const PRESET_CONFIGS: Record<Exclude<PresetTemplate, 'default'>, PresetConfig> & { default: PresetConfig } = {
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
const MIN_MARGIN = 8

const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val))

const generateBuildings = (config: PresetConfig, startHidden: boolean): Building[] => {
  const buildings: Building[] = []
  const { buildingCount, heightRange, colorPalette, layout } = config

  for (let i = 0; i < buildingCount; i++) {
    const width = 10 + Math.random() * 30
    const depth = 10 + Math.random() * 30
    const targetHeight = heightRange[0] + Math.random() * (heightRange[1] - heightRange[0])
    const color = colorPalette[Math.floor(Math.random() * colorPalette.length)]
    const hasCrown = Math.random() > 0.4

    const halfW = width / 2 + MIN_MARGIN
    const halfD = depth / 2 + MIN_MARGIN
    const minX = -TERRAIN_HALF + halfW
    const maxX = TERRAIN_HALF - halfW
    const minZ = -TERRAIN_HALF + halfD
    const maxZ = TERRAIN_HALF - halfD

    let x: number, z: number

    switch (layout) {
      case 'grid': {
        const cols = Math.ceil(Math.sqrt(buildingCount))
        const rows = Math.ceil(buildingCount / cols)
        const row = Math.floor(i / cols)
        const col = i % cols
        const cellW = (maxX - minX) / cols
        const cellD = (maxZ - minZ) / rows
        const baseX = minX + col * cellW + cellW / 2
        const baseZ = minZ + row * cellD + cellD / 2
        x = baseX + (Math.random() - 0.5) * cellW * 0.3
        z = baseZ + (Math.random() - 0.5) * cellD * 0.3
        break
      }
      case 'cluster': {
        const angle = (i / buildingCount) * Math.PI * 2 + Math.random() * 0.3
        const maxRadius = Math.min(maxX - minX, maxZ - minZ) / 2.5
        const radius = maxRadius * (0.25 + Math.random() * 0.75)
        x = Math.cos(angle) * radius
        z = Math.sin(angle) * radius
        break
      }
      case 'linear': {
        const t = i / Math.max(buildingCount - 1, 1)
        x = minX + t * (maxX - minX)
        const centerZ = (minZ + maxZ) / 2
        const spread = (maxZ - minZ) * 0.35
        z = centerZ + (Math.random() - 0.5) * spread * 2
        break
      }
      default: {
        x = minX + Math.random() * (maxX - minX)
        z = minZ + Math.random() * (maxZ - minZ)
      }
    }

    x = clamp(x, minX, maxX)
    z = clamp(z, minZ, maxZ)

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
  temporarySelectedIds: Set<string>
  selectedCount: number
  currentTemplate: PresetTemplate
  isTransitioning: boolean
  selectBuilding: (id: string, additive?: boolean) => void
  selectBuildings: (ids: string[]) => void
  setTemporarySelected: (ids: string[]) => void
  clearTemporarySelected: () => void
  clearSelection: () => void
  updateBuilding: (id: string, updates: Partial<Building>) => void
  batchUpdateHeight: (height: number) => void
  batchUpdateColor: (color: string) => void
  setTemplate: (template: PresetTemplate) => void
}

export const useCityStore = create<CityState>((set, get) => ({
  buildings: generateBuildings(PRESET_CONFIGS.default, true),
  selectedIds: new Set(),
  temporarySelectedIds: new Set(),
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
      return {
        selectedIds: newSelected,
        temporarySelectedIds: new Set(),
        selectedCount: newSelected.size
      }
    })
  },

  selectBuildings: (ids) => {
    const newSet = new Set(ids)
    set({
      selectedIds: newSet,
      temporarySelectedIds: new Set(),
      selectedCount: newSet.size
    })
  },

  setTemporarySelected: (ids) => {
    set({ temporarySelectedIds: new Set(ids) })
  },

  clearTemporarySelected: () => {
    set({ temporarySelectedIds: new Set() })
  },

  clearSelection: () => {
    set({
      selectedIds: new Set(),
      temporarySelectedIds: new Set(),
      selectedCount: 0
    })
  },

  updateBuilding: (id, updates) => {
    set((state) => ({
      buildings: state.buildings.map((b) => {
        if (b.id !== id) return b
        const newHeight = updates.height ?? b.height
        return {
          ...b,
          ...updates,
          height: newHeight,
          targetHeight: updates.height !== undefined ? newHeight : b.targetHeight
        }
      })
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
      temporarySelectedIds: new Set(),
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
