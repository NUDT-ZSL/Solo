import express, { type Request, type Response, type NextFunction } from 'express'
import cors from 'cors'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { v4 as uuidv4 } from 'uuid'
import dayjs from 'dayjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config()

const app: express.Application = express()
app.use(cors())
app.use(express.json({ limit: '10mb' }))

const dataDir = path.resolve(__dirname, '..', 'data')

function readJson(filename: string) {
  const fs = require('fs')
  const raw = fs.readFileSync(path.join(dataDir, filename), 'utf-8')
  return JSON.parse(raw)
}

function writeJson(filename: string, data: any) {
  const fs = require('fs')
  fs.writeFileSync(path.join(dataDir, filename), JSON.stringify(data, null, 2), 'utf-8')
}

// GET /api/devices
app.get('/api/devices', (_req: Request, res: Response) => {
  const devices = readJson('devices.json')
  res.json(devices)
})

// GET /api/devices/:id
app.get('/api/devices/:id', (req: Request, res: Response) => {
  const devices = readJson('devices.json')
  const device = devices.find((d: any) => d.id === req.params.id)
  if (!device) { res.status(404).json({ error: 'Device not found' }); return }
  res.json(device)
})

// GET /api/users/:id
app.get('/api/users/:id', (req: Request, res: Response) => {
  const users = readJson('users.json')
  const user = users.find((u: any) => u.id === req.params.id)
  if (!user) { res.status(404).json({ error: 'User not found' }); return }
  res.json(user)
})

// GET /api/records
app.get('/api/records', (_req: Request, res: Response) => {
  const records = readJson('records.json')
  res.json(records)
})

// POST /api/borrow
app.post('/api/borrow', (req: Request, res: Response) => {
  const { deviceId, userId } = req.body
  const devices = readJson('devices.json')
  const users = readJson('users.json')
  const records = readJson('records.json')

  const device = devices.find((d: any) => d.id === deviceId)
  const user = users.find((u: any) => u.id === userId)

  if (!device) { res.status(404).json({ error: 'Device not found' }); return }
  if (!user) { res.status(404).json({ error: 'User not found' }); return }
  if (device.status !== 'available') { res.status(400).json({ error: 'Device not available' }); return }
  if (user.creditScore < device.minCreditScore) { res.status(400).json({ error: 'Credit score too low' }); return }

  const record = {
    id: uuidv4(),
    deviceId,
    userId,
    borrowTime: dayjs().toISOString(),
    returnTime: null,
    status: 'active' as const,
  }
  records.push(record)
  writeJson('records.json', records)

  device.status = 'borrowed'
  writeJson('devices.json', devices)

  res.json(record)
})

// POST /api/return
app.post('/api/return', (req: Request, res: Response) => {
  const { recordId } = req.body
  const records = readJson('records.json')
  const devices = readJson('devices.json')
  const users = readJson('users.json')

  const record = records.find((r: any) => r.id === recordId)
  if (!record) { res.status(404).json({ error: 'Record not found' }); return }
  if (record.status !== 'active') { res.status(400).json({ error: 'Record already closed' }); return }

  const now = dayjs()
  const borrowTime = dayjs(record.borrowTime)
  const hoursDiff = now.diff(borrowTime, 'hour')
  const isOverdue = hoursDiff > 24

  record.returnTime = now.toISOString()
  record.status = isOverdue ? 'overdue' : 'returned'

  const device = devices.find((d: any) => d.id === record.deviceId)
  if (device) device.status = 'available'

  const user = users.find((u: any) => u.id === record.userId)
  if (user) {
    user.creditScore = isOverdue
      ? Math.max(0, user.creditScore - 5)
      : Math.min(100, user.creditScore + 1)
  }

  writeJson('records.json', records)
  writeJson('devices.json', devices)
  writeJson('users.json', users)

  res.json({ record, user })
})

app.use('/api/health', (_req: Request, res: Response) => {
  res.json({ success: true, message: 'ok' })
})

app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  res.status(500).json({ success: false, error: 'Server internal error' })
})

app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'API not found' })
})

export default app
