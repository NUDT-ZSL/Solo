export interface Player {
  id: string
  name: string
  score: number
  color: string
  connected: boolean
}

export interface PuzzlePieceState {
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

export interface ChatMessage {
  id: string
  playerId: string
  playerName: string
  content: string
  timestamp: number
}

export interface GameState {
  roomId: string
  gamePhase: 'waiting' | 'countdown' | 'playing' | 'finished'
  roundTimer: number
  players: Player[]
  pieces: PuzzlePieceState[]
  puzzleTheme: string
  puzzleCols: number
  puzzleRows: number
  boardWidth: number
  boardHeight: number
  progress: number
}

type MessageHandler = (data: any) => void

class SocketService {
  private ws: WebSocket | null = null
  private handlers: Map<string, MessageHandler[]> = new Map()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
        const host = window.location.host
        const wsUrl = `${protocol}//${host}/ws`

        this.ws = new WebSocket(wsUrl)

        this.ws.onopen = () => {
          this.reconnectAttempts = 0
          resolve()
        }

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data)
            this.emit(message.type, message)
          } catch (err) {
            console.error('Failed to parse WebSocket message:', err)
          }
        }

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error)
          reject(error)
        }

        this.ws.onclose = () => {
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++
            setTimeout(() => {
              this.connect().catch(() => {})
            }, 1000 * this.reconnectAttempts)
          }
        }
      } catch (err) {
        reject(err)
      }
    })
  }

  disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  send(type: string, data: any = {}) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, ...data }))
    }
  }

  on(event: string, handler: MessageHandler) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, [])
    }
    this.handlers.get(event)!.push(handler)
    return () => this.off(event, handler)
  }

  off(event: string, handler: MessageHandler) {
    const handlers = this.handlers.get(event)
    if (handlers) {
      const index = handlers.indexOf(handler)
      if (index > -1) {
        handlers.splice(index, 1)
      }
    }
  }

  private emit(event: string, data: any) {
    const handlers = this.handlers.get(event)
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(data)
        } catch (err) {
          console.error(`Error in handler for event ${event}:`, err)
        }
      })
    }
  }

  joinRoom(roomId: string, playerName: string) {
    this.send('joinRoom', { roomId, playerName })
  }

  movePiece(pieceId: string, x: number, y: number, rotation?: number) {
    this.send('movePiece', { pieceId, x, y, rotation })
  }

  placePiece(pieceId: string, x: number, y: number) {
    this.send('placePiece', { pieceId, x, y })
  }

  sendChatMessage(content: string) {
    this.send('chatMessage', { content })
  }

  startGame() {
    this.send('startGame')
  }

  requestState() {
    this.send('requestState')
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN
  }
}

export const socketService = new SocketService()
