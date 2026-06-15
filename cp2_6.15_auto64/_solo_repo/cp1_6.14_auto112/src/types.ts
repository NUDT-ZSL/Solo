export interface Position {
  x: number
  y: number
}

export interface Piece {
  id: number
  color: string
  targetPosition: Position
  currentPosition: Position
  width: number
  height: number
  isPlaced: boolean
}

export interface GameState {
  score: number
  time: number
  isPlaying: boolean
  isCompleted: boolean
  currentPuzzleId: number
  pieces: Piece[]
}

export interface PuzzleData {
  id: number
  name: string
  rows: number
  cols: number
  colors: string[]
}

export type EventType =
  | 'piecePlaced'
  | 'gameCompleted'
  | 'scoreChanged'
  | 'timeChanged'
  | 'hintUsed'
  | 'triggerEffect'

export interface EffectEvent {
  type: 'completion'
  x: number
  y: number
  score: number
}
