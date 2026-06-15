export type ObjectType =
  | 'platform-rect'
  | 'platform-triangle'
  | 'trap-spike'
  | 'trap-moving'
  | 'player-start'
  | 'goal-flag'

export interface BaseObject {
  id: string
  type: ObjectType
  x: number
  y: number
  width: number
  height: number
  rotation: number
  color: string
}

export interface TrianglePlatform extends BaseObject {
  type: 'platform-triangle'
  baseWidth: number
  triangleHeight: number
}

export interface SpikeTrap extends BaseObject {
  type: 'trap-spike'
  spikeBaseWidth: number
  spikeHeight: number
}

export interface MovingPlatform extends BaseObject {
  type: 'trap-moving'
  moveRangeX: number
  moveRangeY: number
  moveSpeed: number
}

export type LevelObject = BaseObject | TrianglePlatform | SpikeTrap | MovingPlatform

export interface LevelData {
  version: string
  name: string
  objects: LevelObject[]
  createdAt?: string
  updatedAt?: string
}

export interface GameState {
  playerX: number
  playerY: number
  playerVX: number
  playerVY: number
  isOnGround: boolean
  isDead: boolean
  isWin: boolean
  deathFlashTime: number
}

export interface CollisionRect {
  x: number
  y: number
  width: number
  height: number
}

export const DEFAULT_COLOR = '#E94560'
export const TRIANGLE_DEFAULT_COLOR = '#4ECDC4'
export const SPIKE_DEFAULT_COLOR = '#FF6B6B'
export const GRID_SIZE = 40
export const MAX_HISTORY = 50
