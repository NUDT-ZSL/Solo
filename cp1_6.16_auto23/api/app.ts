import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import { v4 as uuidv4 } from 'uuid'

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

const ALERT_POOL = [
  { message: '暴雪红色预警', level: 'red' as const },
  { message: '暴雨橙色警告', level: 'orange' as const },
  { message: '大风黄色预警', level: 'yellow' as const },
  { message: '雷电橙色预警', level: 'orange' as const },
  { message: '寒潮蓝色预警', level: 'blue' as const },
]

function generateHistory() {
  const records = []

  for (let i = 0; i < 24; i++) {
    const phase = ((i - 14) * Math.PI) / 12
    const temperature = Math.round((20 + 15 * Math.cos(phase)) * 10) / 10
    const clampedTemp = Math.max(5, Math.min(35, temperature))

    const humidity = Math.round((62.5 - 32.5 * Math.cos(phase)) * 10) / 10
    const clampedHumidity = Math.max(30, Math.min(95, humidity))

    records.push({
      hour: i,
      temperature: clampedTemp,
      humidity: clampedHumidity,
    })
  }

  return records
}

app.get('/api/weather/history', (_req: Request, res: Response) => {
  res.json(generateHistory())
})

app.get('/api/weather/alerts', (_req: Request, res: Response) => {
  const count = Math.floor(Math.random() * 3) + 1
  const shuffled = [...ALERT_POOL].sort(() => Math.random() - 0.5)
  const alerts = shuffled.slice(0, count).map((item) => ({
    id: uuidv4(),
    type: item.level,
    level: item.level,
    message: item.message,
    timestamp: Date.now(),
  }))
  res.json(alerts)
})

app.use('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({ success: true, message: 'ok' })
})

app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  res.status(500).json({ success: false, error: 'Server internal error' })
})

app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'API not found' })
})

export default app
