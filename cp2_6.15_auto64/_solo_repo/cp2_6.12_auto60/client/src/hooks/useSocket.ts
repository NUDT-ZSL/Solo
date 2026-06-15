import { useEffect, useRef, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import type { MapNode } from '@/types'

interface SocketHandlers {
  onNodeCreate?: (node: MapNode) => void
  onNodeUpdate?: (node: MapNode) => void
  onNodeDelete?: (nodeId: string) => void
  onNodeMove?: (nodeId: string, x: number, y: number) => void
  onInvite?: (data: { mapId: string; mapTitle: string; from: string }) => void
}

export function useSocket(mapId?: string) {
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    socketRef.current = io({
      transports: ['websocket', 'polling']
    })

    if (mapId) {
      socketRef.current.emit('join-map', mapId)
    }

    return () => {
      if (mapId) {
        socketRef.current?.emit('leave-map', mapId)
      }
      socketRef.current?.disconnect()
      socketRef.current = null
    }
  }, [mapId])

  const on = useCallback((handlers: SocketHandlers) => {
    const socket = socketRef.current
    if (!socket) return

    if (handlers.onNodeCreate) {
      socket.on('node:create', handlers.onNodeCreate)
    }
    if (handlers.onNodeUpdate) {
      socket.on('node:update', handlers.onNodeUpdate)
    }
    if (handlers.onNodeDelete) {
      socket.on('node:delete', handlers.onNodeDelete)
    }
    if (handlers.onNodeMove) {
      socket.on('node:move', handlers.onNodeMove)
    }
    if (handlers.onInvite) {
      socket.on('map:invite', handlers.onInvite)
    }

    return () => {
      if (handlers.onNodeCreate) socket.off('node:create', handlers.onNodeCreate)
      if (handlers.onNodeUpdate) socket.off('node:update', handlers.onNodeUpdate)
      if (handlers.onNodeDelete) socket.off('node:delete', handlers.onNodeDelete)
      if (handlers.onNodeMove) socket.off('node:move', handlers.onNodeMove)
      if (handlers.onInvite) socket.off('map:invite', handlers.onInvite)
    }
  }, [])

  const emitNodeCreate = useCallback(
    (node: MapNode) => {
      if (mapId) {
        socketRef.current?.emit('node:create', { mapId, node })
      }
    },
    [mapId]
  )

  const emitNodeUpdate = useCallback(
    (node: MapNode) => {
      if (mapId) {
        socketRef.current?.emit('node:update', { mapId, node })
      }
    },
    [mapId]
  )

  const emitNodeDelete = useCallback(
    (nodeId: string) => {
      if (mapId) {
        socketRef.current?.emit('node:delete', { mapId, nodeId })
      }
    },
    [mapId]
  )

  const emitNodeMove = useCallback(
    (nodeId: string, x: number, y: number) => {
      if (mapId) {
        socketRef.current?.emit('node:move', { mapId, nodeId, x, y })
      }
    },
    [mapId]
  )

  const emitInvite = useCallback(
    (userId: string, mapTitle: string) => {
      if (mapId) {
        socketRef.current?.emit('map:invite', { mapId, userId, mapTitle })
      }
    },
    [mapId]
  )

  return {
    socket: socketRef.current,
    on,
    emitNodeCreate,
    emitNodeUpdate,
    emitNodeDelete,
    emitNodeMove,
    emitInvite
  }
}
