import express from 'express'
import { createServer } from 'http'
import { WebSocketServer, WebSocket } from 'ws'
import cors from 'cors'
import bodyParser from 'body-parser'
import { v4 as uuidv4 } from 'uuid'

export interface Bullet {
  id: string
  text: string
  color: string
  y: number
  speed: number
  fontSize: number
  likes: number
  reported: boolean
  createdAt: number
  likedBy: string[]
}

export interface WSMessage {
  type: 'new_bullet' | 'like' | 'report' | 'history'
  data: any
}

const app = express()
const server = createServer(app)
const wss = new WebSocketServer({ server, path: '/ws' })

app.use(cors())
app.use(bodyParser.json())

const MAX_HISTORY = 200
const bullets: Bullet[] = []
const clients = new Map<string, WebSocket>()

function broadcast(message: WSMessage) {
  const msgStr = JSON.stringify(message)
  clients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(msgStr)
    }
  })
}

function sendToClient(ws: WebSocket, message: WSMessage) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message))
  }
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', bullets: bullets.length, clients: clients.size })
})

app.get('/api/bullets', (_req, res) => {
  res.json(bullets.slice(-MAX_HISTORY))
})

wss.on('connection', (ws, req) => {
  const clientId = uuidv4()
  clients.set(clientId, ws)
  console.log(`[WS] Client connected: ${clientId}, total: ${clients.size}`)

  sendToClient(ws, {
    type: 'history',
    data: bullets.slice(-MAX_HISTORY)
  })

  ws.on('message', (raw) => {
    try {
      const msg: WSMessage = JSON.parse(raw.toString())
      handleMessage(clientId, msg)
    } catch (e) {
      console.error('[WS] Parse error:', e)
    }
  })

  ws.on('close', () => {
    clients.delete(clientId)
    console.log(`[WS] Client disconnected: ${clientId}, total: ${clients.size}`)
  })
})

function handleMessage(clientId: string, msg: WSMessage) {
  switch (msg.type) {
    case 'new_bullet': {
      const { text, color, y, speed, fontSize } = msg.data
      if (!text || text.length > 50) return

      const bullet: Bullet = {
        id: uuidv4(),
        text: String(text).slice(0, 50),
        color: color || '#ffffff',
        y: Number(y) || 100,
        speed: Number(speed) || 150,
        fontSize: Number(fontSize) || 20,
        likes: 0,
        reported: false,
        createdAt: Date.now(),
        likedBy: []
      }

      bullets.push(bullet)
      if (bullets.length > MAX_HISTORY) {
        bullets.splice(0, bullets.length - MAX_HISTORY)
      }

      broadcast({
        type: 'new_bullet',
        data: bullet
      })
      break
    }

    case 'like': {
      const { bulletId } = msg.data
      const bullet = bullets.find((b) => b.id === bulletId)
      if (bullet) {
        if (!bullet.likedBy.includes(clientId)) {
          bullet.likedBy.push(clientId)
          bullet.likes++
        }
        broadcast({
          type: 'like',
          data: { bulletId: bullet.id, likes: bullet.likes, clientId }
        })
      }
      break
    }

    case 'report': {
      const { bulletId } = msg.data
      const bullet = bullets.find((b) => b.id === bulletId)
      if (bullet && !bullet.reported) {
        bullet.reported = true
        broadcast({
          type: 'report',
          data: { bulletId: bullet.id, reported: true }
        })
      }
      break
    }
  }
}

const PORT = 3001
server.listen(PORT, () => {
  console.log(`[Server] Running on http://localhost:${PORT}`)
  console.log(`[Server] WebSocket on ws://localhost:${PORT}/ws`)
})
