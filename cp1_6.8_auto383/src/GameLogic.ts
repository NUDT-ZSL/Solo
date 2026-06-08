export type Faction = 'blue' | 'red'

export interface Skill {
  name: string
  energyCost: number
  range: number
  damage: number
  type: 'lightning' | 'explosion' | 'freeze' | 'single' | 'heal'
  description: string
  aoe: number
}

export interface Spirit {
  id: string
  name: string
  faction: Faction
  hp: number
  maxHp: number
  attack: number
  skill: Skill
  position: { row: number; col: number }
  isFrozen: boolean
  frozenTurns: number
  hasMoved: boolean
  hasUsedSkill: boolean
  icon: string
}

export interface Cell {
  row: number
  col: number
  owner: Faction | null
  glowIntensity: number
}

export interface LogEntry {
  id: number
  text: string
  faction: Faction
  timestamp: number
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
  type: 'trail' | 'explosion' | 'lightning' | 'freeze' | 'heal' | 'ambient'
}

export interface SkillEffect {
  type: Skill['type']
  sourceRow: number
  sourceCol: number
  targetRow: number
  targetCol: number
  progress: number
  duration: number
  color: string
}

export const BOARD_SIZE = 8
export const MAX_TURN_TIME = 30
export const ENERGY_PER_CELL = 1
export const MOVE_RANGE = 2
export const MAX_PARTICLES = 500

export const FACTION_COLORS = {
  blue: { primary: '#6c5ce7', secondary: '#a855f7', glow: 'rgba(108,92,231,0.6)', bg: 'rgba(108,92,231,0.15)' },
  red: { primary: '#e17055', secondary: '#f97316', glow: 'rgba(225,112,85,0.6)', bg: 'rgba(225,112,85,0.15)' },
}

const BLUE_SPIRIT_TEMPLATES: Omit<Spirit, 'id' | 'position' | 'isFrozen' | 'frozenTurns' | 'hasMoved' | 'hasUsedSkill'>[] = [
  {
    name: '影刃',
    faction: 'blue',
    hp: 100,
    maxHp: 100,
    attack: 25,
    skill: { name: '闪电链', energyCost: 3, range: 2, damage: 18, type: 'lightning', description: '对目标及相邻敌棋造成18伤害', aoe: 1 },
    icon: 'blade',
  },
  {
    name: '霜灵',
    faction: 'blue',
    hp: 85,
    maxHp: 85,
    attack: 18,
    skill: { name: '冰冻领域', energyCost: 4, range: 2, damage: 0, type: 'freeze', description: '冻结周围2格内敌棋1回合', aoe: 2 },
    icon: 'frost',
  },
  {
    name: '星盾',
    faction: 'blue',
    hp: 130,
    maxHp: 130,
    attack: 12,
    skill: { name: '治愈之光', energyCost: 3, range: 3, damage: -30, type: 'heal', description: '治疗己方幻灵30点生命', aoe: 0 },
    icon: 'shield',
  },
]

const RED_SPIRIT_TEMPLATES: Omit<Spirit, 'id' | 'position' | 'isFrozen' | 'frozenTurns' | 'hasMoved' | 'hasUsedSkill'>[] = [
  {
    name: '炎魔',
    faction: 'red',
    hp: 120,
    maxHp: 120,
    attack: 28,
    skill: { name: '烈焰冲击', energyCost: 4, range: 2, damage: 22, type: 'explosion', description: '对目标及相邻格造成22伤害', aoe: 1 },
    icon: 'flame',
  },
  {
    name: '雷兽',
    faction: 'red',
    hp: 90,
    maxHp: 90,
    attack: 22,
    skill: { name: '雷霆一击', energyCost: 3, range: 3, damage: 35, type: 'single', description: '对单个目标造成35伤害', aoe: 0 },
    icon: 'thunder',
  },
  {
    name: '血牙',
    faction: 'red',
    hp: 95,
    maxHp: 95,
    attack: 24,
    skill: { name: '吸血之咬', energyCost: 3, range: 1, damage: 20, type: 'single', description: '造成20伤害并恢复等量生命', aoe: 0 },
    icon: 'fang',
  },
]

let spiritIdCounter = 0

function createSpirit(template: typeof BLUE_SPIRIT_TEMPLATES[number], row: number, col: number): Spirit {
  return {
    ...template,
    id: `spirit_${++spiritIdCounter}`,
    position: { row, col },
    isFrozen: false,
    frozenTurns: 0,
    hasMoved: false,
    hasUsedSkill: false,
  }
}

