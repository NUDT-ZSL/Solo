export interface Position {
  x: number
  y: number
}

export interface Room {
  id: string
  x: number
  y: number
  doors: {
    north: boolean
    south: boolean
    east: boolean
    west: boolean
  }
  puzzleId?: string
  hasMemoryShard: boolean
  shardCollected: boolean
  isFinalRoom: boolean
  pedestals?: Pedestal[]
  portalActive?: boolean
}

export interface Pedestal {
  id: number
  x: number
  y: number
  activated: boolean
  order: number
}

export interface Player {
  x: number
  y: number
  vx: number
  vy: number
  width: number
  height: number
  onGround: boolean
  facingRight: boolean
  currentRoomId: string
  inventory: string[]
}

export type PuzzleType = 'mechanical' | 'password' | 'memory'

export interface Puzzle {
  id: string
  type: PuzzleType
  roomId: string
  solved: boolean
  data: any
}

export interface MechanicalPuzzleData {
  grid: number[][]
  targetPattern: number[][]
  currentPattern: number[][]
}

export interface PasswordPuzzleData {
  password: string
  hint: string
  currentInput: string
}

export interface MemoryPuzzleData {
  cards: MemoryCard[]
  flippedIndices: number[]
  matchedPairs: number
  totalPairs: number
}

export interface MemoryCard {
  id: number
  value: number
  flipped: boolean
  matched: boolean
}

export interface GameState {
  isPaused: boolean
  isGameOver: boolean
  isWin: boolean
  showPuzzle: boolean
  activePuzzleId: string | null
  transitionAlpha: number
  flashAlpha: number
  flashCount: number
}

export interface TimeLoopState {
  loopCount: number
  timeRemaining: number
  maxTime: number
  shardsCollected: string[]
}

export type GameEvent =
  | { type: 'PUZZLE_SOLVED'; puzzleId: string }
  | { type: 'SHARD_COLLECTED'; shardId: string }
  | { type: 'ROOM_CHANGED'; roomId: string }
  | { type: 'LOOP_RESET' }
  | { type: 'GAME_WIN' }
  | { type: 'PEDESTAL_ACTIVATED'; pedestalId: number; order: number }
