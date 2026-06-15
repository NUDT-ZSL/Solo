import { useEffect, useRef, useCallback, useState } from 'react'
import { io, Socket } from 'socket.io-client'

interface LikeUpdateData {
  id: string
  hash?: string
  likes: number
}

interface CollisionData {
  compositionId: string
  chimeA: number
  chimeB: number
  position: { x: number; y: number; z: number }
}

export function useSocket() {
  const socketRef = useRef<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const likeListenersRef = useRef<Set<(data: LikeUpdateData) => void>>(new Set())
  const collisionListenersRef = useRef<Set<(data: CollisionData) => void>>(new Set())

  useEffect(() => {
    const socket = io({
      path: '/socket.io',
      transports: ['websocket', 'polling']
    })

    socketRef.current = socket

    socket.on('connect', () => {
      setIsConnected(true)
    })

    socket.on('disconnect', () => {
      setIsConnected(false)
    })

    socket.on('like:update', (data: LikeUpdateData) => {
      likeListenersRef.current.forEach((cb) => cb(data))
    })

    socket.on('collision:broadcast', (data: CollisionData) => {
      collisionListenersRef.current.forEach((cb) => cb(data))
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [])

  const onLikeUpdate = useCallback((callback: (data: LikeUpdateData) => void) => {
    likeListenersRef.current.add(callback)
    return () => likeListenersRef.current.delete(callback)
  }, [])

  const onCollision = useCallback((callback: (data: CollisionData) => void) => {
    collisionListenersRef.current.add(callback)
    return () => collisionListenersRef.current.delete(callback)
  }, [])

  const reportCollision = useCallback((data: CollisionData) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('collision:report', data)
    }
  }, [])

  return {
    isConnected,
    onLikeUpdate,
    onCollision,
    reportCollision
  }
}
