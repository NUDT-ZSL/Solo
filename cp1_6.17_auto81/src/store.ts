import { create } from 'zustand'

export type BlockType = 'building' | 'green' | 'water' | null

export interface BlockData {
  type: BlockType
  height: number
  temperature: number
  key: number
}

export interface TemperatureStats {
  maxTemp: number
  minTemp: number
  avgTemp: number
  heatIslandIntensity: number
}

interface CityStore {
  grid: BlockData[][]
  currentTime: number
  selectedType: BlockType
  activePreset: string | null
  isTransitioning: boolean
  temperatureStats: TemperatureStats
  setCurrentTime: (time: number) => void
  setSelectedType: (type: BlockType) => void
  toggleBlock: (x: number, z: number) => void
  applyPreset: (name: string) => void
  calculateTemperatures: () => void
}

const GRID_SIZE = 20

const calculateSunIntensity = (hour: number): number => {
  const t = (hour - 12) / 6
  return Math.max(0, Math.exp(-t * t))
}

const calculateTemperature = (type: BlockType, hour: number): number => {
  if (type === null) return 0

  const sunIntensity = calculateSunIntensity(hour)
  const isDaytime = hour >= 6 && hour <= 18

  if (type === 'building') {
    if (isDaytime) {
      return 35 + sunIntensity * 10
    } else {
      return 20 + (1 - sunIntensity * 0.5) * 10
    }
  } else {
    if (isDaytime) {
      return 25 + sunIntensity * 5
    } else {
      return 18 + (1 - sunIntensity * 0.5) * 4
    }
  }
}

const createEmptyGrid = (): BlockData[][] => {
  let keyCounter = 0
  return Array(GRID_SIZE).fill(null).map(() =>
    Array(GRID_SIZE).fill(null).map(() => ({
      type: null as BlockType,
      height: 0,
      temperature: 0,
      key: keyCounter++
    }))
  )
}

const generatePreset = (name: string): BlockData[][] => {
  const grid = createEmptyGrid()
  let keyCounter = 0

  for (let x = 0; x < GRID_SIZE; x++) {
    for (let z = 0; z < GRID_SIZE; z++) {
      grid[x][z].key = keyCounter++
    }
  }

  if (name === 'cbd') {
    const centerX = GRID_SIZE / 2
    const centerZ = GRID_SIZE / 2
    for (let x = 0; x < GRID_SIZE; x++) {
      for (let z = 0; z < GRID_SIZE; z++) {
        const dist = Math.sqrt((x - centerX) ** 2 + (z - centerZ) ** 2)
        if (dist < 6) {
          grid[x][z] = { type: 'building', height: 3 + Math.random() * 7, temperature: 0, key: keyCounter++ }
        } else if (dist < 8 && Math.random() < 0.3) {
          grid[x][z] = { type: 'green', height: 0.3, temperature: 0, key: keyCounter++ }
        }
      }
    }
  } else if (name === 'park') {
    const centerX = GRID_SIZE / 2
    const centerZ = GRID_SIZE / 2
    for (let x = 0; x < GRID_SIZE; x++) {
      for (let z = 0; z < GRID_SIZE; z++) {
        const dist = Math.sqrt((x - centerX) ** 2 + (z - centerZ) ** 2)
        if (dist > 6 && dist < 9) {
          grid[x][z] = { type: 'building', height: 3 + Math.random() * 7, temperature: 0, key: keyCounter++ }
        } else if (dist < 5) {
          grid[x][z] = { type: 'green', height: 0.3, temperature: 0, key: keyCounter++ }
        }
      }
    }
  } else if (name === 'waterfront') {
    for (let x = 0; x < GRID_SIZE; x++) {
      for (let z = 0; z < GRID_SIZE; z++) {
        if (x < 5) {
          grid[x][z] = { type: 'water', height: 0.3, temperature: 0, key: keyCounter++ }
        } else if (x >= 5 && x < 8 && Math.random() < 0.6) {
          grid[x][z] = { type: 'green', height: 0.3, temperature: 0, key: keyCounter++ }
        } else if (x >= 8 && Math.random() < 0.5) {
          grid[x][z] = { type: 'building', height: 3 + Math.random() * 7, temperature: 0, key: keyCounter++ }
        } else if (x >= 8 && Math.random() < 0.3) {
          grid[x][z] = { type: 'green', height: 0.3, temperature: 0, key: keyCounter++ }
        }
      }
    }
  }

  return grid
}

