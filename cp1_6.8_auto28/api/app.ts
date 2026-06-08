import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { TotemService } from './totemService.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

const totemService = new TotemService()

app.get('/api/totems', (_req: Request, res: Response) => {
  const totems = totemService.getAll()
  res.json(totems)
})

app.get('/api/totems/user/:ownerId', (req: Request, res: Response) => {
  const totems = totemService.getByOwner(req.params.ownerId)
  res.json(totems)
})

app.get('/api/totems/:id', (req: Request, res: Response) => {
  const totem = totemService.getById(req.params.id)
  if (!totem) {
    res.status(404).json({ error: 'Totem not found' })
    return
  }
  res.json(totem)
})

app.post('/api/totems', (req: Request, res: Response) => {
  const { audioData, ownerId } = req.body
  if (!audioData || !ownerId) {
    res.status(400).json({ error: 'audioData and ownerId are required' })
    return
  }

  const totem = totemService.create(audioData, ownerId)
  res.status(201).json(totem)
})

app.delete('/api/totems/:id', (req: Request, res: Response) => {
  const { ownerId } = req.body
  const success = totemService.delete(req.params.id, ownerId)
  if (!success) {
    res.status(404).json({ error: 'Totem not found or not authorized' })
    return
  }
  res.json({ success: true })
})

app.post('/api/totems/merge', (req: Request, res: Response) => {
  const { sourceId, targetId } = req.body
  if (!sourceId || !targetId) {
    res.status(400).json({ error: 'sourceId and targetId are required' })
    return
  }

  const merged = totemService.merge(sourceId, targetId)
  if (!merged) {
    res.status(404).json({ error: 'Source or target totem not found' })
    return
  }
  res.json(merged)
})

app.use(
  '/api/health',
  (_req: Request, res: Response) => {
    res.status(200).json({ success: true, message: 'ok' })
  }
)

app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Server error:', error)
  res.status(500).json({ success: false, error: 'Server internal error' })
})

app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'API not found' })
})

export default app
