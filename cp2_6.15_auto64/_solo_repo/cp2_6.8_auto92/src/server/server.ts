import express, { type Request, type Response } from 'express'
import cors from 'cors'
import { WebSocketServer, type WebSocket } from 'ws'
import { v4 as uuidv4 } from 'uuid'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import type {
  Timeline,
  TimelineEvent,
  Dependency,
  WSMessage,
  Collaborator,
} from '../../shared/types.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
app.use(cors())
app.use(express.json())

const timelines = new Map<string, Timeline>()
const shareCodeIndex = new Map<string, string>()
const rooms = new Map<string, Map<string, { ws: WebSocket; userName: string }>>()
const collaborators = new Map<string, Collaborator>()

const DATA_DIR = path.resolve(__dirname)
const DATA_FILE = path.join(DATA_DIR, 'data.json')

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
}

function loadData(): void {
  ensureDataDir()
  if (fs.existsSync(DATA_FILE)) {
    try {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8')
      const data = JSON.parse(raw) as {
        timelines: Timeline[]
      }
      timelines.clear()
      shareCodeIndex.clear()
      if (data.timelines && Array.isArray(data.timelines)) {
        for (const tl of data.timelines) {
          timelines.set(tl.id, tl)
          shareCodeIndex.set(tl.shareCode, tl.id)
        }
      }
      console.log(`Loaded ${timelines.size} timelines from data.json`)
    } catch (err) {
      console.error('Failed to load data.json:', err)
    }
  }
}

function saveData(): void {
  ensureDataDir()
  const data = {
    timelines: Array.from(timelines.values()),
  }
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8')
}

function generateShareCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  while (true) {
    let code = ''
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    if (!shareCodeIndex.has(code)) {
      return code
    }
  }
}

app.get('/api/timelines', (req: Request, res: Response): void => {
  const list = Array.from(timelines.values()).map((tl) => ({
    id: tl.id,
    title: tl.title,
    description: tl.description,
    shareCode: tl.shareCode,
    createdAt: tl.createdAt,
    updatedAt: tl.updatedAt,
    eventCount: tl.events.length,
    dependencyCount: tl.dependencies.length,
  }))
  res.json({ success: true, data: list })
})

app.get('/api/timelines/:id', (req: Request, res: Response): void => {
  const tl = timelines.get(req.params.id)
  if (!tl) {
    res.status(404).json({ success: false, error: 'Timeline not found' })
    return
  }
  res.json({ success: true, data: tl })
})

app.get('/api/timelines/share/:shareCode', (req: Request, res: Response): void => {
  const id = shareCodeIndex.get(req.params.shareCode)
  if (!id) {
    res.status(404).json({ success: false, error: 'Invalid share code' })
    return
  }
  const tl = timelines.get(id)
  if (!tl) {
    res.status(404).json({ success: false, error: 'Timeline not found' })
    return
  }
  res.json({ success: true, data: tl })
})

app.post('/api/timelines', (req: Request, res: Response): void => {
  const { title, description } = req.body as { title?: string; description?: string }
  if (!title || !title.trim()) {
    res.status(400).json({ success: false, error: 'Title is required' })
    return
  }
  const now = new Date().toISOString()
  const tl: Timeline = {
    id: uuidv4(),
    title: title.trim(),
    description: description ?? '',
    shareCode: generateShareCode(),
    events: [],
    dependencies: [],
    createdAt: now,
    updatedAt: now,
  }
  timelines.set(tl.id, tl)
  shareCodeIndex.set(tl.shareCode, tl.id)
  saveData()
  res.status(201).json({ success: true, data: tl })
})

app.put('/api/timelines/:id', (req: Request, res: Response): void => {
  const tl = timelines.get(req.params.id)
  if (!tl) {
    res.status(404).json({ success: false, error: 'Timeline not found' })
    return
  }
  const { title, description } = req.body as { title?: string; description?: string }
  if (title !== undefined) tl.title = title
  if (description !== undefined) tl.description = description
  tl.updatedAt = new Date().toISOString()
  saveData()
  res.json({ success: true, data: tl })
})

app.delete('/api/timelines/:id', (req: Request, res: Response): void => {
  const tl = timelines.get(req.params.id)
  if (!tl) {
    res.status(404).json({ success: false, error: 'Timeline not found' })
    return
  }
  shareCodeIndex.delete(tl.shareCode)
  timelines.delete(req.params.id)
  saveData()
  res.json({ success: true })
})

app.post('/api/timelines/:id/events', (req: Request, res: Response): void => {
  const tl = timelines.get(req.params.id)
  if (!tl) {
    res.status(404).json({ success: false, error: 'Timeline not found' })
    return
  }
  const { date, title, description, color, x, y } = req.body as Partial<TimelineEvent>
  if (!date || !title || !color) {
    res.status(400).json({ success: false, error: 'date, title, color are required' })
    return
  }
  const event: TimelineEvent = {
    id: uuidv4(),
    date,
    title,
    description: description ?? '',
    color,
    x,
    y,
  }
  tl.events.push(event)
  tl.updatedAt = new Date().toISOString()
  saveData()
  res.status(201).json({ success: true, data: event })
})