export function createInitialBoard(): Cell[][] {
  const board: Cell[][] = []
  for (let r = 0; r < BOARD_SIZE; r++) {
    const row: Cell[] = []
    for (let c = 0; c < BOARD_SIZE; c++) {
      row.push({ row: r, col: c, owner: null, glowIntensity: 0 })
    }
    board.push(row)
  }
  return board
}

export function createInitialSpirits(): Spirit[] {
  spiritIdCounter = 0
  const blue1 = createSpirit(BLUE_SPIRIT_TEMPLATES[0], 7, 1)
  const blue2 = createSpirit(BLUE_SPIRIT_TEMPLATES[1], 7, 3)
  const blue3 = createSpirit(BLUE_SPIRIT_TEMPLATES[2], 7, 5)
  const red1 = createSpirit(RED_SPIRIT_TEMPLATES[0], 0, 2)
  const red2 = createSpirit(RED_SPIRIT_TEMPLATES[1], 0, 4)
  const red3 = createSpirit(RED_SPIRIT_TEMPLATES[2], 0, 6)
  return [blue1, blue2, blue3, red1, red2, red3]
}

export function getSpiritAt(spirits: Spirit[], row: number, col: number): Spirit | undefined {
  return spirits.find(s => s.position.row === row && s.position.col === col && s.hp > 0)
}

export function getValidMoves(spirit: Spirit, spirits: Spirit[]): { row: number; col: number }[] {
  if (spirit.isFrozen || spirit.hasMoved) return []
  const moves: { row: number; col: number }[] = []
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const dist = Math.abs(r - spirit.position.row) + Math.abs(c - spirit.position.col)
      if (dist === 0 || dist > MOVE_RANGE) continue
      const occupant = getSpiritAt(spirits, r, c)
      if (occupant && occupant.faction === spirit.faction) continue
      moves.push({ row: r, col: c })
    }
  }
  return moves
}

export function getSkillTargets(
  spirit: Spirit,
  spirits: Spirit[],
  targetRow: number,
  targetCol: number
): Spirit[] {
  const dist = Math.abs(targetRow - spirit.position.row) + Math.abs(targetCol - spirit.position.col)
  if (dist > spirit.skill.range) return []

  const targets: Spirit[] = []
  if (spirit.skill.aoe === 0) {
    const t = getSpiritAt(spirits, targetRow, targetCol)
    if (t) targets.push(t)
  } else {
    for (let dr = -spirit.skill.aoe; dr <= spirit.skill.aoe; dr++) {
      for (let dc = -spirit.skill.aoe; dc <= spirit.skill.aoe; dc++) {
        if (Math.abs(dr) + Math.abs(dc) > spirit.skill.aoe) continue
        const t = getSpiritAt(spirits, targetRow + dr, targetCol + dc)
        if (t) targets.push(t)
      }
    }
  }
  return targets
}

export function isValidSkillTarget(
  spirit: Spirit,
  spirits: Spirit[],
  targetRow: number,
  targetCol: number
): boolean {
  const dist = Math.abs(targetRow - spirit.position.row) + Math.abs(targetCol - spirit.position.col)
  if (dist > spirit.skill.range || dist === 0) return false
  if (spirit.skill.type === 'heal') {
    const t = getSpiritAt(spirits, targetRow, targetCol)
    return !!t && t.faction === spirit.faction && t.hp < t.maxHp
  }
  if (spirit.skill.aoe === 0) {
    const t = getSpiritAt(spirits, targetRow, targetCol)
    return !!t && t.faction !== spirit.faction
  }
  for (let dr = -spirit.skill.aoe; dr <= spirit.skill.aoe; dr++) {
    for (let dc = -spirit.skill.aoe; dc <= spirit.skill.aoe; dc++) {
      if (Math.abs(dr) + Math.abs(dc) > spirit.skill.aoe) continue
      const t = getSpiritAt(spirits, targetRow + dr, targetCol + dc)
      if (t && t.faction !== spirit.faction) return true
    }
  }
  return false
}

