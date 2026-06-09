import express from 'express'
import cors from 'cors'
import { v4 as uuidv4 } from 'uuid'

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

type PlantType = '绿萝' | '多肉' | '龟背竹'
type WeatherType = '晴' | '多云' | '阴' | '雨'
type StageType = 'seed' | 'sprout' | 'growing' | 'mature'

interface Plant {
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

interface LogEntry {
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

interface DailySnapshot {
  plantId: string
  date: string
  stemHeight: number
  leafCount: number
  water: number
  light: number
  stage: StageType
}

const plants: Record<string, Plant> = {}
const logs: Record<string, LogEntry[]> = {}
const snapshots: Record<string, DailySnapshot[]> = {}

function getStage(days: number): StageType {
  if (days <= 3) return 'seed'
  if (days <= 7) return 'sprout'
  if (days <= 20) return 'growing'
  return 'mature'
}

function getStemHeight(days: number, stage: StageType): number {
  switch (stage) {
    case 'seed': return 0
    case 'sprout': return Math.min(3, days * 0.5)
    case 'growing': return Math.min(15, 3 + (days - 7) * 0.92)
    case 'mature': return Math.min(30, 15 + (days - 20) * 1.5)
  }
}

function getLeafCount(stage: StageType): number {
  switch (stage) {
    case 'seed': return 0
    case 'sprout': return 2
    case 'growing': return 6
    case 'mature': return 12
  }
}

app.post('/api/plant/init', (req, res) => {
  const { name, type } = req.body as { name: string; type: PlantType }
  if (!name || !type) {
    return res.status(400).json({ error: '植物名称和种类不能为空' })
  }
  const id = uuidv4()
  const now = new Date().toISOString()
  const plant: Plant = {
    id,
    name,
    type,
    stage: 'seed',
    growthDays: 1,
    stemHeight: 0,
    leafCount: 0,
    totalWater: 0,
    totalLight: 0,
    hasFlower: false,
    createdAt: now
  }
  plants[id] = plant
  logs[id] = []
  snapshots[id] = []
  res.json(plant)
})

app.post('/api/plant/log', (req, res) => {
  const { plantId, water, light, weather, description } = req.body as {
    plantId: string; water: number; light: number; weather: WeatherType; description: string
  }
  const plant = plants[plantId]
  if (!plant) {
    return res.status(404).json({ error: '植物不存在' })
  }

  plant.growthDays += 1
  plant.stage = getStage(plant.growthDays)
  plant.stemHeight = getStemHeight(plant.growthDays, plant.stage)
  plant.leafCount = getLeafCount(plant.stage)
  plant.totalWater += water
  plant.totalLight += light
  if (plant.stage === 'mature') {
    plant.hasFlower = Math.random() > 0.3
  }

  const date = new Date().toISOString()
  const logEntry: LogEntry = {
    id: uuidv4(),
    plantId,
    date,
    water,
    light,
    weather,
    description,
    stemHeight: plant.stemHeight,
    leafCount: plant.leafCount,
    stage: plant.stage
  }
  logs[plantId].push(logEntry)

  const snapshot: DailySnapshot = {
    plantId,
    date,
    stemHeight: plant.stemHeight,
    leafCount: plant.leafCount,
    water,
    light,
    stage: plant.stage
  }
  snapshots[plantId].push(snapshot)

  res.json({ plant, log: logEntry })
})

app.get('/api/plant/:id', (req, res) => {
  const plant = plants[req.params.id]
  if (!plant) {
    return res.status(404).json({ error: '植物不存在' })
  }
  res.json(plant)
})

app.get('/api/plant/:id/data', (req, res) => {
  const id = req.params.id
  if (!plants[id]) {
    return res.status(404).json({ error: '植物不存在' })
  }
  res.json({
    logs: logs[id] || [],
    snapshots: snapshots[id] || []
  })
})

app.listen(PORT, () => {
  console.log(`叶脉书服务端运行在 http://localhost:${PORT}`)
})
书服务端运行在 http://localhost:${PORT}`)
})
