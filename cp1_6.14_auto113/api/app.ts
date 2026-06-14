import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import path from 'path'
import fs from 'fs'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

const DATA_PATH = path.join(__dirname, 'data.json')

function readData() {
  const raw = fs.readFileSync(DATA_PATH, 'utf-8')
  return JSON.parse(raw)
}

function writeData(data: unknown) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8')
}

app.get('/api/habits', (_req: Request, res: Response) => {
  const data = readData()
  const sorted = [...data.habits].sort((a: { order: number }, b: { order: number }) => a.order - b.order)
  res.json({ success: true, data: sorted })
})

app.post('/api/habits', (req: Request, res: Response) => {
  const data = readData()
  const newHabit = {
    id: Date.now().toString(),
    name: req.body.name || '',
    tag: req.body.tag || 'life',
    dailyGoal: req.body.dailyGoal || 1,
    completedCount: 0,
    completed: false,
    order: data.habits.length,
  }
  data.habits.push(newHabit)
  writeData(data)
  res.json({ success: true, data: newHabit })
})

app.patch('/api/habits/:id', (req: Request, res: Response) => {
  const data = readData()
  const idx = data.habits.findIndex((h: { id: string }) => h.id === req.params.id)
  if (idx === -1) {
    res.status(404).json({ success: false, error: 'Habit not found' })
    return
  }
  data.habits[idx] = { ...data.habits[idx], ...req.body }
  writeData(data)
  res.json({ success: true, data: data.habits[idx] })
})

app.delete('/api/habits/:id', (req: Request, res: Response) => {
  const data = readData()
  data.habits = data.habits.filter((h: { id: string }) => h.id !== req.params.id)
  data.habits.forEach((h: { order: number }, i: number) => { h.order = i })
  writeData(data)
  res.json({ success: true })
})

app.get('/api/stats', (_req: Request, res: Response) => {
  const data = readData()
  const habits = data.habits as Array<{ name: string; tag: string; dailyGoal: number; completedCount: number; completed: boolean }>

  const toStat = (h: { name: string; tag: string; dailyGoal: number; completedCount: number }) => ({
    name: h.name,
    tag: h.tag,
    completionRate: h.dailyGoal > 0 ? Math.min(Math.round((h.completedCount / h.dailyGoal) * 100), 100) : 0,
  })

  const weekly = habits.map(toStat)
  const monthly = habits.map(h => ({
    ...toStat(h),
    completionRate: Math.min(Math.round(toStat(h).completionRate * 0.85), 100),
  }))

  const tagMap: Record<string, string> = {
    health: 'physical',
    study: 'intelligence',
    creative: 'creativity',
    life: 'discipline',
  }

  const radar = {
    physical: 0,
    intelligence: 0,
    creativity: 0,
    social: 40,
    discipline: 0,
    emotion: 50,
  }

  habits.forEach(h => {
    const key = tagMap[h.tag]
    if (key) {
      radar[key as keyof typeof radar] = Math.min(
        Math.round((h.completedCount / Math.max(h.dailyGoal, 1)) * 100),
        100
      )
    }
  })

  res.json({ success: true, data: { weekly, monthly, radar } })
})

app.get('/api/profile', (_req: Request, res: Response) => {
  const data = readData()
  res.json({ success: true, data: data.user })
})

app.patch('/api/profile', (req: Request, res: Response) => {
  const data = readData()
  data.user = { ...data.user, ...req.body }
  const expPerLevel = 100
  const newLevel = Math.min(Math.floor(data.user.exp / expPerLevel) + 1, 5)
  data.user.level = newLevel
  writeData(data)
  res.json({ success: true, data: data.user })
})

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ success: true, message: 'ok' })
})

app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  res.status(500).json({ success: false, error: 'Server internal error' })
})

app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'API not found' })
})

export default app
