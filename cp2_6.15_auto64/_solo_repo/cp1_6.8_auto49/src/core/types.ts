export type UnitType = 'warrior' | 'archer' | 'mage' | 'enemy_warrior' | 'enemy_archer' | 'enemy_mage'
export type CellType = 'normal' | 'obstacle'
export type ItemType = 'attackBoost' | 'moveBoost'
export type GamePhase = 'start' | 'playerTurn' | 'enemyTurn' | 'victory' | 'defeat'
export type TurnStep = 'select' | 'move' | 'attack' | 'done'

export interface Position {
  row: number
  col: number
}

export interface Skill {
  name: string
  damageMultiplier: number
  range: number
  aoe: number
  cooldown: number
  currentCooldown: number
  knockback?: number
  ignoreObstacles?: boolean
}

export interface Unit {
  id: string
  name: string
  type: UnitType
  hp: number
  maxHp: number
  attack: number
  moveRange: number
  attackRange: number
  position: Position
  hasActed: boolean
  hasMoved: boolean
  skill: Skill
  isAlive: boolean
  isPlayer: boolean
}

export interface Cell {
  row: number
  col: number
  type: CellType
  occupant: Unit | null
  item: Item | null
}

export interface Item {
  type: ItemType
  value: number
  position: Position
  id: string
}

export interface AnimationData {
  type: 'move' | 'attack' | 'skill' | 'pickup' | 'death' | 'turnTransition' | 'damage'
  unitId: string
  from?: Position
  to?: Position
  path?: Position[]
  duration: number
  startTime: number
  damage?: number
  targetId?: string
  itemId?: string
  itemType?: ItemType
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
  type: 'spark' | 'glow' | 'ring' | 'trail'
}

export interface DamagePopup {
  x: number
  y: number
  text: string
  color: string
  life: number
  maxLife: number
}

export const GRID_SIZE = 8
export const CELL_SIZE = 64

export function posKey(pos: Position): string {
  return `${pos.row},${pos.col}`
}

export function posEqual(a: Position, b: Position): boolean {
  return a.row === b.row && a.col === b.col
}

export function manhattanDistance(a: Position, b: Position): number {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col)
}

export function getNeighbors(pos: Position): Position[] {
  const dirs: Position[] = [
    { row: -1, col: 0 },
    { row: 1, col: 0 },
    { row: 0, col: -1 },
    { row: 0, col: 1 },
  ]
  return dirs
    .map(d => ({ row: pos.row + d.row, col: pos.col + d.col }))
    .filter(p => p.row >= 0 && p.row < GRID_SIZE && p.col >= 0 && p.col < GRID_SIZE)
}

export function isEnemyType(type: UnitType): boolean {
  return type.startsWith('enemy_')
}

export function getBaseType(type: UnitType): 'warrior' | 'archer' | 'mage' {
  if (type === 'enemy_warrior') return 'warrior'
  if (type === 'enemy_archer') return 'archer'
  if (type === 'enemy_mage') return 'mage'
  return type as 'warrior' | 'archer' | 'mage'
}
