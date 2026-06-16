import express from 'express'
import expressWs from 'express-ws'
import { v4 as uuidv4 } from 'uuid'
import { createPuzzleBoard, swapPieces, PuzzleBoard, getCorrectCount, assignUserRegions } from '../src/game/puzzleBoard'
import { createUser, User, ChatMessage, createChatMessage } from '../src/game/collaboration'

const app = express()
const { app: wsApp, getWss } = expressWs(app)

app.use(express.json())

interface Room {
  id: string
  name: string
  board: PuzzleBoard
  users: Map<string, User>
  messages: ChatMessage[]
  createdAt: number
}

const rooms = new Map<string, Room>()

function createRoom(name: string): Room {
  const room: Room = {
    id: uuidv4(),
    name,
    board: createPuzzleBoard(8, 8),
    users: new Map(),
    messages: [],
    createdAt: Date.now(),
  }
  rooms.set(room.id, room)
  return room
}

function getRoomPublicInfo(room: Room) {
  return {
    id: room.id,
    name: room.name,
    userCount: room.users.size,
    createdAt: room.createdAt,
  }
}

app.get('/api/rooms', (req, res) => {
  const roomList = Array.from(rooms.values()).map(getRoomPublicInfo)
  res.json(roomList)
})

app.post('/api/rooms', (req, res) => {
  const { name } = req.body
  if (!name || typeof name !== 'string') {
    res.status(400).json({ error: 'Room name is required' })
    return
  }
  const room = createRoom(name)
  res.json(getRoomPublicInfo(room))
})

app.get('/api/rooms/:roomId', (req, res) => {
  const room = rooms.get(req.params.roomId)
  if (!room) {
    res.status(404).json({ error: 'Room not found' })
    return
  }
  res.json({
    ...getRoomPublicInfo(room),
    board: {
      rows: room.board.rows,
      cols: room.board.cols,
      pieces: room.board.pieces,
      isComplete: room.board.isComplete,
    },
    users: Array.from(room.users.values()),
  })
})

wsApp.ws('/ws/:roomId', (ws, req) => {
  const roomId = req.params.roomId
  const room = rooms.get(roomId)

  if (!room) {
    ws.close()
    return
  }

  const userId = uuidv4()
  let userName = `用户${userId.slice(0, 4)}`
  let user: User | null = null

  ws.on('message', (msg) => {
    try {
      const data = JSON.parse(msg.toString())

      switch (data.type) {
        case 'join': {
          userName = data.userName || userName
          user = createUser(userId, userName)
          room.users.set(userId, user)
          const userIds = Array.from(room.users.keys())
          room.board = assignUserRegions(room.board, userIds)
          broadcastToRoom(roomId, {
            type: 'user-joined',
            user,
          })
          ws.send(JSON.stringify({
            type: 'init',
            userId,
            user,
            board: room.board,
            users: Array.from(room.users.values()),
            messages: room.messages,
          }))
          broadcastToRoom(roomId, {
            type: 'board-updated',
            board: room.board,
            users: Array.from(room.users.values()),
          })
          break
        }

        case 'swap-pieces': {
          const { pieceId1, pieceId2 } = data
          const newBoard = swapPieces(room.board, pieceId1, pieceId2, userId)
          if (newBoard !== room.board) {
            room.board = newBoard
            if (user) {
              const correctCount = getCorrectCount(newBoard)
              user.piecesCompleted = Math.max(user.piecesCompleted, correctCount - (64 - room.board.pieces.length) + 0)
            }
            broadcastToRoom(roomId, {
              type: 'board-updated',
              board: newBoard,
              users: Array.from(room.users.values()),
            })

            if (newBoard.isComplete) {
              broadcastToRoom(roomId, {
                type: 'puzzle-complete',
                board: newBoard,
                users: Array.from(room.users.values()),
              })
            }
          }
          break
        }

        case 'chat-message': {
          if (!user) break
          const message = createChatMessage(uuidv4(), userId, user.name, data.content)
          room.messages.push(message)
          if (room.messages.length > 100) {
            room.messages = room.messages.slice(-100)
          }
          broadcastToRoom(roomId, {
            type: 'chat-message',
            message,
          })
          break
        }

        case 'update-progress': {
          if (!user) break
          user.piecesCompleted = data.piecesCompleted || user.piecesCompleted
          broadcastToRoom(roomId, {
            type: 'user-updated',
            user,
          })
          break
        }
      }
    } catch (e) {
      console.error('WebSocket message error:', e)
    }
  })

  ws.on('close', () => {
    if (user) {
      room.users.delete(userId)
      broadcastToRoom(roomId, {
        type: 'user-left',
        userId,
      })
    }
  })
})

function broadcastToRoom(roomId: string, message: object) {
  const wss = getWss()
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      const url = client.url || ''
      if (url.includes(`/ws/${roomId}`)) {
        client.send(JSON.stringify(message))
      }
    }
  })
}

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

if (rooms.size === 0) {
  createRoom('默认房间')
}
