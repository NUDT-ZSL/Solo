import { v4 as uuidv4 } from 'uuid'
import type { Room, RoomConfig, Player, GameState, Direction } from '../shared/types'

const PLAYER_COLORS = ['#00ff88', '#ff6b6b', '#4ecdc4', '#ffe66d']

export class RoomManager {
  private rooms: Map<string, Room> = new Map()

  createRoom(hostId: string, nickname: string): Room {
    const roomId = this.generateRoomId()
    const color = PLAYER_COLORS[0]

    const room: Room = {
      id: roomId,
      hostId,
      players: new Map(),
      config: {
        maxPlayers: 2,
        gridSize: 16,
        skillsEnabled: true,
      },
      gameState: null,
      status: 'waiting',
      countdown: 0,
    }

    room.players.set(hostId, {
      id: hostId,
      nickname,
      ready: false,
      color,
    })

    this.rooms.set(roomId, room)
    return room
  }

  joinRoom(roomId: string, playerId: string, nickname: string): Room | null {
    const room = this.rooms.get(roomId)
    if (!room) return null
    if (room.players.size >= room.config.maxPlayers) return null
    if (room.status !== 'waiting') return null

    const usedColors = Array.from(room.players.values()).map((p) => p.color)
    const color = PLAYER_COLORS.find((c) => !usedColors.includes(c)) || PLAYER_COLORS[0]

    room.players.set(playerId, {
      id: playerId,
      nickname,
      ready: false,
      color,
    })

    return room
  }

  leaveRoom(roomId: string, playerId: string): Room | null {
    const room = this.rooms.get(roomId)
    if (!room) return null

    room.players.delete(playerId)

    if (room.players.size === 0) {
      this.rooms.delete(roomId)
      return null
    }

    if (room.hostId === playerId) {
      room.hostId = Array.from(room.players.keys())[0]
    }

    return room
  }

  setPlayerReady(roomId: string, playerId: string, ready: boolean): Room | null {
    const room = this.rooms.get(roomId)
    if (!room) return null

    const player = room.players.get(playerId)
    if (player) {
      player.ready = ready
    }

    return room
  }

  updateConfig(roomId: string, playerId: string, config: Partial<RoomConfig>): Room | null {
    const room = this.rooms.get(roomId)
    if (!room) return null
    if (room.hostId !== playerId) return null
    if (room.status !== 'waiting') return null

    if (config.maxPlayers !== undefined) {
      config.maxPlayers = Math.max(2, Math.min(4, config.maxPlayers))
      if (room.players.size > config.maxPlayers) return room
    }
    if (config.gridSize !== undefined) {
      config.gridSize = Math.max(12, Math.min(20, config.gridSize))
    }

    room.config = { ...room.config, ...config }
    return room
  }

  getRoom(roomId: string): Room | null {
    return this.rooms.get(roomId) || null
  }

  getRoomList(): { id: string; playerCount: number; maxPlayers: number; status: string }[] {
    return Array.from(this.rooms.values()).map((room) => ({
      id: room.id,
      playerCount: room.players.size,
      maxPlayers: room.config.maxPlayers,
      status: room.status,
    }))
  }

  isAllReady(roomId: string): boolean {
    const room = this.rooms.get(roomId)
    if (!room) return false
    if (room.players.size < 2) return false
    return Array.from(room.players.values()).every((p) => p.ready)
  }

  private generateRoomId(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase()
  }

  initGameState(roomId: string): GameState | null {
    const room = this.rooms.get(roomId)
    if (!room) return null

    const gridSize = room.config.gridSize
    const players = new Map<string, Player>()
    const playerCount = room.players.size

    const positions = this.getStartPositions(playerCount, gridSize)
    const directions: Direction[] = ['right', 'left', 'down', 'up']

    let idx = 0
    for (const [playerId, playerInfo] of room.players) {
      const pos = positions[idx]
      const dir = directions[idx % 4]
      const snake = this.createSnake(pos.x, pos.y, dir, 3)

      players.set(playerId, {
        id: playerId,
        nickname: playerInfo.nickname,
        snake,
        direction: dir,
        nextDirection: dir,
        color: playerInfo.color,
        alive: true,
        score: 3,
        skill: null,
        skillCooldown: 0,
        speedBoost: false,
        invisible: false,
        traps: [],
      })
      idx++
    }

    const foods: { x: number; y: number; type: 'apple' | 'gem' }[] = []
    for (let i = 0; i < 5; i++) {
      const food = this.spawnFood(gridSize, players, foods)
      if (food) foods.push(food)
    }

    room.gameState = {
      players,
      foods,
      skillRunes: [],
      traps: [],
      lasers: [],
      gridSize,
      gameOver: false,
      winner: null,
      tickCount: 0,
    }

    room.status = 'playing'
    return room.gameState
  }

  private createSnake(headX: number, headY: number, direction: Direction, length: number) {
    const segments = []
    let dx = 0,
      dy = 0
    if (direction === 'right') dx = -1
    if (direction === 'left') dx = 1
    if (direction === 'up') dy = 1
    if (direction === 'down') dy = -1

    for (let i = 0; i < length; i++) {
      segments.push({ x: headX + dx * i, y: headY + dy * i })
    }
    return segments
  }

  private getStartPositions(count: number, gridSize: number) {
    const center = Math.floor(gridSize / 2)
    const offset = Math.floor(gridSize / 4)
    const positions = [
      { x: offset, y: center },
      { x: gridSize - offset - 1, y: center },
      { x: center, y: offset },
      { x: center, y: gridSize - offset - 1 },
    ]
    return positions.slice(0, count)
  }

  private spawnFood(
    gridSize: number,
    players: Map<string, Player>,
    existingFoods: { x: number; y: number }[]
  ): { x: number; y: number; type: 'apple' | 'gem' } | null {
    const occupied = new Set<string>()

    for (const player of players.values()) {
      for (const seg of player.snake) {
        occupied.add(`${seg.x},${seg.y}`)
      }
    }

    for (const food of existingFoods) {
      occupied.add(`${food.x},${food.y}`)
    }

    if (occupied.size >= gridSize * gridSize * 0.8) return null

    let x, y
    let attempts = 0
    do {
      x = Math.floor(Math.random() * gridSize)
      y = Math.floor(Math.random() * gridSize)
      attempts++
    } while (occupied.has(`${x},${y}`) && attempts < 100)

    if (attempts >= 100) return null

    return {
      x,
      y,
      type: Math.random() < 0.8 ? 'apple' : 'gem',
    }
  }
}
