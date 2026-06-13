import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import Datastore from 'nedb-promises'
import { v4 as uuidv4 } from 'uuid'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

const dbPath = path.join(__dirname, 'data')
const tracksDb = Datastore.create({ filename: path.join(dbPath, 'tracks.db'), autoload: true })
const messagesDb = Datastore.create({ filename: path.join(dbPath, 'messages.db'), autoload: true })

function generateWaveform(length: number): number[] {
  const data: number[] = []
  for (let i = 0; i < length; i++) {
    data.push(Math.random() * 0.6 + 0.1)
  }
  return data
}

async function seedData() {
  const count = await tracksDb.count({})
  if (count > 0) return

  const tracks = [
    { _id: uuidv4(), name: '鼓组', instrument: 'drums', member: '小明', color: '#ff6b6b', muted: false, solo: false, volume: 80, pan: 0, order: 0, waveformData: generateWaveform(200), duration: 120 },
    { _id: uuidv4(), name: '贝斯', instrument: 'bass', member: '小红', color: '#4ecdc4', muted: false, solo: false, volume: 75, pan: -20, order: 1, waveformData: generateWaveform(200), duration: 120 },
    { _id: uuidv4(), name: '吉他', instrument: 'guitar', member: '阿杰', color: '#ffd93d', muted: false, solo: false, volume: 70, pan: 30, order: 2, waveformData: generateWaveform(200), duration: 120 },
    { _id: uuidv4(), name: '键盘', instrument: 'keyboard', member: '小美', color: '#a78bfa', muted: false, solo: false, volume: 65, pan: 10, order: 3, waveformData: generateWaveform(200), duration: 120 },
  ]
  await tracksDb.insert(tracks)

  const messages = [
    { _id: uuidv4(), type: 'text', content: '大家先从副歌部分开始练吧！', sender: '小明', timestamp: Date.now() - 300000 },
    { _id: uuidv4(), type: 'text', content: '好的，我调一下贝斯音量', sender: '小红', timestamp: Date.now() - 240000 },
    { _id: uuidv4(), type: 'voice', content: '', sender: '阿杰', timestamp: Date.now() - 180000, duration: 8, waveformData: generateWaveform(60) },
  ]
  await messagesDb.insert(messages)
}

seedData().catch(console.error)

app.get('/api/tracks', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const tracks = await tracksDb.find({}).sort({ order: 1 })
    res.json(tracks)
  } catch (e) {
    next(e)
  }
})

app.post('/api/tracks', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const track = { _id: uuidv4(), ...req.body }
    await tracksDb.insert(track)
    res.status(201).json(track)
  } catch (e) {
    next(e)
  }
})

app.put('/api/tracks/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const update = req.body
    delete update._id
    const num = await tracksDb.update({ _id: id }, { $set: update })
    if (num === 0) {
      res.status(404).json({ error: 'Track not found' })
      return
    }
    const updated = await tracksDb.findOne({ _id: id })
    res.json(updated)
  } catch (e) {
    next(e)
  }
})

app.delete('/api/tracks/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const num = await tracksDb.remove({ _id: id }, {})
    if (num === 0) {
      res.status(404).json({ error: 'Track not found' })
      return
    }
    res.status(204).send()
  } catch (e) {
    next(e)
  }
})

app.put('/api/tracks/reorder', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orders } = req.body as { orders: { id: string; order: number }[] }
    for (const item of orders) {
      await tracksDb.update({ _id: item.id }, { $set: { order: item.order } })
    }
    const tracks = await tracksDb.find({}).sort({ order: 1 })
    res.json(tracks)
  } catch (e) {
    next(e)
  }
})

app.get('/api/messages', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const messages = await messagesDb.find({}).sort({ timestamp: 1 })
    res.json(messages)
  } catch (e) {
    next(e)
  }
})

app.post('/api/messages', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const message = { _id: uuidv4(), ...req.body, timestamp: req.body.timestamp || Date.now() }
    await messagesDb.insert(message)
    res.status(201).json(message)
  } catch (e) {
    next(e)
  }
})

app.use('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({ success: true, message: 'ok' })
})

app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(error)
  res.status(500).json({ success: false, error: 'Server internal error' })
})

app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'API not found' })
})

export default app
