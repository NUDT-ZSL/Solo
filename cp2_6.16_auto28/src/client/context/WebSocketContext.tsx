import { createContext, useContext, useRef, useState, useEffect, ReactNode } from 'react'
import type { WebSocketMessage, ChatMessage } from '../../shared/types'

interface WebSocketContextType {
  isConnected: boolean
  onlineCount: number
  messages: ChatMessage[]
  sendMessage: (stageId: string, content: string) => void
  joinRoom: (stageId: string) => void
  leaveRoom: (stageId: string) => void
}

const WebSocketContext = createContext<WebSocketContextType | null>(null)

export const WebSocketProvider = ({ children }: { children: ReactNode }) => {
  const wsRef = useRef<WebSocket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [onlineCount, setOnlineCount] = useState(0)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const currentStageRef = useRef<string>('')

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${window.location.host}/ws`
    const ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      setIsConnected(true)
    }

    ws.onclose = () => {
      setIsConnected(false)
    }

    ws.onmessage = (event) => {
      const data: WebSocketMessage = JSON.parse(event.data)
      
      switch (data.type) {
        case 'onlineCount':
          if (data.data.count !== undefined) {
            setOnlineCount(data.data.count)
          }
          break
        case 'chat':
          if (data.data.message) {
            setMessages(prev => [...prev, data.data.message!])
          }
          break
      }
    }

    wsRef.current = ws

    return () => {
      ws.close()
    }
  }, [])

  const sendMessage = (stageId: string, content: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const userData = localStorage.getItem('festival_user_id')
      const nickname = localStorage.getItem('festival_nickname') || '匿名用户'
      const userId = userData || 'unknown'
      
      const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`
      
      const message: ChatMessage = {
        id: Date.now().toString(),
        userId,
        nickname,
        avatar,
        content,
        timestamp: new Date().toISOString(),
        stageId
      }

      wsRef.current.send(JSON.stringify({
        type: 'chat',
        data: {
          stageId,
          message
        }
      }))
    }
  }

  const joinRoom = (stageId: string) => {
    currentStageRef.current = stageId
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const userId = localStorage.getItem('festival_user_id') || 'unknown'
      const nickname = localStorage.getItem('festival_nickname') || '匿名用户'
      
      wsRef.current.send(JSON.stringify({
        type: 'join',
        data: {
          stageId,
          userId,
          nickname
        }
      }))
    }
  }

  const leaveRoom = (stageId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const userId = localStorage.getItem('festival_user_id') || 'unknown'
      
      wsRef.current.send(JSON.stringify({
        type: 'leave',
        data: {
          stageId,
          userId
        }
      }))
    }
    currentStageRef.current = ''
  }

  return (
    <WebSocketContext.Provider value={{ isConnected, onlineCount, messages, sendMessage, joinRoom, leaveRoom }}>
      {children}
    </WebSocketContext.Provider>
  )
}

export const useWebSocket = () => {
  const context = useContext(WebSocketContext)
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider')
  }
  return context
}
