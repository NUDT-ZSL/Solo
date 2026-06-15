import { WebSocketServer, WebSocket } from 'ws'
import type { WebSocketMessage, ChatMessage } from '../shared/types'

interface ExtendedWebSocket extends WebSocket {
  userId?: string
  nickname?: string
  stageId?: string
}

interface Room {
  users: Set<string>
  messages: ChatMessage[]
}

const rooms = new Map<string, Room>()
const userSockets = new Map<string, ExtendedWebSocket>()

export const initSocketManager = (wss: WebSocketServer) => {
  wss.on('connection', (ws: ExtendedWebSocket) => {
    console.log('New client connected')

    ws.on('message', (data) => {
      try {
        const message: WebSocketMessage = JSON.parse(data.toString())
        handleMessage(ws, message)
      } catch (error) {
        console.error('Error parsing message:', error)
      }
    })

    ws.on('close', () => {
      console.log('Client disconnected')
      if (ws.userId && ws.stageId) {
        handleLeave(ws, ws.stageId, ws.userId)
      }
      if (ws.userId) {
        userSockets.delete(ws.userId)
      }
      broadcastOnlineCount()
    })
  })
}

const handleMessage = (ws: ExtendedWebSocket, message: WebSocketMessage) => {
  switch (message.type) {
    case 'join':
      if (message.data.stageId && message.data.userId) {
        ws.userId = message.data.userId
        ws.nickname = message.data.nickname
        ws.stageId = message.data.stageId
        handleJoin(ws, message.data.stageId, message.data.userId, message.data.nickname)
      }
      break
    case 'leave':
      if (message.data.stageId && message.data.userId) {
        handleLeave(ws, message.data.stageId, message.data.userId)
      }
      break
    case 'chat':
      if (message.data.message) {
        handleChat(message.data.message)
      }
      break
  }
}

const handleJoin = (ws: ExtendedWebSocket, stageId: string, userId: string, nickname?: string) => {
  if (!rooms.has(stageId)) {
    rooms.set(stageId, { users: new Set(), messages: [] })
  }
  
  const room = rooms.get(stageId)!
  room.users.add(userId)
  userSockets.set(userId, ws)
  
  console.log(`User ${nickname || userId} joined stage ${stageId}`)
  broadcastOnlineCount()
}

const handleLeave = (ws: ExtendedWebSocket, stageId: string, userId: string) => {
  const room = rooms.get(stageId)
  if (room) {
    room.users.delete(userId)
    if (room.users.size === 0) {
      rooms.delete(stageId)
    }
  }
  
  console.log(`User ${userId} left stage ${stageId}`)
  broadcastOnlineCount()
}

const handleChat = (message: ChatMessage) => {
  const room = rooms.get(message.stageId)
  if (room) {
    room.messages.push(message)
    if (room.messages.length > 100) {
      room.messages.shift()
    }
  }

  const response: WebSocketMessage = {
    type: 'chat',
    data: { message }
  }

  userSockets.forEach((socket, userId) => {
    if (socket.stageId === message.stageId && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(response))
    }
  })
}

const broadcastOnlineCount = () => {
  let totalOnline = 0
  rooms.forEach(room => {
    totalOnline += room.users.size
  })

  const response: WebSocketMessage = {
    type: 'onlineCount',
    data: { count: totalOnline }
  }

  userSockets.forEach(socket => {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(response))
    }
  })
}

export const getOnlineCount = (): number => {
  let total = 0
  rooms.forEach(room => {
    total += room.users.size
  })
  return total
}

export const getRoomOnlineCount = (stageId: string): number => {
  const room = rooms.get(stageId)
  return room ? room.users.size : 0
}
