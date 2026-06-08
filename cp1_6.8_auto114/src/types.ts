export type EyeColor = 'red' | 'blue' | 'green' | 'yellow'
export type EyeDirection = 'up' | 'down' | 'left' | 'right'
export type CellType = 'empty' | 'wall' | 'totem' | 'exit' | 'fragment'

export interface TotemState {
  id: string
  gridX: number
  gridY: number
  eyeColor: EyeColor
  eyeDirection: EyeDirection
  isMatched: boolean
  rotationAngle: number
  targetAngle: number
}

export interface MazeCell {
  type: CellType
  totem: TotemState | null
  isWalkable: boolean
  fragmentCollected: boolean
}

export interface PlayerState {
  gridX: number
  gridY: number
  pixelX: number
  pixelY: number
  targetPixelX: number
  targetPixelY: number
  moving: boolean
}

export interface Fragment {
  gridX: number
  gridY: number
  collected: boolean
  sparklePhase: number
}

export interface LevelConfig {
  level: number
  mazeCols: number
  mazeRows: number
  totemCount: number
  chainEnabled: boolean
}

export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  color: string
  size: number
}

export const EYE_COLORS: EyeColor[] = ['red', 'blue', 'green', 'yellow']
export const EYE_DIRECTIONS: EyeDirection[] = ['up', 'right', 'down', 'left']

export const COLOR_HEX: Record<EyeColor, string> = {
  red: '#e74c3c',
  blue: '#3498db',
  green: '#2ecc71',
  yellow: '#f1c40f',
}

export const COMPLEMENTARY: Record<EyeColor, EyeColor> = {
  red: 'green',
  green: 'red',
  blue: 'yellow',
  yellow: 'blue',
}

export const LEVEL_CONFIGS: LevelConfig[] = [
  { level: 1, mazeCols: 5, mazeRows: 5, totemCount: 4, chainEnabled: false },
  { level: 1, mazeCols: 6, mazeRows: 6, totemCount: 6, chainEnabled: false },
  { level: 3, mazeCols: 7, mazeRows: 7, totemCount: 8, chainEnabled: true },
]

export const DIRECTION_ANGLE: Record<EyeDirection, number> = {
  up: 0,
  right: 90,
  down: 180,
  left: 270,
}

export function directionToAngle(dir: EyeDirection): number {
  return DIRECTION_ANGLE[dir]
}

export function angleToDirection(angle: number): EyeDirection {
  const normalized = ((angle % 360) + 360) % 360
  if (normalized < 45 || normalized >= 315) return 'up'
  if (normalized >= 45 && normalized < 135) return 'right'
  if (normalized >= 135 && normalized < 225) return 'down'
  return 'left'
}

export function getInwardDirection(
  fromX: number,
  fromY: number,
  centerX: number,
  centerY: number
): EyeDirection {
  const dx = centerX - fromX
  const dy = centerY - fromY
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx > 0 ? 'right' : 'left'
  }
  return dy > 0 ? 'down' : 'up'
}
