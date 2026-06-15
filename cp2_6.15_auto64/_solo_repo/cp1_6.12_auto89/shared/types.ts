export type Direction = 'up' | 'down' | 'left' | 'right'

export type SkillType = 'speed' | 'invisible' | 'trap' | 'laser'

export interface Position {
  x: number
  y: number
}

export interface SnakeSegment {
  x: number
  y: number
}

export interface Player {
  id: string
  nickname: string
  snake: SnakeSegment[]
  direction: Direction
  nextDirection: Direction
  color: string
  alive: boolean
  score: number
  skill: SkillType | null
  skillCooldown: number
  speedBoost: boolean
  invisible: boolean
  traps: Position[]
}

export interface Food {
  x: number
  y: number
  type: 'apple' | 'gem'
}

export interface SkillRune {
  x: number
  y: number
  type: SkillType
}

export interface Trap {
  x: number
  y: number
  ownerId: string
  duration: number
}

export interface Laser {
  startX: number
  startY: number
  direction: Direction
  length: number
  ownerId: string
  duration: number
}

export interface GameState {
  players: Map<string, Player>
  foods: Food[]
  skillRunes: SkillRune[]
  traps: Trap[]
  lasers: Laser[]
  gridSize: number
  gameOver: boolean
  winner: string | null
  tickCount: number
}

export interface RoomConfig {
  maxPlayers: number
  gridSize: number
  skillsEnabled: boolean
}

export interface Room {
  id: string
  hostId: string
  players: Map<string, { id: string; nickname: string; ready: boolean; color: string }>
  config: RoomConfig
  gameState: GameState | null
  status: 'waiting' | 'playing' | 'finished'
  countdown: number
}

export type WSMessageType =
  | 'join_room'
  | 'create_room'
  | 'leave_room'
  | 'player_ready'
  | 'update_config'
  | 'start_game'
  | 'game_state'
  | 'player_input'
  | 'use_skill'
  | 'room_info'
  | 'room_list'
  | 'get_room_list'
  | 'countdown'
  | 'game_over'

export interface WSMessage {
  type: WSMessageType
  data?: any
}
