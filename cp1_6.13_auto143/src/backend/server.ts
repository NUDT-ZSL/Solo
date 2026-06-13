import express from 'express'
import { WebSocketServer, WebSocket } from 'ws'
import http from 'http'
import { database, Vote } from './database.js'
import { v4 as uuidv4 } from 'uuid'

const app = express()
const server = http.createServer(app)
const wss = new WebSocketServer({ server, path: '/ws' })

const PORT = 3001

interface Client {
  ws: WebSocket
  role: 'host' | 'voter' | 'viewer' | null
  voteId: string | null
  clientId: string
}

const clients = new Map<string, Client>()

function sendMessage(ws: WebSocket, type: string, data: unknown) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type, data, timestamp: Date.now() }))
  }
}

function broadcast(type: string, data: unknown, filter?: (client: Client) => boolean) {
  const message = JSON.stringify({ type, data, timestamp: Date.now() })
  clients.forEach(client => {
    if (client.ws.readyState === WebSocket.OPEN) {
      if (!filter || filter(client)) {
        client.ws.send(message)
      }
    }
  })
}

function broadcastVoteUpdate(vote: Vote) {
  broadcast('voteUpdate', vote, client => client.voteId === vote._id)
}

async function checkAndEndExpiredVotes() {
  const votes = await database.getAllVotes()
  const now = Date.now()

  for (const vote of votes) {
    if (vote.status === 'active' && vote.startedAt) {
      const elapsed = (now - vote.startedAt) / 1000
      if (elapsed >= vote.duration) {
        const endedVote = await database.stopVote(vote._id!)
        if (endedVote) {
          broadcastVoteUpdate(endedVote)
        }
      }
    }
  }
}

setInterval(checkAndEndExpiredVotes, 500)

wss.on('connection', (ws) => {
  const clientId = uuidv4()
  const client: Client = {
    ws,
    role: null,
    voteId: null,
    clientId
  }
  clients.set(clientId, client)

  sendMessage(ws, 'connected', { clientId })

  ws.on('message', async (message) => {
    try {
      const { type, data } = JSON.parse(message.toString())

      switch (type) {
        case 'register': {
          client.role = data.role
          client.voteId = data.voteId || null
          sendMessage(ws, 'registered', { role: client.role, voteId: client.voteId })

          if (client.role === 'host') {
            const votes = await database.getAllVotes()
            sendMessage(ws, 'voteList', votes)
          }

          if (client.voteId) {
            const vote = await database.getVote(client.voteId)
            if (vote) {
              sendMessage(ws, 'voteUpdate', vote)
            }
          }
          break
        }

        case 'createVote': {
          if (client.role !== 'host') {
            sendMessage(ws, 'error', { message: '未授权' })
            return
          }
          const { title, options, duration } = data
          const vote = await database.createVote(title, options, duration)
          broadcast('voteCreated', vote, c => c.role === 'host')
          break
        }

        case 'startVote': {
          if (client.role !== 'host') {
            sendMessage(ws, 'error', { message: '未授权' })
            return
          }
          const vote = await database.startVote(data.voteId)
          if (vote) {
            broadcast('voteStarted', vote, c => c.role === 'host' || c.voteId === vote._id)
            broadcastVoteUpdate(vote)
          }
          break
        }

        case 'stopVote': {
          if (client.role !== 'host') {
            sendMessage(ws, 'error', { message: '未授权' })
            return
          }
          const vote = await database.stopVote(data.voteId)
          if (vote) {
            broadcast('voteStopped', vote, c => c.role === 'host' || c.voteId === vote._id)
            broadcastVoteUpdate(vote)
          }
          break
        }

        case 'vote': {
          const { voteId, optionId, voterId } = data
          const vote = await database.castVote(voteId, optionId, voterId)
          if (vote) {
            broadcastVoteUpdate(vote)
            sendMessage(ws, 'voteConfirmed', { voteId, optionId })
          }
          break
        }

        case 'getVoteList': {
          if (client.role === 'host') {
            const votes = await database.getAllVotes()
            sendMessage(ws, 'voteList', votes)
          }
          break
        }

        case 'subscribe': {
          client.voteId = data.voteId
          const vote = await database.getVote(data.voteId)
          if (vote) {
            sendMessage(ws, 'voteUpdate', vote)
          }
          break
        }

        case 'ping': {
          sendMessage(ws, 'pong', { serverTime: Date.now() })
          break
        }
      }
    } catch (error) {
      console.error('Message error:', error)
      sendMessage(ws, 'error', { message: '无效的消息格式' })
    }
  })

  ws.on('close', () => {
    clients.delete(clientId)
  })

  ws.on('error', (error) => {
    console.error('WebSocket error:', error)
    clients.delete(clientId)
  })
})

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', clients: clients.size })
})

server.listen(PORT, () => {
  console.log(`VoteWave server running on port ${PORT}`)
  console.log(`WebSocket endpoint: ws://localhost:${PORT}/ws`)
})
