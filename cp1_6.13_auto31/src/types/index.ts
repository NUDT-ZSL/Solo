export type ElementType = 'ground' | 'movingPlatform' | 'spike' | 'flag' | 'slime' | 'dragon'

export interface LevelElement {
  id: string
  type: ElementType
  x: number
  y: number
  width: number
  height: number
}

export interface EnemyEntity extends LevelElement {
  enemyType: 'slime' | 'dragon'
  speed: number
  patrolInterval: number
  pathPoints: { x: number; y: number }[]
}

export interface PlayerState {
  x: number
  y: number
  velocityX: number
  velocityY: number
  isGrounded: boolean
  isDead: boolean
  deathTimer: number
}

export function isEnemyElement(el: LevelElement): el is EnemyEntity {
  return el.type === 'slime' || el.type === 'dragon'
}

export const GRID_SIZE = 40
export const CANVAS_WIDTH = 1200
export const CANVAS_HEIGHT = 800

export const ELEMENT_DEFAULTS: Record<ElementType, { width: number; height: number }> = {
  ground: { width: 80, height: 24 },
  movingPlatform: { width: 120, height: 16 },
  spike: { width: 32, height: 24 },
  flag: { width: 20, height: 40 },
  slime: { width: 32, height: 32 },
  dragon: { width: 32, height: 20 },
}

export const GRAVITY = 0.15
export const PLAYER_SPEED = 3
export const JUMP_HEIGHT = 80
export const PLAYER_SIZE = 24

export const JUMP_VELOCITY = -Math.sqrt(2 * GRAVITY * JUMP_HEIGHT)

export const DEATH_DURATION = 0.5
