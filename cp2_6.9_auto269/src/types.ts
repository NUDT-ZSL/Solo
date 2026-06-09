export type PlantType = '绿萝' | '多肉' | '龟背竹'
export type WeatherType = '晴' | '多云' | '阴' | '雨'
export type StageType = 'seed' | 'sprout' | 'growing' | 'mature'

export interface Plant {
  id: string
  name: string
  type: PlantType
  stage: StageType
  growthDays: number
  stemHeight: number
  leafCount: number
  totalWater: number
  totalLight: number
  hasFlower: boolean
  createdAt: string
}

export interface LogEntry {
  id: string
  plantId: string
  date: string
  water: number
  light: number
  weather: WeatherType
  description: string
  stemHeight: number
  leafCount: number
  stage: StageType
}

export interface DailySnapshot {
  plantId: string
  date: string
  stemHeight: number
  leafCount: number
  water: number
  light: number
  stage: StageType
}