export function applySkill(
  spirit: Spirit,
  spirits: Spirit[],
  targetRow: number,
  targetCol: number
): { updatedSpirits: Spirit[]; targets: Spirit[]; damage: number } {
  const targets = getSkillTargets(spirit, spirits, targetRow, targetCol)
  let updatedSpirits = spirits.map(s => ({ ...s }))

  if (spirit.skill.type === 'heal') {
    const healAmount = Math.abs(spirit.skill.damage)
    updatedSpirits = updatedSpirits.map(s => {
      const isTarget = targets.some(t => t.id === s.id)
      if (isTarget) {
        return { ...s, hp: Math.min(s.maxHp, s.hp + healAmount) }
      }
      return s
    })
    return { updatedSpirits, targets, damage: healAmount }
  }

  const dmg = spirit.skill.damage
  updatedSpirits = updatedSpirits.map(s => {
    const isTarget = targets.some(t => t.id === s.id)
    if (isTarget && s.faction !== spirit.faction) {
      return { ...s, hp: Math.max(0, s.hp - dmg) }
    }
    if (isTarget && spirit.skill.type === 'explosion') {
      return { ...s, hp: Math.max(0, s.hp - Math.floor(dmg * 0.5)) }
    }
    return s
  })

  if (spirit.icon === 'fang') {
    const self = updatedSpirits.find(s => s.id === spirit.id)
    if (self) {
      self.hp = Math.min(self.maxHp, self.hp + dmg)
    }
  }

  if (spirit.skill.type === 'freeze') {
    updatedSpirits = updatedSpirits.map(s => {
      const isTarget = targets.some(t => t.id === s.id)
      if (isTarget && s.faction !== spirit.faction) {
        return { ...s, isFrozen: true, frozenTurns: 1 }
      }
      return s
    })
  }

  return { updatedSpirits, targets, damage: dmg }
}

export function moveSpirit(
  spirit: Spirit,
  spirits: Spirit[],
  toRow: number,
  toCol: number,
  board: Cell[][]
): { updatedSpirits: Spirit[]; updatedBoard: Cell[][]; attacked: Spirit | null } {
  let updatedSpirits = spirits.map(s => ({ ...s }))
  let updatedBoard = board.map(row => row.map(cell => ({ ...cell })))
  const mover = updatedSpirits.find(s => s.id === spirit.id)
  if (!mover) return { updatedSpirits, updatedBoard, attacked: null }

  const enemy = getSpiritAt(updatedSpirits, toRow, toCol)
  let attacked: Spirit | null = null

  if (enemy && enemy.faction !== spirit.faction) {
    const enemyRef = updatedSpirits.find(s => s.id === enemy.id)
    if (enemyRef) {
      enemyRef.hp = Math.max(0, enemyRef.hp - mover.attack)
      attacked = { ...enemyRef }
    }
  }

  mover.position = { row: toRow, col: toCol }
  mover.hasMoved = true
  updatedBoard[toRow][toCol].owner = spirit.faction
  updatedBoard[toRow][toCol].glowIntensity = 1.0

  return { updatedSpirits, updatedBoard, attacked }
}

export function generateEnergy(board: Cell[][], faction: Faction): number {
  let count = 0
  for (const row of board) {
    for (const cell of row) {
      if (cell.owner === faction) count++
    }
  }
  return count * ENERGY_PER_CELL
}

export function checkWinCondition(spirits: Spirit[]): Faction | null {
  const blueAlive = spirits.some(s => s.faction === 'blue' && s.hp > 0)
  const redAlive = spirits.some(s => s.faction === 'red' && s.hp > 0)
  if (!blueAlive) return 'red'
  if (!redAlive) return 'blue'
  return null
}

export function unfreezeSpirits(spirits: Spirit[], faction: Faction): Spirit[] {
  return spirits.map(s => {
    if (s.faction === faction && s.isFrozen) {
      const newTurns = s.frozenTurns - 1
      if (newTurns <= 0) {
        return { ...s, isFrozen: false, frozenTurns: 0 }
      }
      return { ...s, frozenTurns: newTurns }
    }
    return s
  })
}

export function resetTurnState(spirits: Spirit[], faction: Faction): Spirit[] {
  return spirits.map(s => {
    if (s.faction === faction) {
      return { ...s, hasMoved: false, hasUsedSkill: false }
    }
    return s
  })
}

export function getSkillRangeCells(spirit: Spirit): { row: number; col: number }[] {
  const cells: { row: number; col: number }[] = []
  for (let dr = -spirit.skill.range; dr <= spirit.skill.range; dr++) {
    for (let dc = -spirit.skill.range; dc <= spirit.skill.range; dc++) {
      const r = spirit.position.row + dr
      const c = spirit.position.col + dc
      const dist = Math.abs(dr) + Math.abs(dc)
      if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) continue
      if (dist === 0 || dist > spirit.skill.range) continue
      cells.push({ row: r, col: c })
    }
  }
  return cells
}