const calculateStats = (grid: BlockData[][]): TemperatureStats => {
  const temps: number[] = []
  const centerTemps: number[] = []
  const edgeTemps: number[] = []

  for (let x = 0; x < GRID_SIZE; x++) {
    for (let z = 0; z < GRID_SIZE; z++) {
      const block = grid[x][z]
      if (block.type !== null) {
        temps.push(block.temperature)
        const isEdge = x < 3 || x >= GRID_SIZE - 3 || z < 3 || z >= GRID_SIZE - 3
        const isCenter = x >= 7 && x < 13 && z >= 7 && z < 13
        if (isCenter) centerTemps.push(block.temperature)
        if (isEdge) edgeTemps.push(block.temperature)
      }
    }
  }

  if (temps.length === 0) {
    return { maxTemp: 0, minTemp: 0, avgTemp: 0, heatIslandIntensity: 0 }
  }

  const maxTemp = Math.max(...temps)
  const minTemp = Math.min(...temps)
  const avgTemp = temps.reduce((a, b) => a + b, 0) / temps.length

  const centerAvg = centerTemps.length > 0 ? centerTemps.reduce((a, b) => a + b, 0) / centerTemps.length : 0
  const edgeAvg = edgeTemps.length > 0 ? edgeTemps.reduce((a, b) => a + b, 0) / edgeTemps.length : 0
  const heatIslandIntensity = Math.max(0, centerAvg - edgeAvg)

  return { maxTemp, minTemp, avgTemp, heatIslandIntensity }
}

export const useCityStore = create<CityStore>((set, get) => ({
  grid: createEmptyGrid(),
  currentTime: 12,
  selectedType: 'building',
  activePreset: null,
  isTransitioning: false,
  temperatureStats: { maxTemp: 0, minTemp: 0, avgTemp: 0, heatIslandIntensity: 0 },

  setCurrentTime: (time: number) => {
    set({ currentTime: time })
    get().calculateTemperatures()
  },

  setSelectedType: (type: BlockType) => {
    set({ selectedType: type })
  },

  toggleBlock: (x: number, z: number) => {
    const { grid, selectedType, currentTime } = get()
    const newGrid = grid.map(row => row.map(b => ({ ...b })))
    const current = newGrid[x][z]

    if (current.type === selectedType) {
      newGrid[x][z] = { type: null, height: 0, temperature: 0, key: current.key + 1 }
    } else if (selectedType !== null) {
      let height = 0.3
      if (selectedType === 'building') {
        height = 3 + Math.random() * 7
      }
      const temperature = calculateTemperature(selectedType, currentTime)
      newGrid[x][z] = { type: selectedType, height, temperature, key: current.key + 1 }
    }

    set({ grid: newGrid, activePreset: null })
    get().calculateTemperatures()
  },

  applyPreset: (name: string) => {
    set({ isTransitioning: true, activePreset: name })
    const newGrid = generatePreset(name)
    for (let x = 0; x < GRID_SIZE; x++) {
      for (let z = 0; z < GRID_SIZE; z++) {
        newGrid[x][z].temperature = calculateTemperature(newGrid[x][z].type, get().currentTime)
      }
    }
    setTimeout(() => {
      set({ grid: newGrid, isTransitioning: false })
      get().calculateTemperatures()
    }, 500)
  },

  calculateTemperatures: () => {
    const { grid, currentTime } = get()
    const newGrid = grid.map(row => row.map(block => {
      if (block.type === null) return { ...block }
      return { ...block, temperature: calculateTemperature(block.type, currentTime) }
    }))
    const stats = calculateStats(newGrid)
    set({ grid: newGrid, temperatureStats: stats })
  }
}))

export const getTemperatureColor = (temp: number): string => {
  const minTemp = 18
  const maxTemp = 45
  const t = Math.max(0, Math.min(1, (temp - minTemp) / (maxTemp - minTemp)))
  const r = Math.round(t * 255)
  const g = Math.round((1 - Math.abs(t - 0.5) * 2) * 100)
  const b = Math.round((1 - t) * 255)
  return `rgb(${r}, ${g}, ${b})`
}

export const GRID_SIZE_CONST = GRID_SIZE
