import express from 'express'
import cors from 'cors'
import { createServer } from 'http'
import { WebSocketServer } from 'ws'
import crypto from 'crypto'
import { v4 as uuidv4 } from 'uuid'
import { initDB, getAllStages, getStageById, createTicket } from './db.ts'
import { initSocketManager } from './socketManager.ts'
import type { Ticket } from './db.ts'

const app = express()
const server = createServer(app)
const wss = new WebSocketServer({ server, path: '/ws' })

const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

initSocketManager(wss)

const generateSeatNumber = (): string => {
  const sections = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
  const section = sections[Math.floor(Math.random() * sections.length)]
  const row = Math.floor(Math.random() * 20) + 1
  const seat = Math.floor(Math.random() * 30) + 1
  return `${section}${row}-${seat.toString().padStart(2, '0')}`
}

const generateSHA256 = (data: string): string => {
  return crypto.createHash('sha256').update(data).digest('hex')
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.get('/api/stages', (_req, res) => {
  try {
    const stages = getAllStages()
    res.json(stages)
  } catch (error) {
    console.error('Error fetching stages:', error)
    res.status(500).json({ error: 'Failed to fetch stages' })
  }
})

app.get('/api/stages/:id', (req, res) => {
  try {
    const stage = getStageById(req.params.id)
    if (!stage) {
      res.status(404).json({ error: 'Stage not found' })
      return
    }
    res.json(stage)
  } catch (error) {
    console.error('Error fetching stage:', error)
    res.status(500).json({ error: 'Failed to fetch stage' })
  }
})

app.post('/api/tickets', (req, res) => {
  try {
    const { userId, stageId, nickname } = req.body
    
    if (!userId || !stageId || !nickname) {
      res.status(400).json({ error: 'Missing required fields' })
      return
    }

    const stage = getStageById(stageId)
    if (!stage) {
      res.status(404).json({ error: 'Stage not found' })
      return
    }

    const ticketId = uuidv4()
    const seatNumber = generateSeatNumber()
    const hashData = `${userId}-${stageId}-${ticketId}-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const hash = generateSHA256(hashData)

    const ticketData: Omit<Ticket, 'createdAt'> = {
      id: ticketId,
      userId,
      stageId,
      nickname,
      hash,
      seatNumber
    }

    const ticket = createTicket(ticketData)
    res.json(ticket)
  } catch (error) {
    console.error('Error creating ticket:', error)
    res.status(500).json({ error: 'Failed to create ticket' })
  }
})

const startServer = async () => {
  try {
    await initDB()
    console.log('Database initialized')
    
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`)
      console.log(`WebSocket server ready on ws://localhost:${PORT}/ws`)
    })
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

startServer()
