import { create } from 'zustand'

export type GrowthStage = 'seed' | 'sprout' | 'mature' | 'flowering' | 'fruiting'

export const STAGE_NAMES: Record<GrowthStage, string> = {
  seed: '种子期',
  sprout: '幼苗期',
  mature: '成株期',
  flowering: '花期',
  fruiting: '结果期'
}

export const STAGE_COLORS: Record<GrowthStage, string> = {
  seed: '#BDBDBD',
  sprout: '#A5D6A7',
  mature: '#66BB6A',
  flowering: '#F48FB1',
  fruiting: '#FFA726'
}

export const STAGE_THRESHOLDS: Record<GrowthStage, number> = {
  seed: 0,
  sprout: 20,
  mature: 45,
  flowering: 70,
  fruiting: 90
}

export const GROWTH_STAGES: GrowthStage[] = ['seed', 'sprout', 'mature', 'flowering', 'fruiting']

interface PlantState {
  water: number
  nutrient: number
  light: number
  growthProgress: number
  currentStage: GrowthStage
  fruitSize: number
  particleCount: number
  isPaused: boolean
}

interface PlantActions {
  setWater: (value: number) => void
  setNutrient: (value: number) => void
  setLight: (value: number) => void
  updateGrowth: (deltaTime: number) => void
  setParticleCount: (count: number) => void
  resetPlant: () => void
  saveSnapshot: (index: number) => void
  loadSnapshot: (index: number) => boolean
  getSnapshots: () => Array<{ index: number; exists: boolean; stage: string }>
}

const getStageFromProgress = (progress: number): GrowthStage => {
  if (progress >= STAGE_THRESHOLDS.fruiting) return 'fruiting'
  if (progress >= STAGE_THRESHOLDS.flowering) return 'flowering'
  if (progress >= STAGE_THRESHOLDS.mature) return 'mature'
  if (progress >= STAGE_THRESHOLDS.sprout) return 'sprout'
  return 'seed'
}

const INITIAL_STATE: PlantState = {
  water: 50,
  nutrient: 30,
  light: 60,
  growthProgress: 0,
  currentStage: 'seed',
  fruitSize: 0,
  particleCount: 0,
  isPaused: false
}

const SNAPSHOT_KEY = 'particle_plant_snapshots'

export const usePlantStore = create<PlantState & PlantActions>((set, get) => ({
  ...INITIAL_STATE,

  setWater: (value: number) => set({ water: Math.max(0, Math.min(100, value)) }),
  setNutrient: (value: number) => set({ nutrient: Math.max(0, Math.min(100, value)) }),
  setLight: (value: number) => set({ light: Math.max(0, Math.min(100, value)) }),

  updateGrowth: (deltaTime: number) => {
    const state = get()
    if (state.isPaused || state.growthProgress >= 100) return

    const waterFactor = state.water / 100
    const nutrientFactor = state.nutrient / 100
    const lightFactor = state.light / 100

    const growthRate = (waterFactor * 0.3 + nutrientFactor * 0.35 + lightFactor * 0.35) * 0.5
    const newProgress = Math.min(100, state.growthProgress + growthRate * deltaTime)
    const newStage = getStageFromProgress(newProgress)

    let newFruitSize = state.fruitSize
    if (newStage === 'fruiting') {
      const fruitGrowthRate = (waterFactor * 0.3 + nutrientFactor * 0.4 + lightFactor * 0.3) * 0.1
      newFruitSize = Math.min(1, state.fruitSize + fruitGrowthRate * deltaTime)
    }

    set({
      growthProgress: newProgress,
      currentStage: newStage,
      fruitSize: newFruitSize
    })
  },

  setParticleCount: (count: number) => set({ particleCount: count }),

  resetPlant: () => set({ ...INITIAL_STATE }),

  saveSnapshot: (index: number) => {
    const state = get()
    const snapshots = JSON.parse(localStorage.getItem(SNAPSHOT_KEY) || '{}')
    snapshots[index] = {
      water: state.water,
      nutrient: state.nutrient,
      light: state.light,
      growthProgress: state.growthProgress,
      currentStage: state.currentStage,
      fruitSize: state.fruitSize,
      particleCount: state.particleCount,
      timestamp: Date.now()
    }
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshots))
  },

  loadSnapshot: (index: number): boolean => {
    const snapshots = JSON.parse(localStorage.getItem(SNAPSHOT_KEY) || '{}')
    const snapshot = snapshots[index]
    if (!snapshot) return false

    set({
      water: snapshot.water,
      nutrient: snapshot.nutrient,
      light: snapshot.light,
      growthProgress: snapshot.growthProgress,
      currentStage: snapshot.currentStage,
      fruitSize: snapshot.fruitSize,
      particleCount: snapshot.particleCount
    })
    return true
  },

  getSnapshots: () => {
    const snapshots = JSON.parse(localStorage.getItem(SNAPSHOT_KEY) || '{}')
    return [0, 1, 2].map(index => ({
      index,
      exists: !!snapshots[index],
      stage: snapshots[index] ? STAGE_NAMES[snapshots[index].currentStage as GrowthStage] : '空'
    }))
  }
}))
