import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { v4 as uuidv4 } from 'uuid'
import type { Plant, User, CareLog } from '../src/types'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = 3001
const DATA_FILE = path.join(__dirname, 'data.json')

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

interface DataStore {
  users: User[]
  plants: Plant[]
  careLogs: CareLog[]
}

function readData(): DataStore {
  const raw = fs.readFileSync(DATA_FILE, 'utf-8')
  return JSON.parse(raw)
}

function writeData(data: DataStore) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8')
}

const CURRENT_USER_ID = 'user-001'

app.get('/api/plants', (req, res) => {
  const data = readData()
  res.json(data.plants)
})

app.get('/api/plants/:id', (req, res) => {
  const data = readData()
  const plant = data.plants.find((p) => p.id === req.params.id)
  if (!plant) {
    res.status(404).json({ error: 'Plant not found' })
    return
  }
  res.json(plant)
})

app.post('/api/adopt', (req, res) => {
  const { plantId, userId } = req.body
  const data = readData()

  const plant = data.plants.find((p) => p.id === plantId)
  const user = data.users.find((u) => u.id === userId)

  if (!plant || !user) {
    res.status(404).json({ error: 'Plant or user not found' })
    return
  }

  if (plant.status !== 'available') {
    res.status(400).json({ error: 'Plant is not available for adoption' })
    return
  }

  plant.status = 'adopted'
  plant.adoptedBy = userId
  user.adoptedPlants.push(plantId)
  user.points += 20

  writeData(data)
  res.json(plant)
})

app.get('/api/user/current', (req, res) => {
  const data = readData()
  const user = data.users.find((u) => u.id === CURRENT_USER_ID)
  if (!user) {
    res.status(404).json({ error: 'User not found' })
    return
  }
  res.json(user)
})

app.get('/api/user/:id/plants', (req, res) => {
  const data = readData()
  const userPlants = data.plants.filter((p) => p.adoptedBy === req.params.id)
  res.json(userPlants)
})

app.get('/api/logs', (req, res) => {
  const { plantId } = req.query
  const data = readData()
  let logs = data.careLogs
  if (plantId) {
    logs = logs.filter((l) => l.plantId === plantId)
  }
  logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  res.json(logs)
})

app.post('/api/log', (req, res) => {
  const { plantId, userId, content, healthScore } = req.body
  const data = readData()

  const plant = data.plants.find((p) => p.id === plantId)
  const user = data.users.find((u) => u.id === userId)

  if (!plant || !user) {
    res.status(404).json({ error: 'Plant or user not found' })
    return
  }

  const today = new Date().toISOString().split('T')[0]
  const userPlantLogs = data.careLogs.filter(
    (l) => l.plantId === plantId && l.userId === userId
  )

  const lastLog = userPlantLogs
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]

  let pointsEarned = 10
  let consecutiveDays = 0

  if (lastLog) {
    const lastDate = new Date(lastLog.date.split('T')[0])
    const todayDate = new Date(today)
    const diffDays = Math.floor(
      (todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
    )

    if (diffDays > 7) {
      pointsEarned -= 5
    }
  }

  user.points += pointsEarned
  if (plant.status === 'adopted') {
    plant.status = 'caring'
  }

  const newLog: CareLog = {
    id: uuidv4(),
    plantId,
    userId,
    date: new Date().toISOString(),
    content,
    healthScore: Number(healthScore),
    photoUrl: undefined,
  }

  data.careLogs.push(newLog)
  writeData(data)

  res.json({ log: newLog, user })
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
