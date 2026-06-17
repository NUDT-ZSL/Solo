import { create } from 'zustand'

export type GrowthStage = 'seed' | 'sprout' | 'adult' | 'flowering' | 'fruiting'

export interface SnapshotData {
  stage: GrowthStage
  growthProgress: number
  water: number
  nutrients: number
  light: number
  particleCount: number
  timestamp: number
}

interface PlantState {
  stage: GrowthStage
  growthProgress: number
  water: number
  nutrients: number
  light: number
  snapshots: SnapshotData[]
  isPanelOpen: boolean

  setWater: (value: number) => void
  setNutrients: (value: number) => void
  setLight: (value: number) => void
  updateGrowth: (delta: number) => void
  resetPlant: () => void
  saveSnapshot: (particleCount: number) => void
  loadSnapshot: (index: number) => void
  togglePanel: () => void
  loadSavedSnapshots: () => void
}

const STAGE_THRESHOLDS: Record<GrowthStage, number> = {
  seed: 0,
  sprout: 0.2,
  adult: 0.45,
  flowering: 0.7,
  fruiting: 1.0,
}

const STAGE_ORDER: GrowthStage[] = ['seed', 'sprout', 'adult', 'flowering', 'fruiting']

const calculateGrowthRate = (water: number, nutrients: number, light: number): number => {
  const waterFactor = water / 100
  const nutrientFactor = nutrients / 100
  const lightFactor = light / 100
  return (waterFactor * 0.3 + nutrientFactor * 0.3 + lightFactor * 0.4) * 0.00002
}

export const usePlantStore = create<PlantState>((set, get) => ({
  stage: 'seed',
  growthProgress: 0,
  water: 50,
  nutrients: 30,
  light: 60,
  snapshots: [],
  isPanelOpen: true,

  setWater: (value: number) => set({ water: Math.max(0, Math.min(100, value)) }),
  setNutrients: (value: number) => set({ nutrients: Math.max(0, Math.min(100, value)) }),
  setLight: (value: number) => set({ light: Math.max(0, Math.min(100, value)) }),

  updateGrowth: (delta: number) => {
    const state = get()
    const growthRate = calculateGrowthRate(state.water, state.nutrients, state.light)
    const newProgress = state.growthProgress + growthRate * delta

    let newStage = state.stage
    for (let i = STAGE_ORDER.length - 1; i >= 0; i--) {
      if (newProgress >= STAGE_THRESHOLDS[STAGE_ORDER[i]]) {
        newStage = STAGE_ORDER[i]
        break
      }
    }

    const waterDecay = 0.0005 * delta
    const nutrientDecay = 0.0003 * delta

    set({
      growthProgress: Math.min(1, newProgress),
      stage: newStage,
      water: Math.max(0, state.water - waterDecay),
      nutrients: Math.max(0, state.nutrients - nutrientDecay),
    })
  },

  resetPlant: () => {
    set({
      stage: 'seed',
      growthProgress: 0,
      water: 50,
      nutrients: 30,
      light: 60,
    })
  },

  saveSnapshot: (particleCount: number) => {
    const state = get()
    const snapshot: SnapshotData = {
      stage: state.stage,
      growthProgress: state.growthProgress,
      water: state.water,
      nutrients: state.nutrients,
      light: state.light,
      particleCount,
      timestamp: Date.now(),
    }

    const newSnapshots = [snapshot, ...state.snapshots].slice(0, 3)
    set({ snapshots: newSnapshots })
    localStorage.setItem('plantSnapshots', JSON.stringify(newSnapshots))
  },

  loadSnapshot: (index: number) => {
    const state = get()
    const snapshot = state.snapshots[index]
    if (snapshot) {
      set({
        stage: snapshot.stage,
        growthProgress: snapshot.growthProgress,
        water: snapshot.water,
        nutrients: snapshot.nutrients,
        light: snapshot.light,
      })
    }
  },

  togglePanel: () => set({ isPanelOpen: !get().isPanelOpen }),

  loadSavedSnapshots: () => {
    try {
      const saved = localStorage.getItem('plantSnapshots')
      if (saved) {
        const snapshots = JSON.parse(saved) as SnapshotData[]
        set({ snapshots: snapshots.slice(0, 3) })
      }
    } catch (e) {
      console.error('Failed to load snapshots', e)
    }
  },
}))

export const STAGE_COLORS: Record<GrowthStage, string> = {
  seed: '#BDBDBD',
  sprout: '#A5D6A7',
  adult: '#66BB6A',
  flowering: '#F48FB1',
  fruiting: '#FFA726',
}

export const STAGE_NAMES: Record<GrowthStage, string> = {
  seed: '种子期',
  sprout: '幼苗期',
  adult: '成株期',
  flowering: '花期',
  fruiting: '结果期',
}
