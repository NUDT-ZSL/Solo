import type { Player, PuzzlePiece, OperationLog } from '@/game/pieceUtils'
import { generateOperationId } from '@/game/pieceUtils'
import { useGameStore } from '@/game/gameStore'

type MessageType =
  | 'join_room'
  | 'leave_room'
  | 'room_state'
  | 'player_joined'
  | 'player_left'
  | 'piece_moved'
  | 'cursor_update'
  | 'game_start'
  | 'countdown_update'
  | 'sync_state'

interface SocketMessage {
  type: MessageType
  data: Record<string, unknown>
  timestamp: number
  operationId?: string
}

interface PendingOperation {
  operationId: string
  pieceId: number
  fromRow: number
  fromCol: number
  toRow: number
  toCol: number
  playerId: string
  timestamp: number
}

interface RoomState {
  roomId: string
  players: Player[]
  puzzleSize: number
  pieces: PuzzlePiece[]
  gamePhase: string
  countdown: number
  hostId: string
}

class SocketService {
  private ws: WebSocket | null = null
  private isSimulated: boolean = true
  private roomId: string = ''
  private playerId: string = ''
  private pendingOperations: Map<string, PendingOperation> = new Map()
  private stateVersion: number = 0
  private listeners: Map<MessageType, ((data: Record<string, unknown>) => void)[]> = new Map()
  private simulatedPlayers: Map<string, Player> = new Map()
  private simulatedRooms: Map<string, RoomState> = new Map()
  private heartbeatTimer: number | null = null

