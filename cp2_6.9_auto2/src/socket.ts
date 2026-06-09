import { io, Socket } from 'socket.io-client'
import type { Stroke, StickyNote, ServerEvent, User, WhiteboardState } from './types'

let socket: Socket | null = null
const eventListeners: Map<string, Set<(data: any) => void>> = new Map()

const SERVER_URL = 'http://localhost:3001'

export function connect(roomId: string = 'default'): Promise<{ state: WhiteboardState; users: User[]; selfId: string }> {
  return new Promise((resolve, reject) => {
    try {
      socket = io(SERVER_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 500,
        reconnectionAttempts: 10
      })

      socket.on('connect', () => {
        socket?.emit('room:join', { roomId })
      })

      socket.on('init', (data: { state: WhiteboardState; users: User[]; selfId: string }) => {
        resolve(data)
      })

      socket.on('error', (err: Error) => {
        reject(err)
      })

      socket.on('disconnect', () => {
        emitLocal('disconnect', null)
      })

      ;(['stroke:add', 'stroke:undo', 'stroke:redo', 'sticky:add', 'sticky:update', 'sticky:delete', 'user:join', 'user:leave'] as const).forEach((event) => {
        socket?.on(event, (data: any) => {
          emitLocal(event, data)
        })
      })

      startHeartbeat()
    } catch (e) {
      reject(e)
    }
  })
}

export function disconnect() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
  stopHeartbeat()
}

let heartbeatInterval: number | null = null
function startHeartbeat() {
  stopHeartbeat()
  heartbeatInterval = window.setInterval(() => {
    if (socket?.connected) {
      socket.emit('ping')
    }
  }, 25000)
}

function stopHeartbeat() {
  if (heartbeatInterval !== null) {
    clearInterval(heartbeatInterval)
    heartbeatInterval = null
  }
}

export function on<T = any>(event: string, callback: (data: T) => void): () => void {
  if (!eventListeners.has(event)) {
    eventListeners.set(event, new Set())
  }
  eventListeners.get(event)!.add(callback)
  return () => {
    eventListeners.get(event)?.delete(callback)
  }
}

function emitLocal(event: string, data: any) {
  eventListeners.get(event)?.forEach((cb) => cb(data))
}

export function sendStroke(stroke: Stroke) {
  socket?.emit('stroke:add', stroke)
}

export function sendUndo(userId: string, strokeId: string) {
  socket?.emit('stroke:undo', { userId, strokeId })
}

export function sendRedo(userId: string, stroke: Stroke) {
  socket?.emit('stroke:redo', { userId, stroke })
}

export function sendStickyAdd(note: StickyNote) {
  socket?.emit('sticky:add', note)
}

export function sendStickyUpdate(note: StickyNote) {
  socket?.emit('sticky:update', note)
}

export function sendStickyDelete(noteId: string) {
  socket?.emit('sticky:delete', noteId)
}
