import express from 'express'
import http from 'http'
import { Server as SocketIOServer } from 'socket.io'
import cors from 'cors'
import {
  createComposition,
  getCompositionById,
  getCompositionByHash,
  listCompositions,
  likeComposition,
  Note,
  Composition
} from './data'

const app = express()
const server = http.createServer(app)
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH']
  }
})

app.use(cors())
app.use(express.json())

app.post('/api/compositions', (req, res) => {
  try {
    const { notes, velocities } = req.body as { notes: Note[]; velocities: number[] }

    if (!notes || !Array.isArray(notes) || notes.length === 0) {
      return res.status(400).json({ error: '音符序列不能为空' })
    }
    if (notes.length > 16) {
      return res.status(400).json({ error: '音符数量不能超过16个' })
    }
    if (!velocities || !Array.isArray(velocities)) {
      return res.status(400).json({ error: '力度值数组无效' })
    }

    const composition = createComposition(notes, velocities)
    res.status(201).json(composition)
  } catch (err) {
    res.status(500).json({ error: '创建作品失败' })
  }
})

app.get('/api/compositions', (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const pageSize = parseInt(req.query.pageSize as string) || 6
    const result = listCompositions(page, pageSize)
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: '查询作品列表失败' })
  }
})

app.get('/api/compositions/:id', (req, res) => {
  try {
    const { id } = req.params
    let composition: Composition | undefined

    if (id.length === 8) {
      composition = getCompositionByHash(id)
    }
    if (!composition) {
      composition = getCompositionById(id)
    }

    if (!composition) {
      return res.status(404).json({ error: '作品不存在' })
    }
    res.json(composition)
  } catch (err) {
    res.status(500).json({ error: '查询作品失败' })
  }
})

app.patch('/api/compositions/:id/like', (req, res) => {
  try {
    const { id } = req.params
    const updated = likeComposition(id)
    if (!updated) {
      return res.status(404).json({ error: '作品不存在' })
    }
    io.emit('like:update', { id: updated.id, likes: updated.likes, hash: updated.hash })
    res.json(updated)
  } catch (err) {
    res.status(500).json({ error: '点赞失败' })
  }
})

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id)

  socket.on('collision:report', (data) => {
    socket.broadcast.emit('collision:broadcast', data)
  })

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id)
  })
})

const PORT = 3001
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
