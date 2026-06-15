import express, { Request, Response } from 'express'
import http from 'http'
import { WebSocketServer } from 'ws'
import Datastore from 'nedb-promises'
import { v4 as uuidv4 } from 'uuid'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
app.use(express.json())

const db = Datastore.create(path.join(__dirname, '..', 'data', 'mazes.db'))

const PORT = 3001

app.get('/api/maze', async (_req: Request, res: Response) => {
  try {
    const docs = await db.find({}).sort({ createdAt: -1 }).limit(1)
    if (docs.length > 0) {
      res.json(docs[0])
    } else {
      res.status(404).json({ error: 'No maze found' })
    }
  } catch (err) {
    console.error('Error fetching maze:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.post('/api/maze', async (req: Request, res: Response) => {
  try {
    const mazeData = req.body
    if (!mazeData || !mazeData.walls) {
      return res.status(400).json({ error: 'Invalid maze data' })
    }
    const doc = {
      _id: uuidv4(),
      ...mazeData,
      createdAt: Date.now(),
    }
    const inserted = await db.insert(doc)
    res.json(inserted)
  } catch (err) {
    console.error('Error saving maze:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.get('/api/maze/:id', async (req: Request, res: Response) => {
  try {
    const doc = await db.findOne({ _id: req.params.id })
    if (doc) {
      res.json(doc)
    } else {
      res.status(404).json({ error: 'Maze not found' })
    }
  } catch (err) {
    console.error('Error fetching maze:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

const server = http.createServer(app)
const wss = new WebSocketServer({ server })

wss.on('connection', (ws) => {
  console.log('[EchoExplorer] 新的 WebSocket 连接已建立')

  ws.send(JSON.stringify({ type: 'welcome', message: '欢迎来到 EchoExplorer 多玩家服务器' }))

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString())
      wss.clients.forEach((client) => {
        if (client !== ws && client.readyState === 1) {
          client.send(JSON.stringify(msg))
        }
      })
    } catch (e) {
      // ignore invalid messages
    }
  })

  ws.on('close', () => {
    console.log('[EchoExplorer] WebSocket 连接已关闭')
  })
})

server.listen(PORT, () => {
  console.log(`[EchoExplorer] 后端服务已启动: http://localhost:${PORT}`)
  console.log(`[EchoExplorer] WebSocket 服务已启动: ws://localhost:${PORT}`)
})
