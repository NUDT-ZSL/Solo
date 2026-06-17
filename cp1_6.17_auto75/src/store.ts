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
  errorMessage: string | null
}

interface PlantActions {
  setWater: (value: number) => void
  setNutrient: (value: number) => void
  setLight: (value: number) => void
  updateGrowth: (deltaTime: number) => void
  setParticleCount: (count: number) => void
  resetPlant: () => void
  saveSnapshot: (index: number) => boolean
  loadSnapshot: (index: number) => { success: boolean; message?: string }
  getSnapshots: () => Array<{ index: number; exists: boolean; stage: string }>
  getErrorMessage: () => string | null
  clearErrorMessage: () => void
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

const validateSnapshotData = (data: unknown): { valid: boolean; message?: string } => {
  if (typeof data !== 'object' || data === null) {
    return { valid: false, message: '快照数据格式错误' }
  }

  const snapshot = data as Record<string, unknown>
  const requiredFields = ['water', 'nutrient', 'light', 'growthProgress', 'currentStage', 'fruitSize', 'particleCount']
  const missingFields = requiredFields.filter(field => !(field in snapshot))

  if (missingFields.length > 0) {
    return { valid: false, message: `快照数据缺失字段: ${missingFields.join(', ')}` }
  }

  if (typeof snapshot.water !== 'number' || snapshot.water < 0 || snapshot.water > 100) {
    return { valid: false, message: '水分值无效' }
  }
  if (typeof snapshot.nutrient !== 'number' || snapshot.nutrient < 0 || snapshot.nutrient > 100) {
    return { valid: false, message: '养分值无效' }
  }
  if (typeof snapshot.light !== 'number' || snapshot.light < 0 || snapshot.light > 100) {
    return { valid: false, message: '光照值无效' }
  }
  if (typeof snapshot.growthProgress !== 'number' || snapshot.growthProgress < 0 || snapshot.growthProgress > 100) {
    return { valid: false, message: '生长进度值无效' }
  }
  if (!GROWTH_STAGES.includes(snapshot.currentStage as GrowthStage)) {
    return { valid: false, message: '生长阶段无效' }
  }
  if (typeof snapshot.fruitSize !== 'number' || snapshot.fruitSize < 0 || snapshot.fruitSize > 1) {
    return { valid: false, message: '果实大小值无效' }
  }
  if (typeof snapshot.particleCount !== 'number' || snapshot.particleCount < 0) {
    return { valid: false, message: '粒子数量值无效' }
  }

  return { valid: true }
}

export const usePlantStore = create<PlantState & PlantActions>((set, get) => ({
  ...INITIAL_STATE,
  errorMessage: null,

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

  resetPlant: () => set({
    ...INITIAL_STATE,
    errorMessage: null
  }),

  saveSnapshot: (index: number): boolean => {
    try {
      if (index < 0 || index > 2) {
        set({ errorMessage: '无效的快照索引' })
        return false
      }

      const state = get()
      const rawData = localStorage.getItem(SNAPSHOT_KEY)
      const snapshots = rawData ? JSON.parse(rawData) : {}

      const snapshotData = {
        water: state.water,
        nutrient: state.nutrient,
        light: state.light,
        growthProgress: state.growthProgress,
        currentStage: state.currentStage,
        fruitSize: state.fruitSize,
        particleCount: state.particleCount,
        timestamp: Date.now()
      }

      const validation = validateSnapshotData(snapshotData)
      if (!validation.valid) {
        set({ errorMessage: validation.message })
        return false
      }

      snapshots[index] = snapshotData
      localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshots))
      set({ errorMessage: null })
      return true
    } catch (e) {
      set({ errorMessage: '保存快照失败: ' + (e instanceof Error ? e.message : '未知错误') })
      return false
    }
  },

  loadSnapshot: (index: number): { success: boolean; message?: string } => {
    try {
      if (index < 0 || index > 2) {
        const message = '无效的快照索引'
        set({ errorMessage: message })
        return { success: false, message }
      }

      const rawData = localStorage.getItem(SNAPSHOT_KEY)
      if (!rawData) {
        const message = '没有找到快照数据'
        set({ errorMessage: message })
        return { success: false, message }
      }

      const snapshots = JSON.parse(rawData)
      const snapshot = snapshots[index]
      if (!snapshot) {
        const message = `快照 ${index + 1} 为空`
        set({ errorMessage: message })
        return { success: false, message }
      }

      const validation = validateSnapshotData(snapshot)
      if (!validation.valid) {
        const message = `快照数据损坏: ${validation.message}`
        set({ errorMessage: message })
        return { success: false, message }
      }

      set({
        water: snapshot.water,
        nutrient: snapshot.nutrient,
        light: snapshot.light,
        growthProgress: snapshot.growthProgress,
        currentStage: snapshot.currentStage,
        fruitSize: snapshot.fruitSize,
        particleCount: snapshot.particleCount,
        errorMessage: null
      })

      return { success: true }
    } catch (e) {
      const message = '加载快照失败: ' + (e instanceof Error ? e.message : '未知错误')
      set({ errorMessage: message })
      return { success: false, message }
    }
  },

  getSnapshots: () => {
    try {
      const rawData = localStorage.getItem(SNAPSHOT_KEY)
      const snapshots = rawData ? JSON.parse(rawData) : {}

      return [0, 1, 2].map(index => {
        const snapshot = snapshots[index]
        if (snapshot) {
          const validation = validateSnapshotData(snapshot)
          if (validation.valid) {
            return {
              index,
              exists: true,
              stage: STAGE_NAMES[snapshot.currentStage as GrowthStage]
            }
          }
        }
        return {
          index,
          exists: false,
          stage: '空'
        }
      })
    } catch (e) {
      return [0, 1, 2].map(index => ({
        index,
        exists: false,
        stage: '空'
      }))
    }
  },

  getErrorMessage: () => get().errorMessage as string | null,

  clearErrorMessage: () => set({ errorMessage: null })
}))
