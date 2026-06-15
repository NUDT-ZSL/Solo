import express, { Request, Response } from 'express'

const app = express()
const PORT = 3001

app.use(express.json({ limit: '2mb' }))
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }
  next()
})

interface Annotation {
  id: string
  roomCode: string
  paragraphIndex: number
  startOffset: number
  endOffset: number
  content: string
  color: string
  userId: string
  timestamp: number
}

interface RoomState {
  annotations: Annotation[]
  paragraphs: string[]
  onlineUsers: Map<string, number>
  lastUpdate: number
}

const rooms = new Map<string, RoomState>()

const COLOR_PALETTE = [
  '#FFD1B3',
  '#B3E5FC',
  '#C8E6C9',
  '#FFF9C4',
  '#E1BEE7',
  '#FFCCBC',
  '#BBDEFB',
  '#F8BBD0'
]

function generateRoomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
}

function getOrCreateRoom(roomCode: string): RoomState {
  let room = rooms.get(roomCode)
  if (!room) {
    room = {
      annotations: [],
      paragraphs: [],
      onlineUsers: new Map(),
      lastUpdate: 0
    }
    rooms.set(roomCode, room)
  }
  return room
}

function heartbeat(userId: string, roomCode: string) {
  const room = getOrCreateRoom(roomCode)
  room.onlineUsers.set(userId, Date.now())
  for (const [uid, ts] of room.onlineUsers) {
    if (Date.now() - ts > 10000) {
      room.onlineUsers.delete(uid)
    }
  }
}

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', rooms: rooms.size })
})

app.post('/createRoom', (req: Request, res: Response) => {
  const roomCode = generateRoomCode()
  const userId = generateId()
  getOrCreateRoom(roomCode)
  heartbeat(userId, roomCode)
  res.json({ roomCode, userId })
})

app.post('/joinRoom', (req: Request, res: Response) => {
  const { roomCode } = req.body
  if (!roomCode || typeof roomCode !== 'string') {
    return res.status(400).json({ error: '房间码不能为空' })
  }
  const code = roomCode.toUpperCase()
  const userId = generateId()
  const room = getOrCreateRoom(code)
  heartbeat(userId, code)
  res.json({
    roomCode: code,
    userId,
    paragraphs: room.paragraphs,
    annotations: room.annotations,
    onlineCount: room.onlineUsers.size
  })
})

app.post('/upload', (req: Request, res: Response) => {
  const { roomCode, content, userId } = req.body
  if (!roomCode || !content || !userId) {
    return res.status(400).json({ error: '缺少必要参数' })
  }
  if (Buffer.byteLength(content, 'utf-8') > 2 * 1024 * 1024) {
    return res.status(400).json({ error: '文件大小超过2MB限制' })
  }
  const code = roomCode.toUpperCase()
  const paragraphs = content
    .split(/\r?\n\s*\r?\n/)
    .map((p: string) => p.trim())
    .filter((p: string) => p.length > 0)

  const room = getOrCreateRoom(code)
  room.paragraphs = paragraphs
  room.annotations = []
  room.lastUpdate = Date.now()
  heartbeat(userId, code)

  res.json({
    paragraphs,
    annotations: room.annotations,
    onlineCount: room.onlineUsers.size
  })
})

app.get('/getUpdates', (req: Request, res: Response) => {
  const { roomCode, userId, since } = req.query
  if (!roomCode || !userId) {
    return res.status(400).json({ error: '缺少房间码或用户ID' })
  }
  const code = (roomCode as string).toUpperCase()
  const room = rooms.get(code)
  heartbeat(userId as string, code)

  if (!room) {
    return res.json({
      annotations: [],
      paragraphs: [],
      onlineCount: 0,
      lastUpdate: 0
    })
  }

  const sinceNum = parseInt(since as string) || 0
  const filtered = sinceNum > 0
    ? room.annotations.filter(a => a.timestamp > sinceNum)
    : room.annotations

  res.json({
    annotations: filtered,
    fullSync: sinceNum === 0,
    paragraphs: sinceNum === 0 ? room.paragraphs : [],
    onlineCount: room.onlineUsers.size,
    lastUpdate: room.lastUpdate
  })
})

app.post('/addAnnotation', (req: Request, res: Response) => {
  const { roomCode, userId, paragraphIndex, startOffset, endOffset, content, color } = req.body
  if (!roomCode || !userId) {
    return res.status(400).json({ error: '缺少房间码或用户ID' })
  }
  if (typeof paragraphIndex !== 'number' || paragraphIndex < 0) {
    return res.status(400).json({ error: '无效的段落索引' })
  }
  if (typeof startOffset !== 'number' || typeof endOffset !== 'number' || startOffset >= endOffset) {
    return res.status(400).json({ error: '无效的文本范围' })
  }
  if (!content || typeof content !== 'string' || content.length > 200) {
    return res.status(400).json({ error: '批注内容长度需在1-200字之间' })
  }
  if (!color || !COLOR_PALETTE.includes(color)) {
    return res.status(400).json({ error: '无效的颜色' })
  }
  const code = roomCode.toUpperCase()
  const room = getOrCreateRoom(code)

  const annotation: Annotation = {
    id: generateId(),
    roomCode: code,
    paragraphIndex,
    startOffset,
    endOffset,
    content: content.trim(),
    color,
    userId,
    timestamp: Date.now()
  }

  room.annotations.push(annotation)
  room.lastUpdate = Date.now()
  heartbeat(userId, code)

  res.json({ annotation, onlineCount: room.onlineUsers.size })
})

app.post('/deleteAnnotation', (req: Request, res: Response) => {
  const { roomCode, userId, annotationId } = req.body
  if (!roomCode || !userId || !annotationId) {
    return res.status(400).json({ error: '缺少必要参数' })
  }
  const code = roomCode.toUpperCase()
  const room = getOrCreateRoom(code)
  const idx = room.annotations.findIndex(a => a.id === annotationId)
  if (idx === -1) {
    return res.status(404).json({ error: '批注不存在' })
  }
  const annotation = room.annotations[idx]
  if (annotation.userId !== userId) {
    return res.status(403).json({ error: '无权删除他人批注' })
  }
  room.annotations.splice(idx, 1)
  room.lastUpdate = Date.now()
  heartbeat(userId, code)

  res.json({
    deletedId: annotationId,
    onlineCount: room.onlineUsers.size
  })
})

app.get('/colors', (req: Request, res: Response) => {
  res.json({ colors: COLOR_PALETTE })
})

app.listen(PORT, () => {
  console.log(`批注协作服务器运行在 http://localhost:${PORT}`)
})