app.put('/api/timelines/:id/events/:eventId', (req: Request, res: Response): void => {
  const tl = timelines.get(req.params.id)
  if (!tl) {
    res.status(404).json({ success: false, error: 'Timeline not found' })
    return
  }
  const idx = tl.events.findIndex((e) => e.id === req.params.eventId)
  if (idx === -1) {
    res.status(404).json({ success: false, error: 'Event not found' })
    return
  }
  const evt = tl.events[idx]
  const body = req.body as Partial<TimelineEvent>
  if (body.date !== undefined) evt.date = body.date
  if (body.title !== undefined) evt.title = body.title
  if (body.description !== undefined) evt.description = body.description
  if (body.color !== undefined) evt.color = body.color
  if (body.x !== undefined) evt.x = body.x
  if (body.y !== undefined) evt.y = body.y
  tl.updatedAt = new Date().toISOString()
  saveData()
  res.json({ success: true, data: evt })
})

app.delete('/api/timelines/:id/events/:eventId', (req: Request, res: Response): void => {
  const tl = timelines.get(req.params.id)
  if (!tl) {
    res.status(404).json({ success: false, error: 'Timeline not found' })
    return
  }
  const before = tl.events.length
  tl.events = tl.events.filter((e) => e.id !== req.params.eventId)
  if (tl.events.length === before) {
    res.status(404).json({ success: false, error: 'Event not found' })
    return
  }
  tl.dependencies = tl.dependencies.filter(
    (d) => d.from !== req.params.eventId && d.to !== req.params.eventId,
  )
  tl.updatedAt = new Date().toISOString()
  saveData()
  res.json({ success: true })
})

app.post('/api/timelines/:id/dependencies', (req: Request, res: Response): void => {
  const tl = timelines.get(req.params.id)
  if (!tl) {
    res.status(404).json({ success: false, error: 'Timeline not found' })
    return
  }
  if (tl.dependencies.length >= 5) {
    res.status(400).json({ success: false, error: 'Maximum 5 dependencies allowed' })
    return
  }
  const { from, to } = req.body as { from?: string; to?: string }
  if (!from || !to) {
    res.status(400).json({ success: false, error: 'from and to are required' })
    return
  }
  if (from === to) {
    res.status(400).json({ success: false, error: 'Cannot create self-dependency' })
    return
  }
  const fromExists = tl.events.some((e) => e.id === from)
  const toExists = tl.events.some((e) => e.id === to)
  if (!fromExists || !toExists) {
    res.status(400).json({ success: false, error: 'Invalid event ids' })
    return
  }
  const duplicate = tl.dependencies.some((d) => d.from === from && d.to === to)
  if (duplicate) {
    res.status(400).json({ success: false, error: 'Dependency already exists' })
    return
  }
  const dep: Dependency = {
    id: uuidv4(),
    from,
    to,
  }
  tl.dependencies.push(dep)
  tl.updatedAt = new Date().toISOString()
  saveData()
  res.status(201).json({ success: true, data: dep })
})

app.delete('/api/timelines/:id/dependencies/:depId', (req: Request, res: Response): void => {
  const tl = timelines.get(req.params.id)
  if (!tl) {
    res.status(404).json({ success: false, error: 'Timeline not found' })
    return
  }
  const before = tl.dependencies.length
  tl.dependencies = tl.dependencies.filter((d) => d.id !== req.params.depId)
  if (tl.dependencies.length === before) {
    res.status(404).json({ success: false, error: 'Dependency not found' })
    return
  }
  tl.updatedAt = new Date().toISOString()
  saveData()
  res.json({ success: true })
})

app.get('/api/timelines/:id/export/json', (req: Request, res: Response): void => {
  const tl = timelines.get(req.params.id)
  if (!tl) {
    res.status(404).json({ success: false, error: 'Timeline not found' })
    return
  }
  res.setHeader('Content-Disposition', `attachment; filename="${tl.title}.json"`)
  res.setHeader('Content-Type', 'application/json')
  res.json(tl)
})

const PORT = 3001
const server = app.listen(PORT, () => {
  console.log(`Timeline server listening on port ${PORT}`)
  loadData()
})

const wss = new WebSocketServer({ server })

function broadcastToRoom(
  timelineId: string,
  message: WSMessage,
  excludeUserId?: string,
): void {
  const room = rooms.get(timelineId)
  if (!room) return
  const data = JSON.stringify(message)
  for (const [uid, client] of room.entries()) {
    if (excludeUserId && uid === excludeUserId) continue
    if (client.ws.readyState === client.ws.OPEN) {
      client.ws.send(data)
    }
  }
}

