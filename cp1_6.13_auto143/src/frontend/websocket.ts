export interface VoteOption {
  id: string
  text: string
  votes: number
}

export interface Vote {
  _id: string
  title: string
  options: VoteOption[]
  duration: number
  status: 'pending' | 'active' | 'ended'
  createdAt: number
  startedAt?: number
  endedAt?: number
  totalVotes: number
}

export interface WSMessage<T = unknown> {
  type: string
  data: T
  timestamp: number
}

type MessageHandler = (message: WSMessage) => void

class WebSocketClient {
  private ws: WebSocket | null = null
  private handlers: Map<string, Set<MessageHandler>> = new Map()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 10
  private reconnectDelay = 1000
  private url: string = ''
  private manuallyClosed = false

  connect(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.url = url
      this.manuallyClosed = false

      try {
        this.ws = new WebSocket(url)

        this.ws.onopen = () => {
          this.reconnectAttempts = 0
          this.reconnectDelay = 1000
          this.emit('connected', { type: 'connected', data: {}, timestamp: Date.now() })
          resolve()
        }

        this.ws.onmessage = (event) => {
          try {
            const message: WSMessage = JSON.parse(event.data)
            this.emit(message.type, message)
          } catch (e) {
            console.error('Parse message error:', e)
          }
        }

        this.ws.onclose = () => {
          this.emit('disconnected', { type: 'disconnected', data: {}, timestamp: Date.now() })
          if (!this.manuallyClosed) {
            this.tryReconnect()
          }
        }

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error)
          if (this.reconnectAttempts === 0) {
            reject(error)
          }
        }
      } catch (e) {
        reject(e)
      }
    })
  }

  private tryReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached')
      return
    }

    this.reconnectAttempts++
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, 10000)

    setTimeout(() => {
      console.log(`Reconnecting... attempt ${this.reconnectAttempts}`)
      this.connect(this.url).catch(() => {})
    }, this.reconnectDelay)
  }

  send(type: string, data: unknown) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, data }))
    } else {
      console.warn('WebSocket not connected')
    }
  }

  on(type: string, handler: MessageHandler): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set())
    }
    this.handlers.get(type)!.add(handler)

    return () => {
      this.handlers.get(type)?.delete(handler)
    }
  }

  private emit(type: string, message: WSMessage) {
    const handlers = this.handlers.get(type)
    if (handlers) {
      handlers.forEach(handler => handler(message))
    }

    const allHandlers = this.handlers.get('*')
    if (allHandlers) {
      allHandlers.forEach(handler => handler(message))
    }
  }

  close() {
    this.manuallyClosed = true
    if (this.ws) {
      this.ws.close()
    }
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN
  }
}

export const wsClient = new WebSocketClient()
