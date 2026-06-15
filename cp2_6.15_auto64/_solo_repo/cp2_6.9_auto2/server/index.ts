import express from 'express'
import { createServer } from 'http'
import { Server, Socket } from 'socket.io'
import cors from 'cors'

interface Point {
  x: number
  y: number
}

interface Stroke {
  id: string
  points: Point[]
  color: string
  width: number
  userId: string
  tool: 'pen' | 'eraser'
  roughness?: number
}

interface StickyNote {
  id: string
  x: number
  y: number
  width: number
  height: number
  text: string
  color: string
  userId: string
  zIndex: number
}

interface User {
  id: string
  color: string
  name: string
}

interface RoomState {
  strokes: Stroke[]
  stickyNotes: StickyNote[]
  users: Map<string, User>
}

const USER_COLORS = [
  '#6b8cae', '#e07a5f', '#81b29a', '#f2cc8f',
  '#9d4edd', '#ef476f', '#06d6a0', '#ffd166',
  '#118ab2', '#073b4c', '#e63946', '#2a9d8f'
]

const ADJECTIVES = ['快乐的', '聪明的', '勇敢的', '温暖的', '闪亮的', '友善的', '活泼的', '可爱的']
const NOUNS = ['小猫', '小熊', '小鸟', '小兔', '小狗', '小鹿', '小鱼', '小马']

function generateRandomName(): string {
  return ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)] + NOUNS[Math.floor(Math.random() * NOUNS.length)]
}

const app = express()
app.use(cors())
app.use(express.json())

const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
})

const rooms = new Map<string, RoomState>()

function getRoom(roomId: string): RoomState {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      strokes: [],
      stickyNotes: [],
      users: new Map()
    })
  }
  return rooms.get(roomId)!
}

io.on('connection', (socket: Socket) => {
  let currentRoomId: string | null = null
  let currentUserId: string | null = null

  socket.on('room:join', ({ roomId }: { roomId: string }) => {
    currentRoomId = roomId
    currentUserId = socket.id

    const room = getRoom(roomId)

    const userIdx = room.users.size % USER_COLORS.length
    const user: User = {
      id: socket.id,
      color: USER_COLORS[userIdx],
      name: generateRandomName()
    }
    room.users.set(socket.id, user)

    socket.join(roomId)

    socket.emit('init', {
      state: {
        strokes: room.strokes,
        stickyNotes: room.stickyNotes
      },
      users: Array.from(room.users.values()),
      selfId: socket.id
    })

    socket.to(roomId).emit('user:join', user)
    console.log(`[${roomId}] User ${socket.id} joined. Total: ${room.users.size}`)
  })

  socket.on('stroke:add', (stroke: Stroke) => {
    if (!currentRoomId) return
    const room = getRoom(currentRoomId)
    room.strokes.push(stroke)
    socket.to(currentRoomId).emit('stroke:add', stroke)
  })

  socket.on('stroke:undo', ({ userId, strokeId }: { userId: string; strokeId: string }) => {
    if (!currentRoomId) return
    const room = getRoom(currentRoomId)
    room.strokes = room.strokes.filter((s) => s.id !== strokeId)
    socket.to(currentRoomId).emit('stroke:undo', { userId, strokeId })
  })

  socket.on('stroke:redo', ({ userId, stroke }: { userId: string; stroke: Stroke }) => {
    if (!currentRoomId) return
    const room = getRoom(currentRoomId)
    room.strokes.push(stroke)
    socket.to(currentRoomId).emit('stroke:redo', { userId, stroke })
  })

  socket.on('sticky:add', (note: StickyNote) => {
    if (!currentRoomId) return
    const room = getRoom(currentRoomId)
    room.stickyNotes.push(note)
    socket.to(currentRoomId).emit('sticky:add', note)
  })

  socket.on('sticky:update', (note: StickyNote) => {
    if (!currentRoomId) return
    const room = getRoom(currentRoomId)
    const idx = room.stickyNotes.findIndex((n) => n.id === note.id)
    if (idx >= 0) {
      room.stickyNotes[idx] = note
    } else {
      room.stickyNotes.push(note)
    }
    socket.to(currentRoomId).emit('sticky:update', note)
  })

  socket.on('sticky:delete', (noteId: string) => {
    if (!currentRoomId) return
    const room = getRoom(currentRoomId)
    room.stickyNotes = room.stickyNotes.filter((n) => n.id !== noteId)
    socket.to(currentRoomId).emit('sticky:delete', noteId)
  })

  socket.on('ping', () => {
    socket.emit('pong')
  })

  socket.on('disconnect', () => {
    if (!currentRoomId || !currentUserId) return

    const room = getRoom(currentRoomId)
    room.users.delete(currentUserId)

    socket.to(currentRoomId).emit('user:leave', currentUserId)

    if (room.users.size === 0) {
      setTimeout(() => {
        const r = rooms.get(currentRoomId!)
        if (r && r.users.size === 0) {
          rooms.delete(currentRoomId!)
          console.log(`[${currentRoomId}] Room cleared (empty)`)
        }
      }, 60000)
    }

    console.log(`[${currentRoomId}] User ${currentUserId} left. Remaining: ${room.users.size}`)
  })
})

const PORT = process.env.PORT || 3001

httpServer.listen(PORT, () => {
  console.log(`协作白板服务端启动成功 🎨`)
  console.log(`端口: ${PORT}`)
  console.log(`WebSocket: ws://localhost:${PORT}`)
})
