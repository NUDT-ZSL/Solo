import express from 'express'
import { createServer } from 'http'
import { WebSocketServer, WebSocket } from 'ws'
import { v4 as uuidv4 } from 'uuid'
import Datastore from 'nedb-promises'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const db = Datastore.create(join(__dirname, '..', 'data', 'rooms.db'))

const app = express()
app.use(express.json())

const server = createServer(app)
const wss = new WebSocketServer({ server, path: '/ws' })

interface Player {
  id: string
  name: string
  score: number
  color: string
  connected: boolean
}

interface PuzzlePiece {
  id: string
  index: number
  correctX: number
  correctY: number
  currentX: number
  currentY: number
  rotation: number
  ownerId: string | null
  placed: boolean
}

interface Room {
  _id?: string
  id: string
  name: string
  players: Player[]
  pieces: PuzzlePiece[]
  puzzleTheme: string
  puzzleCols: number
  puzzleRows: number
  boardWidth: number
  boardHeight: number
  createdAt: number
  gamePhase: 'waiting' | 'countdown' | 'playing' | 'finished'
  roundTimer: number
}

interface ChatMessage {
  id: string
  playerId: string
  playerName: string
  content: string
  timestamp: number
}

const rooms = new Map<string, Room>()
const wsToRoom = new Map<WebSocket, { roomId: string; playerId: string }>()
const chatHistory = new Map<string, ChatMessage[]>()

const PLAYER_COLORS = ['#6366f1', '#f43f5e', '#22c55e', '#f59e0b']

const PUZZLE_THEMES = [
  'sunset',
  'ocean',
  'forest',
  'galaxy',
  'cityscape',
  'abstract',
]

app.get('/api/rooms', async (req, res) => {
  try {
    const roomList = Array.from(rooms.values()).map((r) => ({
      id: r.id,
      name: r.name,
      playerCount: r.players.filter((p) => p.connected).length,
      maxPlayers: 4,
      gamePhase: r.gamePhase,
    }))
    res.json(rooms)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch rooms' })
  }
})

app.post('/api/rooms', async (req, res) => {
  try {
    const { name, playerName } = req.body
    const roomId = uuidv4().slice(0, 6)
    const theme = PUZZLE_THEMES[Math.floor(Math.random() * PUZZLE_THEMES.length)]
    
    const cols = 4 + Math.floor(Math.random() * 2)
    const rows = 3 + Math.floor(Math.random() * 2)
    const totalPieces = cols * rows
    
    const pieces: PuzzlePiece[] = []
    for (let i = 0; i < totalPieces; i++) {
      const col = i % cols
      const row = Math.floor(i / cols)
      pieces.push({
        id: `piece-${i}`,
        index: i,
        correctX: col,
        correctY: row,
        currentX: Math.random() * (cols - 1),
        currentY: Math.random() * (rows - 1),
        rotation: 0,
        ownerId: null,
        placed: false,
      })
    }

    const room: Room = {
      id: roomId,
      name: name || `房间 ${roomId}`,
      players: [],
      pieces,
      puzzleTheme: theme,
      puzzleCols: cols,
      puzzleRows: rows,
      boardWidth: 800,
      boardHeight: 600,
      createdAt: Date.now(),
      gamePhase: 'waiting',
      roundTimer: 180,
    }

    rooms.set(roomId, room)
    chatHistory.set(roomId, [])
    
    await db.insert({ id: roomId, name: room.name, createdAt: room.createdAt })
    
    res.json({ roomId, theme, cols, rows })
  } catch (err) {
    res.status(500).json({ error: 'Failed to create room' })
  }
})

app.get('/api/rooms/:id', (req, res) => {
  const room = rooms.get(req.params.id)
  if (!room) {
    return res.status(404).json({ error: 'Room not found' })
  }
  res.json({
    id: room.id,
    name: room.name,
    playerCount: room.players.filter((p) => p.connected).length,
    maxPlayers: 4,
    gamePhase: room.gamePhase,
    puzzleTheme: room.puzzleTheme,
    puzzleCols: room.puzzleCols,
    puzzleRows: room.puzzleRows,
  })
})