wss.on('connection', (ws: WebSocket): void => {
  let currentTimelineId: string | null = null
  let currentUserId: string | null = null
  let currentUserName: string | null = null

  ws.on('message', (raw: Buffer): void => {
    let msg: WSMessage
    try {
      msg = JSON.parse(raw.toString()) as WSMessage
    } catch {
      return
    }

    if (msg.type === 'join') {
      if (!msg.timelineId || !msg.userId || !msg.userName) {
        ws.send(JSON.stringify({ type: 'error', payload: 'Invalid join message' }))
        return
      }
      let room = rooms.get(msg.timelineId)
      if (!room) {
        room = new Map()
        rooms.set(msg.timelineId, room)
      }
      if (room.size >= 5) {
        ws.send(
          JSON.stringify({
            type: 'error',
            payload: 'Room is full (max 5 collaborators)',
          }),
        )
        return
      }
      room.set(msg.userId, { ws, userName: msg.userName })
      currentTimelineId = msg.timelineId
      currentUserId = msg.userId
      currentUserName = msg.userName

      const collaborator: Collaborator = {
        id: msg.userId,
        name: msg.userName,
        timelineId: msg.timelineId,
      }
      collaborators.set(msg.userId, collaborator)

      broadcastToRoom(
        msg.timelineId,
        {
          type: 'join',
          payload: { userId: msg.userId, userName: msg.userName },
          timelineId: msg.timelineId,
          userId: msg.userId,
          userName: msg.userName,
        },
        msg.userId,
      )

      const members = Array.from(room.entries()).map(([uid, c]) => ({
        userId: uid,
        userName: c.userName,
      }))
      ws.send(
        JSON.stringify({
          type: 'joined',
          payload: { members },
          timelineId: msg.timelineId,
          userId: msg.userId,
          userName: msg.userName,
        }),
      )
      return
    }

    if (!currentTimelineId || !currentUserId || !currentUserName) {
      return
    }

    const tl = timelines.get(currentTimelineId)
    if (!tl) return

    if (msg.type === 'event_add') {
      const evt = msg.payload as TimelineEvent
      if (!evt.id) evt.id = uuidv4()
      tl.events.push(evt)
      tl.updatedAt = new Date().toISOString()
      saveData()
    } else if (msg.type === 'event_update') {
      const evt = msg.payload as TimelineEvent
      const idx = tl.events.findIndex((e) => e.id === evt.id)
      if (idx !== -1) {
        tl.events[idx] = { ...tl.events[idx], ...evt }
        tl.updatedAt = new Date().toISOString()
        saveData()
      }
    } else if (msg.type === 'event_delete') {
      const eventId = msg.payload as string
      tl.events = tl.events.filter((e) => e.id !== eventId)
      tl.dependencies = tl.dependencies.filter((d) => d.from !== eventId && d.to !== eventId)
      tl.updatedAt = new Date().toISOString()
      saveData()
    } else if (msg.type === 'event_lock') {
      const { eventId, userId, userName } = msg.payload as {
        eventId: string
        userId: string
        userName: string
      }
      const evt = tl.events.find((e) => e.id === eventId)
      if (evt && !evt.lockedBy) {
        evt.lockedBy = userId
        evt.lockedByName = userName
      }
    } else if (msg.type === 'event_unlock') {
      const eventId = msg.payload as string
      const evt = tl.events.find((e) => e.id === eventId)
      if (evt) {
        evt.lockedBy = undefined
        evt.lockedByName = undefined
      }
    } else if (msg.type === 'dependency_add') {
      const dep = msg.payload as Dependency
      if (tl.dependencies.length < 5) {
        if (!dep.id) dep.id = uuidv4()
        tl.dependencies.push(dep)
        tl.updatedAt = new Date().toISOString()
        saveData()
      }
    } else if (msg.type === 'dependency_delete') {
      const depId = msg.payload as string
      tl.dependencies = tl.dependencies.filter((d) => d.id !== depId)
      tl.updatedAt = new Date().toISOString()
      saveData()
    } else if (msg.type === 'timeline_update') {
      const { title, description } = msg.payload as { title?: string; description?: string }
      if (title !== undefined) tl.title = title
      if (description !== undefined) tl.description = description
      tl.updatedAt = new Date().toISOString()
      saveData()
    }

    broadcastToRoom(
      currentTimelineId,
      {
        type: msg.type,
        payload: msg.payload,
        timelineId: currentTimelineId,
        userId: currentUserId,
        userName: currentUserName,
      },
      currentUserId,
    )
  })

  ws.on('close', (): void => {
    if (currentTimelineId && currentUserId) {
      const room = rooms.get(currentTimelineId)
      if (room) {
        const tl = timelines.get(currentTimelineId)
        if (tl) {
          for (const evt of tl.events) {
            if (evt.lockedBy === currentUserId) {
              evt.lockedBy = undefined
              evt.lockedByName = undefined
            }
          }
        }
        const userName = room.get(currentUserId)?.userName
        room.delete(currentUserId)
        collaborators.delete(currentUserId)
        if (room.size === 0) {
          rooms.delete(currentTimelineId)
        } else if (userName) {
          broadcastToRoom(
            currentTimelineId,
            {
              type: 'leave',
              payload: { userId: currentUserId, userName },
              timelineId: currentTimelineId,
              userId: currentUserId,
              userName,
            },
          )
        }
      }
    }
  })
})

export default app
