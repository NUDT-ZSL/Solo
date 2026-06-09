import express from 'express'
import { WebSocketServer, WebSocket } from 'ws'
import http from 'http'
import { v4 as uuidv4 } from 'uuid'
import type { Tag, WSMessage } from '../types'
import { COLOR_PALETTE, MIN_RADIUS, MAX_RADIUS, MAX_VOTES, MAX_TEXT_LENGTH } from '../constants'

const app = express()
const server = http.createServer(app)
const wss = new WebSocketServer({ server, path: '/ws' })

app.use(express.json())

let tags: Tag[] = []

function getRandomColor(): string {
  return COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)]
}

function getRandomPosition(): { x: number; y: number; z: number } {
  const radius = MIN_RADIUS + Math.random() * (MAX_RADIUS - MIN_RADIUS)
  const theta = Math.random() * Math.PI * 2
  const phi = Math.random() * Math.PI
  return {
    x: radius * Math.sin(phi) * Math.cos(theta),
    y: radius * Math.sin(phi) * Math.sin(theta),
    z: radius * Math.cos(phi),
  }
}

function broadcast(message: WSMessage) {
  const data = JSON.stringify(message)
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data)
    }
  })
}

wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ type: 'tags', data: tags } as WSMessage))
})

app.get('/api/tags', (_req, res) => {
  res.json(tags)
})

app.post('/api/tags', (req, res) => {
  const { text } = req.body
  if (!text || typeof text !== 'string' || text.length > MAX_TEXT_LENGTH || text.trim().length === 0) {
    return res.status(400).json({ error: 'Invalid text' })
  }
  const newTag: Tag = {
    id: uuidv4(),
    text: text.trim().slice(0, MAX_TEXT_LENGTH),
    color: getRandomColor(),
    votes: 0,
    position: getRandomPosition(),
  }
  tags.push(newTag)
  broadcast({ type: 'add', data: newTag })
  res.status(201).json(newTag)
})

app.delete('/api/tags/:id', (req, res) => {
  const { id } = req.params
  const idx = tags.findIndex((t) => t.id === id)
  if (idx === -1) {
    return res.status(404).json({ error: 'Tag not found' })
  }
  tags.splice(idx, 1)
  broadcast({ type: 'delete', data: id })
  res.json({ success: true })
})

app.delete('/api/tags', (_req, res) => {
  tags = []
  broadcast({ type: 'clear' })
  res.json({ success: true })
})

app.put('/api/tags/:id/vote', (req, res) => {
  const { id } = req.params
  const tag = tags.find((t) => t.id === id)
  if (!tag) {
    return res.status(404).json({ error: 'Tag not found' })
  }
  if (tag.votes < MAX_VOTES) {
    tag.votes++
    broadcast({ type: 'vote', data: { id, votes: tag.votes } })
  }
  res.json(tag)
})

const PORT = 3001
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