function getRoomState(room: Room) {
  return {
    type: 'stateUpdate',
    roomId: room.id,
    gamePhase: room.gamePhase,
    roundTimer: room.roundTimer,
    players: room.players.map((p) => ({
      id: p.id,
      name: p.name,
      score: p.score,
      color: p.color,
      connected: p.connected,
    })),
    pieces: room.pieces.map((p) => ({
      id: p.id,
      index: p.index,
      correctX: p.correctX,
      correctY: p.correctY,
      currentX: p.currentX,
      currentY: p.currentY,
      rotation: p.rotation,
      ownerId: p.ownerId,
      placed: p.placed,
    })),
    puzzleTheme: room.puzzleTheme,
    puzzleCols: room.puzzleCols,
    puzzleRows: room.puzzleRows,
    boardWidth: room.boardWidth,
    boardHeight: room.boardHeight,
    progress: room.pieces.filter((p) => p.placed).length / room.pieces.length,
  }
}

function broadcastToRoom(roomId: string, message: any) {
  const data = JSON.stringify(message)
  for (const [ws, info] of wsToRoom.entries()) {
    if (info.roomId === roomId && ws.readyState === WebSocket.OPEN) {
      ws.send(data)
    }
  }
}

function assignPiecesToPlayer(room: Room, playerId: string) {
  const unassignedPieces = room.pieces.filter((p) => !p.ownerId && !p.placed)
  const players = room.players.filter((p) => p.connected)
  const piecesPerPlayer = Math.ceil(unassignedPieces.length / players.length)
  
  let assigned = 0
  for (const piece of unassignedPieces) {
    if (assigned >= piecesPerPlayer) break
    piece.ownerId = playerId
    assigned++
  }
}

