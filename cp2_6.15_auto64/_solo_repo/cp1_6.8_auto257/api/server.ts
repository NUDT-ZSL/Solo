/**
 * local server entry file, for local development
 */
import { createServer } from 'http'
import { WebSocketServer, WebSocket } from 'ws'
import app from './app.js'
import type { WSMessage } from '../shared/types.js'
import {
  joinRoom,
  leaveRoom,
  addOperation,
  undoOperation,
  redoOperation,
  getOperations,
  getUsers,
  addChatMessage,
  getChatMessages,
  addEmoji,
} from './roomManager.js'

const PORT = process.env.PORT || 3001

const server = createServer(app)

const wss = new WebSocketServer({ server })

const connections = new Map<string, { ws: WebSocket; roomId: string }>()

function broadcast(roomId: string, message: WSMessage, excludeUserId?: string) {
  const data = JSON.stringify(message)
  for (const [uid, conn] of connections) {
    if (conn.roomId === roomId && uid !== excludeUserId && conn.ws.readyState === WebSocket.OPEN) {
      conn.ws.send(data)
    }
  }
}

wss.on('connection', (ws, req) => {
  const url = new URL(req.url || '', `http://${req.headers.host}`)
  const roomId = url.searchParams.get('roomId')
  const userId = url.searchParams.get('userId')

  if (!roomId || !userId) {
    ws.send(JSON.stringify({ type: 'error', message: 'Missing roomId or userId' }))
    ws.close()
    return
  }

  const result = joinRoom(roomId, userId)
  if (!result.success) {
    ws.send(JSON.stringify({ type: 'error', message: result.message }))
    ws.close()
    return
  }

  connections.set(userId, { ws, roomId })

  const syncMsg: WSMessage = {
    type: 'sync',
    roomId,
    operations: getOperations(roomId),
    messages: getChatMessages(roomId),
  }
  ws.send(JSON.stringify(syncMsg))

  const userListMsg: WSMessage = {
    type: 'user_list',
    roomId,
    users: getUsers(roomId),
  }
  broadcast(roomId, userListMsg)
  ws.send(JSON.stringify(userListMsg))

  ws.on('message', (raw) => {
    let msg: WSMessage
    try {
      msg = JSON.parse(raw.toString()) as WSMessage
    } catch {
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }))
      return
    }

    switch (msg.type) {
      case 'draw': {
        addOperation(msg.roomId, msg.operation)
        broadcast(msg.roomId, msg, userId)
        break
      }
      case 'undo': {
        const undone = undoOperation(msg.roomId, msg.operationId, msg.userId)
        if (undone) {
          broadcast(msg.roomId, msg)
        }
        break
      }
      case 'redo': {
        const redone = redoOperation(msg.roomId, msg.operation, msg.userId)
        if (redone) {
          broadcast(msg.roomId, msg)
        }
        break
      }
      case 'chat': {
        addChatMessage(msg.roomId, msg.message)
        broadcast(msg.roomId, msg)
        break
      }
      case 'emoji': {
        addEmoji(msg.roomId, msg.targetMsgId, msg.userId, msg.emoji)
        broadcast(msg.roomId, msg)
        break
      }
    }
  })

  ws.on('close', () => {
    connections.delete(userId)
    leaveRoom(roomId, userId)
    const userListMsg: WSMessage = {
      type: 'user_list',
      roomId,
      users: getUsers(roomId),
    }
    broadcast(roomId, userListMsg)
  })
})

server.listen(PORT, () => {
  console.log(`Server ready on port ${PORT}`)
})

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received')
  server.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('SIGINT signal received')
  server.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
})

export default app
