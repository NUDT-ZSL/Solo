import { WebSocketServer, WebSocket } from 'ws'
import { RoomManager } from './roomManager'
import { GameEngine } from './gameEngine'
import type { WSMessage, Direction } from '../shared/types'

const PORT = parseInt(process.env.PORT || '8080')

const wss = new WebSocketServer({ port: PORT })
const roomManager = new RoomManager()
const gameEngines = new Map<string, GameEngine>()
const clientRooms = new Map<string, string>()
const clientIds = new Map<WebSocket, string>()

console.log(`WebSocket server running on port ${PORT}`)

wss.on('connection', (ws) => {
  const clientId = generateClientId()
  clientIds.set(ws, clientId)

  console.log(`Client connected: ${clientId}`)

  ws.on('message', (data) => {
    try {
      const message: WSMessage = JSON.parse(data.toString())
      handleMessage(ws, clientId, message)
    } catch (e) {
      console.error('Invalid message:', e)
    }
  })

  ws.on('close', () => {
    console.log(`Client disconnected: ${clientId}`)
    handleDisconnect(ws, clientId)
  })
})

function generateClientId(): string {
  return Math.random().toString(36).substring(2, 10)
}

function handleMessage(ws: WebSocket, clientId: string, message: WSMessage) {
  switch (message.type) {
    case 'get_room_list':
      handleGetRoomList(ws)
      break
    case 'create_room':
      handleCreateRoom(ws, clientId, message.data?.nickname)
      break
    case 'join_room':
      handleJoinRoom(ws, clientId, message.data?.roomId, message.data?.nickname)
      break
    case 'leave_room':
      handleLeaveRoom(ws, clientId)
      break
    case 'player_ready':
      handlePlayerReady(ws, clientId, message.data?.ready)
      break
    case 'update_config':
      handleUpdateConfig(ws, clientId, message.data)
      break
    case 'start_game':
      handleStartGame(ws, clientId)
      break
    case 'player_input':
      handlePlayerInput(clientId, message.data?.direction)
      break
    case 'use_skill':
      handleUseSkill(clientId)
      break
  }
}

function handleGetRoomList(ws: WebSocket) {
  const rooms = roomManager.getRoomList()
  sendMessage(ws, { type: 'room_list', data: rooms })
}

function handleCreateRoom(ws: WebSocket, clientId: string, nickname: string) {
  if (!nickname) {
    sendMessage(ws, { type: 'error', data: { message: 'Nickname required' } })
    return
  }

  const currentRoomId = clientRooms.get(clientId)
  if (currentRoomId) {
    handleLeaveRoom(ws, clientId)
  }

  const room = roomManager.createRoom(clientId, nickname)
  clientRooms.set(clientId, room.id)

  sendMessage(ws, { type: 'room_info', data: serializeRoom(room) })
  broadcastRoomInfo(room.id)
}

function handleJoinRoom(ws: WebSocket, clientId: string, roomId: string, nickname: string) {
  if (!roomId || !nickname) {
    sendMessage(ws, { type: 'error', data: { message: 'Room ID and nickname required' } })
    return
  }

  const currentRoomId = clientRooms.get(clientId)
  if (currentRoomId) {
    handleLeaveRoom(ws, clientId)
  }

  const room = roomManager.joinRoom(roomId.toUpperCase(), clientId, nickname)
  if (!room) {
    sendMessage(ws, { type: 'error', data: { message: 'Failed to join room' } })
    return
  }

  clientRooms.set(clientId, room.id)
  sendMessage(ws, { type: 'room_info', data: serializeRoom(room) })
  broadcastRoomInfo(room.id)
}

function handleLeaveRoom(ws: WebSocket, clientId: string) {
  const roomId = clientRooms.get(clientId)
  if (!roomId) return

  const room = roomManager.leaveRoom(roomId, clientId)
  clientRooms.delete(clientId)

  if (room) {
    broadcastRoomInfo(room.id)
  }

  sendMessage(ws, { type: 'left_room' })
}

function handlePlayerReady(ws: WebSocket, clientId: string, ready: boolean) {
  const roomId = clientRooms.get(clientId)
  if (!roomId) return

  const room = roomManager.setPlayerReady(roomId, clientId, ready)
  if (room) {
    broadcastRoomInfo(room.id)
  }
}

function handleUpdateConfig(ws: WebSocket, clientId: string, config: any) {
  const roomId = clientRooms.get(clientId)
  if (!roomId) return

  const room = roomManager.updateConfig(roomId, clientId, config)
  if (room) {
    broadcastRoomInfo(room.id)
  }
}

function handleStartGame(ws: WebSocket, clientId: string) {
  const roomId = clientRooms.get(clientId)
  if (!roomId) return

  const room = roomManager.getRoom(roomId)
  if (!room || room.hostId !== clientId) return
  if (!roomManager.isAllReady(roomId)) return

  const countdown = 3
  let count = countdown

  const countdownInterval = setInterval(() => {
    broadcastToRoom(roomId, { type: 'countdown', data: { count } })
    count--

    if (count < 0) {
      clearInterval(countdownInterval)
      startGame(roomId)
    }
  }, 1000)
}

function startGame(roomId: string) {
  const room = roomManager.getRoom(roomId)
  if (!room) return

  const gameState = roomManager.initGameState(roomId)
  if (!gameState) return

  const engine = new GameEngine(
    gameState,
    (state) => {
      broadcastToRoom(roomId, { type: 'game_state', data: state })
    },
    (winnerId) => {
      const room = roomManager.getRoom(roomId)
      if (room) {
        room.status = 'finished'
      }
      broadcastToRoom(roomId, { type: 'game_over', data: { winner: winnerId } })
    }
  )

  gameEngines.set(roomId, engine)
  engine.start()
}

function handlePlayerInput(clientId: string, direction: Direction) {
  const roomId = clientRooms.get(clientId)
  if (!roomId) return

  const engine = gameEngines.get(roomId)
  if (!engine) return

  engine.setDirection(clientId, direction)
}

function handleUseSkill(clientId: string) {
  const roomId = clientRooms.get(clientId)
  if (!roomId) return

  const engine = gameEngines.get(roomId)
  if (!engine) return

  engine.useSkill(clientId)
}

function handleDisconnect(ws: WebSocket, clientId: string) {
  const roomId = clientRooms.get(clientId)
  if (roomId) {
    roomManager.leaveRoom(roomId, clientId)
    clientRooms.delete(clientId)

    const engine = gameEngines.get(roomId)
    if (engine) {
    }

    const room = roomManager.getRoom(roomId)
    if (room) {
      broadcastRoomInfo(roomId)
    } else {
      gameEngines.delete(roomId)
    }
  }

  clientIds.delete(ws)
}

function serializeRoom(room: any) {
  return {
    id: room.id,
    hostId: room.hostId,
    players: Array.from(room.players.values()),
    config: room.config,
    status: room.status,
  }
}

function broadcastRoomInfo(roomId: string) {
  const room = roomManager.getRoom(roomId)
  if (!room) return

  const roomInfo = serializeRoom(room)
  broadcastToRoom(roomId, { type: 'room_info', data: roomInfo })
}

function broadcastToRoom(roomId: string, message: WSMessage) {
  const messageStr = JSON.stringify(message)

  for (const [ws, clientId] of clientIds) {
    const cRoomId = clientRooms.get(clientId)
    if (cRoomId === roomId) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(messageStr)
      }
    }
  }
}

function sendMessage(ws: WebSocket, message: WSMessage) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message))
  }
}