wss.on('connection', (ws) => {
  let currentRoomId: string | null = null
  let currentPlayerId: string | null = null

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString())

      switch (message.type) {
        case 'joinRoom': {
          const { roomId, playerName } = message
          const room = rooms.get(roomId)

          if (!room) {
            ws.send(JSON.stringify({ type: 'error', message: '房间不存在' }))
            return
          }

          const connectedPlayers = room.players.filter((p) => p.connected)
          if (connectedPlayers.length >= 4) {
            ws.send(JSON.stringify({ type: 'error', message: '房间已满' }))
            return
          }

          const playerId = uuidv4()
          const colorIndex = room.players.length % PLAYER_COLORS.length
          const player: Player = {
            id: playerId,
            name: playerName || '匿名玩家',
            score: 0,
            color: PLAYER_COLORS[colorIndex],
            connected: true,
          }

          room.players.push(player)
          assignPiecesToPlayer(room, playerId)

          currentRoomId = roomId
          currentPlayerId = playerId
          wsToRoom.set(ws, { roomId, playerId })

          ws.send(
            JSON.stringify({
              type: 'roomJoined',
              playerId,
              playerColor: player.color,
              state: getRoomState(room),
              chatHistory: chatHistory.get(roomId) || [],
            })
          )

          broadcastToRoom(roomId, {
            type: 'playerJoined',
            player: {
              id: player.id,
              name: player.name,
              score: player.score,
              color: player.color,
            },
          })

          broadcastToRoom(roomId, getRoomState(room))
          break
        }

        case 'movePiece': {
          if (!currentRoomId || !currentPlayerId) return
          const room = rooms.get(currentRoomId)
          if (!room) return

          const { pieceId, x, y, rotation } = message
          const piece = room.pieces.find((p) => p.id === pieceId)
          
          if (piece && piece.ownerId === currentPlayerId && !piece.placed) {
            piece.currentX = x
            piece.currentY = y
            if (rotation !== undefined) piece.rotation = rotation

            broadcastToRoom(currentRoomId, {
              type: 'pieceMoved',
              pieceId,
              x,
              y,
              rotation: piece.rotation,
              playerId: currentPlayerId,
            })
          }
          break
        }

        case 'placePiece': {
          if (!currentRoomId || !currentPlayerId) return
          const room = rooms.get(currentRoomId)
          if (!room) return

          const { pieceId, x, y } = message
          const piece = room.pieces.find((p) => p.id === pieceId)
          
          if (!piece || piece.ownerId !== currentPlayerId || piece.placed) return

          const snapThreshold = 0.3
          const dx = Math.abs(x - piece.correctX)
          const dy = Math.abs(y - piece.correctY)

          if (dx < snapThreshold && dy < snapThreshold) {
            piece.placed = true
            piece.currentX = piece.correctX
            piece.currentY = piece.correctY

            const player = room.players.find((p) => p.id === currentPlayerId)
            if (player) {
              player.score += 10
            }

            broadcastToRoom(currentRoomId, {
              type: 'piecePlaced',
              pieceId,
              playerId: currentPlayerId,
              score: player?.score || 0,
              x: piece.correctX,
              y: piece.correctY,
            })

            const allPlaced = room.pieces.every((p) => p.placed)
            if (allPlaced) {
              room.gamePhase = 'finished'
              broadcastToRoom(currentRoomId, {
                type: 'gameFinished',
                players: room.players.map((p) => ({
                  id: p.id,
                  name: p.name,
                  score: p.score,
                  color: p.color,
                })),
              })
            }

            broadcastToRoom(currentRoomId, getRoomState(room))
          } else {
            ws.send(
              JSON.stringify({
                type: 'pieceRejected',
                pieceId,
                originalX: piece.currentX,
                originalY: piece.currentY,
              })
            )
          }
          break
        }

        case 'chatMessage': {
          if (!currentRoomId || !currentPlayerId) return
          const room = rooms.get(currentRoomId)
          if (!room) return

          const player = room.players.find((p) => p.id === currentPlayerId)
          if (!player) return

          const chatMsg: ChatMessage = {
            id: uuidv4(),
            playerId: currentPlayerId,
            playerName: player.name,
            content: message.content,
            timestamp: Date.now(),
          }

          const history = chatHistory.get(currentRoomId) || []
          history.push(chatMsg)
          if (history.length > 50) history.shift()
          chatHistory.set(currentRoomId, history)

          broadcastToRoom(currentRoomId, {
            type: 'chatMessage',
            message: chatMsg,
          })
          break
        }

        case 'startGame': {
          if (!currentRoomId || !currentPlayerId) return
          const room = rooms.get(currentRoomId)
          if (!room) return

          if (room.gamePhase === 'waiting') {
            room.gamePhase = 'countdown'
            broadcastToRoom(currentRoomId, {
              type: 'gameStarting',
              countdown: 3,
            })

            let countdown = 3
            const countdownInterval = setInterval(() => {
              countdown--
              broadcastToRoom(currentRoomId!, {
                type: 'countdown',
                value: countdown,
              })
              if (countdown <= 0) {
                clearInterval(countdownInterval)
                room.gamePhase = 'playing'
                broadcastToRoom(currentRoomId!, {
                  type: 'gameStarted',
                })
                broadcastToRoom(currentRoomId!, getRoomState(room))
              }
            }, 1000)
          }
          break
        }

        case 'requestState': {
          if (!currentRoomId) return
          const room = rooms.get(currentRoomId)
          if (!room) return
          ws.send(JSON.stringify(getRoomState(room)))
          break
        }
      }
    } catch (err) {
      console.error('WebSocket message error:', err)
    }
  })

  ws.on('close', () => {
    if (currentRoomId && currentPlayerId) {
      const room = rooms.get(currentRoomId)
      if (room) {
        const player = room.players.find((p) => p.id === currentPlayerId)
        if (player) {
          player.connected = false
          
          room.pieces.forEach((piece) => {
            if (piece.ownerId === currentPlayerId && !piece.placed) {
              piece.ownerId = null
            }
          })

          const connectedPlayers = room.players.filter((p) => p.connected)
          if (connectedPlayers.length === 0) {
            setTimeout(() => {
              const r = rooms.get(currentRoomId!)
              if (r && r.players.filter((p) => p.connected).length === 0) {
                rooms.delete(currentRoomId!)
                chatHistory.delete(currentRoomId!)
              }
            }, 60000)
          } else {
            broadcastToRoom(currentRoomId, {
              type: 'playerLeft',
              playerId: currentPlayerId,
            })
            broadcastToRoom(currentRoomId, getRoomState(room))
          }
        }
      }
      wsToRoom.delete(ws)
    }
  })
})

const PORT = 3001
server.listen(PORT, () => {
  console.log(`PuzzleHive server running on port ${PORT}`)
  console.log(`WebSocket: ws://localhost:${PORT}/ws`)
})