  constructor() {
    this.playerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  getPlayerId(): string {
    return this.playerId
  }

  setSimulatedMode(simulated: boolean): void {
    this.isSimulated = simulated
  }

  connect(url?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isSimulated || !url) {
        this.isSimulated = true
        console.log('[SocketService] Running in simulated mode')
        setTimeout(() => resolve(), 100)
        return
      }

      try {
        this.ws = new WebSocket(url)
        this.ws.onopen = () => {
          console.log('[SocketService] Connected')
          this.startHeartbeat()
          resolve()
        }
        this.ws.onmessage = (event) => {
          const message: SocketMessage = JSON.parse(event.data)
          this.handleMessage(message)
        }
        this.ws.onerror = (error) => {
          console.error('[SocketService] Error:', error)
          reject(error)
        }
        this.ws.onclose = () => {
          console.log('[SocketService] Disconnected')
          this.stopHeartbeat()
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = window.setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }))
      }
    }, 30000)
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  async createRoom(playerName: string, puzzleSize: number = 4): Promise<string> {
    const roomId = Math.random().toString(36).substr(2, 6).toUpperCase()
    await this.joinRoom(roomId, playerName, puzzleSize)
    return roomId
  }

  async joinRoom(roomId: string, playerName: string, puzzleSize: number = 4): Promise<void> {
    this.roomId = roomId

    const player: Player = {
      id: this.playerId,
      name: playerName,
      avatarData: '',
      color: this.getPlayerColor(this.playerId),
      cursorX: 0,
      cursorY: 0
    }

    useGameStore.getState().setCurrentPlayer(player)
    useGameStore.getState().setRoomId(roomId)

    if (this.isSimulated) {
      await this.simulatedJoinRoom(roomId, player, puzzleSize)
      return
    }

    this.sendMessage('join_room', {
      roomId,
      player,
      puzzleSize
    })
  }

  private async simulatedJoinRoom(roomId: string, player: Player, puzzleSize: number): Promise<void> {
    const existingRoom = this.simulatedRooms.get(roomId)

    if (!existingRoom) {
      const initialPieces = useGameStore.getState().pieces.length > 0
        ? useGameStore.getState().pieces
        : []

      this.simulatedRooms.set(roomId, {
        roomId,
        players: [player],
        puzzleSize,
        pieces: initialPieces,
        gamePhase: 'lobby',
        countdown: 30,
        hostId: player.id
      })

      const botNames = ['AI助手', '协作精灵', '拼图达人', '玩家BOT']
      for (let i = 0; i < 2; i++) {
        const botId = `bot_${i}_${Date.now()}`
        const botPlayer: Player = {
          id: botId,
          name: botNames[i],
          avatarData: '',
          color: this.getPlayerColor(botId),
          cursorX: 0,
          cursorY: 0
        }
        this.simulatedPlayers.set(botId, botPlayer)
        setTimeout(() => {
          this.simulatedPlayerJoin(roomId, botPlayer)
        }, (i + 1) * 1500)
      }
    } else {
      if (existingRoom.players.length >= 4) {
        throw new Error('房间已满')
      }
      existingRoom.players.push(player)
      this.notifyPlayerJoined(player)
    }

    setTimeout(() => {
      const room = this.simulatedRooms.get(roomId)
      if (room && room.players.length >= 2) {
        this.startSimulatedCountdown(roomId)
      }
    }, 2000)

    this.notifyRoomState()
  }

  private simulatedPlayerJoin(roomId: string, player: Player): void {
    const room = this.simulatedRooms.get(roomId)
    if (!room || room.players.length >= 4) return

    room.players.push(player)
    this.notifyPlayerJoined(player)
    this.notifyRoomState()

    if (room.players.length >= 2 && room.gamePhase === 'lobby') {
      this.startSimulatedCountdown(roomId)
    }
  }

  private startSimulatedCountdown(roomId: string): void {
    const room = this.simulatedRooms.get(roomId)
    if (!room) return

    room.gamePhase = 'countdown'
    room.countdown = 30
    useGameStore.getState().setGamePhase('countdown')
    this.notifyRoomState()

    const countdownInterval = setInterval(() => {
      const currentRoom = this.simulatedRooms.get(roomId)
      if (!currentRoom) {
        clearInterval(countdownInterval)
        return
      }

      currentRoom.countdown--
      useGameStore.getState().setCountdown(currentRoom.countdown)
      this.notifyCountdownUpdate(currentRoom.countdown)

      if (currentRoom.countdown <= 0) {
        clearInterval(countdownInterval)
        this.startSimulatedGame(roomId)
      }
    }, 1000)
  }

  private startSimulatedGame(roomId: string): void {
    const room = this.simulatedRooms.get(roomId)
    if (!room) return

    useGameStore.getState().initGame(room.puzzleSize)
    room.pieces = useGameStore.getState().pieces
    room.gamePhase = 'playing'
    useGameStore.getState().setGamePhase('playing')
    this.notifyGameStart(room.puzzleSize)
    this.notifyRoomState()
    this.startSimulatedBotMoves(roomId)
  }

  private startSimulatedBotMoves(roomId: string): void {
    const moveInterval = setInterval(() => {
      const room = this.simulatedRooms.get(roomId)
      if (!room || room.gamePhase !== 'playing') {
        clearInterval(moveInterval)
        return
      }

      const unplacedPieces = room.pieces.filter(p => !p.isPlaced)
      if (unplacedPieces.length === 0) {
        clearInterval(moveInterval)
        return
      }

      if (Math.random() > 0.4) return

      const botIds = Array.from(this.simulatedPlayers.keys())
      const randomBotId = botIds[Math.floor(Math.random() * botIds.length)]
      const randomPiece = unplacedPieces[Math.floor(Math.random() * unplacedPieces.length)]

      const willSucceed = Math.random() > 0.3
      let toRow: number, toCol: number

      if (willSucceed) {
        toRow = randomPiece.correctRow
        toCol = randomPiece.correctCol
      } else {
        do {
          toRow = Math.floor(Math.random() * room.puzzleSize)
          toCol = Math.floor(Math.random() * room.puzzleSize)
        } while (room.pieces.some(p => p.row === toRow && p.col === toCol && !p.isPlaced && p.id !== randomPiece.id))
      }

      this.handleRemoteMove({
        operationId: generateOperationId(),
        pieceId: randomPiece.id,
        fromRow: randomPiece.row,
        fromCol: randomPiece.col,
        toRow,
        toCol,
        playerId: randomBotId,
        timestamp: Date.now(),
        success: willSucceed
      }, willSucceed)
    }, 3000)
  }

  private notifyPlayerJoined(player: Player): void {
    useGameStore.getState().addPlayer(player)
    this.emit('player_joined', { player })
  }

  private notifyRoomState(): void {
    const room = this.simulatedRooms.get(this.roomId)
    if (!room) return

    this.emit('room_state', {
      roomId: room.roomId,
      players: room.players,
      puzzleSize: room.puzzleSize,
      gamePhase: room.gamePhase,
      countdown: room.countdown,
      hostId: room.hostId
    })
  }

  private notifyCountdownUpdate(countdown: number): void {
    this.emit('countdown_update', { countdown })
  }

  private notifyGameStart(puzzleSize: number): void {
    this.emit('game_start', { puzzleSize })
  }

  leaveRoom(): void {
    if (this.isSimulated) {
      const room = this.simulatedRooms.get(this.roomId)
      if (room) {
        room.players = room.players.filter(p => p.id !== this.playerId)
        if (room.players.length === 0) {
          this.simulatedRooms.delete(this.roomId)
        }
      }
      this.simulatedPlayers.clear()
      useGameStore.getState().resetGame()
      return
    }

    this.sendMessage('leave_room', {
      roomId: this.roomId,
      playerId: this.playerId
    })
  }

  sendMove(pieceId: number, fromRow: number, fromCol: number, toRow: number, toCol: number, success: boolean): void {
    const operationId = generateOperationId()
    const operation: PendingOperation = {
      operationId,
      pieceId,
      fromRow,
      fromCol,
      toRow,
      toCol,
      playerId: this.playerId,
      timestamp: Date.now()
    }

    this.pendingOperations.set(operationId, operation)
    this.stateVersion++

    const log: OperationLog = {
      id: operationId,
      playerId: this.playerId,
      pieceId,
      fromRow,
      fromCol,
      toRow,
      toCol,
      timestamp: Date.now(),
      success
    }
    useGameStore.getState().addOperationLog(log)

    if (this.isSimulated) {
      this.broadcastSimulatedMove(operation, success)
      return
    }

    this.sendMessage('piece_moved', {
      operationId,
      pieceId,
      fromRow,
      fromCol,
      toRow,
      toCol,
      playerId: this.playerId,
      success,
      stateVersion: this.stateVersion
    })
  }

  private broadcastSimulatedMove(operation: PendingOperation, success: boolean): void {
    const room = this.simulatedRooms.get(this.roomId)
    if (!room) return

    const piece = room.pieces.find(p => p.id === operation.pieceId)
    if (piece) {
      piece.row = operation.toRow
      piece.col = operation.toCol
      piece.isPlaced = success
    }

    setTimeout(() => {
      this.emit('piece_moved', {
        ...operation,
        success
      })
    }, 100)
  }

  sendCursorUpdate(x: number, y: number): void {
    if (this.isSimulated) return

    this.sendMessage('cursor_update', {
      playerId: this.playerId,
      x,
      y
    })
  }

  private handleMessage(message: SocketMessage): void {
    console.log('[SocketService] Received:', message.type)

    switch (message.type) {
      case 'room_state':
        this.handleRoomState(message.data)
        break
      case 'player_joined':
        this.handlePlayerJoined(message.data)
        break
      case 'player_left':
        this.handlePlayerLeft(message.data)
        break
      case 'piece_moved':
        this.handlePieceMoved(message.data)
        break
      case 'cursor_update':
        this.handleCursorUpdate(message.data)
        break
      case 'game_start':
        this.handleGameStart(message.data)
        break
      case 'countdown_update':
        this.handleCountdownUpdate(message.data)
        break
      case 'sync_state':
        this.handleSyncState(message.data)
        break
    }

    this.emit(message.type, message.data)
  }

  private handleRoomState(data: Record<string, unknown>): void {
    const players = data.players as Player[]
    players.forEach(p => useGameStore.getState().addPlayer(p))
  }

  private handlePlayerJoined(data: Record<string, unknown>): void {
    const player = data.player as Player
    useGameStore.getState().addPlayer(player)
  }

  private handlePlayerLeft(data: Record<string, unknown>): void {
    const playerId = data.playerId as string
    useGameStore.getState().removePlayer(playerId)
  }

  private handlePieceMoved(data: Record<string, unknown>): void {
    const operation = data as unknown as PendingOperation & { success: boolean; operationId: string }

    if (operation.playerId === this.playerId) {
      this.pendingOperations.delete(operation.operationId)
      return
    }

    this.resolveConflict(operation)
    this.handleRemoteMove(operation, operation.success)
  }

  private resolveConflict(incomingOp: PendingOperation & { success: boolean }): void {
    const pendingOps = Array.from(this.pendingOperations.values())

    for (const pendingOp of pendingOps) {
      if (pendingOp.pieceId === incomingOp.pieceId) {
        if (pendingOp.timestamp < incomingOp.timestamp) {
          console.log('[OT] Remote operation takes precedence, reverting local')
          const piece = useGameStore.getState().pieces.find(p => p.id === pendingOp.pieceId)
          if (piece) {
            useGameStore.getState().movePieceRemote(
              pendingOp.pieceId,
              pendingOp.fromRow,
              pendingOp.fromCol,
              pendingOp.playerId,
              false
            )
          }
          this.pendingOperations.delete(pendingOp.operationId)
        } else {
          console.log('[OT] Local operation takes precedence')
        }
      }

      if (pendingOp.toRow === incomingOp.toRow && pendingOp.toCol === incomingOp.toCol) {
        if (pendingOp.timestamp < incomingOp.timestamp) {
          console.log('[OT] Position conflict, reverting local')
          const piece = useGameStore.getState().pieces.find(p => p.id === pendingOp.pieceId)
          if (piece) {
            useGameStore.getState().movePieceRemote(
              pendingOp.pieceId,
              pendingOp.fromRow,
              pendingOp.fromCol,
              pendingOp.playerId,
              false
            )
          }
          this.pendingOperations.delete(pendingOp.operationId)
        }
      }
    }
  }

  private handleRemoteMove(operation: PendingOperation & { success: boolean }, success: boolean): void {
    const room = this.simulatedRooms.get(this.roomId)
    if (room) {
      const piece = room.pieces.find(p => p.id === operation.pieceId)
      if (piece) {
        piece.row = operation.toRow
        piece.col = operation.toCol
        piece.isPlaced = success
      }
    }

    useGameStore.getState().movePieceRemote(
      operation.pieceId,
      operation.toRow,
      operation.toCol,
      operation.playerId,
      success
    )

    const log: OperationLog = {
      id: operation.operationId || generateOperationId(),
      playerId: operation.playerId,
      pieceId: operation.pieceId,
      fromRow: operation.fromRow,
      fromCol: operation.fromCol,
      toRow: operation.toRow,
      toCol: operation.toCol,
      timestamp: operation.timestamp,
      success
    }
    useGameStore.getState().addOperationLog(log)

    this.emit('piece_moved', { ...operation, success })
  }

  private handleCursorUpdate(data: Record<string, unknown>): void {
    const { playerId, x, y } = data as { playerId: string; x: number; y: number }
    useGameStore.getState().updatePlayerCursor(playerId, x, y)
  }

  private handleGameStart(data: Record<string, unknown>): void {
    const { puzzleSize } = data as { puzzleSize: number }
    useGameStore.getState().initGame(puzzleSize)
    useGameStore.getState().setGamePhase('playing')
  }

  private handleCountdownUpdate(data: Record<string, unknown>): void {
    const { countdown } = data as { countdown: number }
    useGameStore.getState().setCountdown(countdown)
  }

  private handleSyncState(data: Record<string, unknown>): void {
    const { pieces, stateVersion } = data as { pieces: PuzzlePiece[]; stateVersion: number }
    if (stateVersion > this.stateVersion) {
      this.stateVersion = stateVersion
      useGameStore.setState({ pieces })
    }
  }

  private sendMessage(type: MessageType, data: Record<string, unknown>): void {
    const message: SocketMessage = {
      type,
      data,
      timestamp: Date.now()
    }

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    }
  }

  on<T extends Record<string, unknown>>(type: MessageType, callback: (data: T) => void): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, [])
    }
    this.listeners.get(type)!.push(callback as (data: Record<string, unknown>) => void)
  }

  off(type: MessageType, callback: (data: Record<string, unknown>) => void): void {
    const listeners = this.listeners.get(type)
    if (listeners) {
      const index = listeners.indexOf(callback)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }

  private emit(type: MessageType, data: Record<string, unknown>): void {
    const listeners = this.listeners.get(type)
    if (listeners) {
      listeners.forEach(callback => callback(data))
    }
  }

  private getPlayerColor(playerId: string): string {
    const colors = ['#c084fc', '#06b6d4', '#f472b6', '#22d3ee', '#a78bfa', '#fb7185']
    let hash = 0
    for (let i = 0; i < playerId.length; i++) {
      hash = playerId.charCodeAt(i) + ((hash << 5) - hash)
    }
    return colors[Math.abs(hash) % colors.length]
  }

  disconnect(): void {
    this.leaveRoom()
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.stopHeartbeat()
    this.listeners.clear()
    this.pendingOperations.clear()
  }
}

export const socketService = new SocketService()
