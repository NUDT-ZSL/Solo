export type TerrainType = 'plain' | 'forest' | 'river' | 'highland'
export type UnitType = 'infantry' | 'archer' | 'cavalry'
export type PlayerSide = 'player' | 'enemy'

export interface HexCoord {
  q: number
  r: number
}

export interface Unit {
  id: string
  type: UnitType
  side: PlayerSide
  hp: number
  maxHp: number
  attack: number
  range: number
  moveRange: number
  position: HexCoord
  isGeneral: boolean
  statusEffects: StatusEffect[]
  hasMoved: boolean
  hasAttacked: boolean
}

export interface StatusEffect {
  type: 'ambush' | 'burn' | 'stun' | 'rally'
  remainingTurns: number
  value?: number
}

export interface HexCell {
  coord: HexCoord
  terrain: TerrainType
  unit: Unit | null
}

export interface BattleLogEntry {
  id: number
  message: string
  timestamp: number
}

export interface GameState {
  grid: HexCell[][]
  units: Unit[]
  currentTurn: PlayerSide
  turnNumber: number
  movesRemaining: number
  battleLog: BattleLogEntry[]
  gameOver: boolean
  winner: PlayerSide | null
  stats: GameStats
}

export interface GameStats {
  turnsPlayed: number
  enemiesKilled: number
  tacticsUsed: number
}

const TERRAIN_COLORS: Record<TerrainType, string> = {
  plain: '#8FBC8F',
  forest: '#2E8B57',
  river: '#4682B4',
  highland: '#D2B48C'
}

const UNIT_STATS: Record<UnitType, { hp: number; attack: number; range: number; moveRange: number }> = {
  infantry: { hp: 100, attack: 15, range: 1, moveRange: 2 },
  archer: { hp: 70, attack: 12, range: 3, moveRange: 2 },
  cavalry: { hp: 90, attack: 20, range: 2, moveRange: 3 }
}

const GRID_SIZE = 10
let logIdCounter = 0
let unitIdCounter = 0

export class GameEngine {
  private state: GameState

  constructor() {
    this.state = this.createInitialState()
  }

  private createInitialState(): GameState {
    const grid: HexCell[][] = []
    for (let r = 0; r < GRID_SIZE; r++) {
      grid[r] = []
      for (let q = 0; q < GRID_SIZE; q++) {
        grid[r][q] = {
          coord: { q, r },
          terrain: this.getRandomTerrain(q, r),
          unit: null
        }
      }
    }

    const units: Unit[] = []

    const playerPositions = [
      { q: 1, r: 7, type: 'infantry' as UnitType, isGeneral: true },
      { q: 2, r: 8, type: 'infantry' as UnitType, isGeneral: false },
      { q: 0, r: 8, type: 'archer' as UnitType, isGeneral: false },
      { q: 3, r: 7, type: 'cavalry' as UnitType, isGeneral: false }
    ]

    const enemyPositions = [
      { q: 8, r: 2, type: 'infantry' as UnitType, isGeneral: true },
      { q: 7, r: 1, type: 'infantry' as UnitType, isGeneral: false },
      { q: 9, r: 1, type: 'archer' as UnitType, isGeneral: false },
      { q: 6, r: 2, type: 'cavalry' as UnitType, isGeneral: false }
    ]

    playerPositions.forEach(pos => {
      const unit = this.createUnit(pos.type, 'player', { q: pos.q, r: pos.r }, pos.isGeneral)
      units.push(unit)
      grid[pos.r][pos.q].unit = unit
    })

    enemyPositions.forEach(pos => {
      const unit = this.createUnit(pos.type, 'enemy', { q: pos.q, r: pos.r }, pos.isGeneral)
      units.push(unit)
      grid[pos.r][pos.q].unit = unit
    })

    return {
      grid,
      units,
      currentTurn: 'player',
      turnNumber: 1,
      movesRemaining: 3,
      battleLog: [],
      gameOver: false,
      winner: null,
      stats: { turnsPlayed: 0, enemiesKilled: 0, tacticsUsed: 0 }
    }
  }

  private getRandomTerrain(q: number, r: number): TerrainType {
    if ((q === 4 || q === 5) && r >= 3 && r <= 6) return 'river'
    if ((q + r) % 5 === 0 && q > 1 && q < 8) return 'forest'
    if ((q * r) % 7 === 0 && q > 2 && q < 7) return 'highland'
    return 'plain'
  }

  private createUnit(type: UnitType, side: PlayerSide, position: HexCoord, isGeneral: boolean): Unit {
    const stats = UNIT_STATS[type]
    return {
      id: `unit_${++unitIdCounter}`,
      type,
      side,
      hp: stats.hp,
      maxHp: stats.hp,
      attack: stats.attack,
      range: stats.range,
      moveRange: stats.moveRange,
      position,
      isGeneral,
      statusEffects: [],
      hasMoved: false,
      hasAttacked: false
    }
  }

  getState(): GameState {
    return this.state
  }

  getGridSize(): number {
    return GRID_SIZE
  }

  getTerrainColor(terrain: TerrainType): string {
    return TERRAIN_COLORS[terrain]
  }

  hexToPixel(coord: HexCoord, size: number): { x: number; y: number } {
    const x = size * (3 / 2 * coord.q)
    const y = size * (Math.sqrt(3) / 2 * coord.q + Math.sqrt(3) * coord.r)
    return { x, y }
  }

  getHexNeighbors(coord: HexCoord): HexCoord[] {
    const directions = [
      { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
      { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 }
    ]
    return directions
      .map(d => ({ q: coord.q + d.q, r: coord.r + d.r }))
      .filter(c => c.q >= 0 && c.q < GRID_SIZE && c.r >= 0 && c.r < GRID_SIZE)
  }

  hexDistance(a: HexCoord, b: HexCoord): number {
    return (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2
  }

  getMovableRange(unit: Unit): HexCoord[] {
    if (unit.hasMoved) return []
    const result: HexCoord[] = []
    const visited = new Set<string>()
    const queue: { coord: HexCoord; distance: number }[] = [{ coord: unit.position, distance: 0 }]

    while (queue.length > 0) {
      const current = queue.shift()!
      const key = `${current.coord.q},${current.coord.r}`
      if (visited.has(key)) continue
      visited.add(key)

      if (current.distance > 0) {
        const cell = this.state.grid[current.coord.r][current.coord.q]
        if (!cell.unit && cell.terrain !== 'river') {
          result.push(current.coord)
        }
      }

      if (current.distance < unit.moveRange) {
        this.getHexNeighbors(current.coord).forEach(neighbor => {
          const nKey = `${neighbor.q},${neighbor.r}`
          if (!visited.has(nKey)) {
            const nCell = this.state.grid[neighbor.r][neighbor.q]
            const extraCost = nCell.terrain === 'forest' ? 1 : 0
            queue.push({ coord: neighbor, distance: current.distance + 1 + extraCost })
          }
        })
      }
    }

    return result
  }

  getAttackableRange(unit: Unit): HexCoord[] {
    if (unit.hasAttacked) return []
    const result: HexCoord[] = []
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let q = 0; q < GRID_SIZE; q++) {
        const target = { q, r }
        const dist = this.hexDistance(unit.position, target)
        if (dist > 0 && dist <= unit.range) {
          const cell = this.state.grid[r][q]
          if (cell.unit && cell.unit.side !== unit.side) {
            result.push(target)
          }
        }
      }
    }
    return result
  }

  moveUnit(unitId: string, target: HexCoord): boolean {
    const unit = this.state.units.find(u => u.id === unitId)
    if (!unit || unit.hasMoved || this.state.movesRemaining <= 0) return false

    const movable = this.getMovableRange(unit)
    const isValidTarget = movable.some(c => c.q === target.q && c.r === target.r)
    if (!isValidTarget) return false

    this.state.grid[unit.position.r][unit.position.q].unit = null
    unit.position = target
    unit.hasMoved = true
    this.state.grid[target.r][target.q].unit = unit
    this.state.movesRemaining--

    this.addLog(`${this.getUnitName(unit)} 移动到 (${target.q}, ${target.r})`)
    return true
  }

  attackUnit(attackerId: string, targetId: string): { damage: number; killed: boolean } | null {
    const attacker = this.state.units.find(u => u.id === attackerId)
    const target = this.state.units.find(u => u.id === targetId)
    if (!attacker || !target || attacker.hasAttacked) return null
    if (attacker.side === target.side) return null

    const dist = this.hexDistance(attacker.position, target.position)
    if (dist > attacker.range) return null

    let damage = attacker.attack
    const hasAmbush = target.statusEffects.some(e => e.type === 'ambush')
    if (hasAmbush && Math.random() < 0.5) {
      this.addLog(`${this.getUnitName(target)} 闪避了 ${this.getUnitName(attacker)} 的攻击！`)
      attacker.hasAttacked = true
      return { damage: 0, killed: false }
    }

    const attackerCell = this.state.grid[attacker.position.r][attacker.position.q]
    if (attackerCell.terrain === 'highland') damage = Math.floor(damage * 1.2)
    const targetCell = this.state.grid[target.position.r][target.position.q]
    if (targetCell.terrain === 'forest') damage = Math.floor(damage * 0.8)

    target.hp = Math.max(0, target.hp - damage)
    attacker.hasAttacked = true

    this.addLog(`${this.getUnitName(attacker)} 对 ${this.getUnitName(target)} 造成 ${damage} 点伤害`)

    let killed = false
    if (target.hp <= 0) {
      killed = true
      this.removeUnit(target)
      this.addLog(`${this.getUnitName(target)} 被击败！`)
      if (attacker.side === 'player') this.state.stats.enemiesKilled++
      this.checkWinCondition()
    }

    return { damage, killed }
  }

  private removeUnit(unit: Unit): void {
    this.state.grid[unit.position.r][unit.position.q].unit = null
    this.state.units = this.state.units.filter(u => u.id !== unit.id)
  }

  deployUnit(type: UnitType, side: PlayerSide, position: HexCoord): Unit | null {
    const cell = this.state.grid[position.r]?.[position.q]
    if (!cell || cell.unit) return null

    const isValidZone = side === 'player' ? position.r >= 6 : position.r <= 3
    if (!isValidZone) return null

    const unit = this.createUnit(type, side, position, false)
    this.state.units.push(unit)
    cell.unit = unit
    this.addLog(`${side === 'player' ? '我方' : '敌方'}部署了${this.getUnitTypeName(type)}`)
    return unit
  }

  private checkWinCondition(): void {
    const playerUnits = this.state.units.filter(u => u.side === 'player')
    const enemyUnits = this.state.units.filter(u => u.side === 'enemy')
    const playerGeneral = playerUnits.find(u => u.isGeneral)
    const enemyGeneral = enemyUnits.find(u => u.isGeneral)

    if (enemyUnits.length === 0 || !enemyGeneral) {
      this.state.gameOver = true
      this.state.winner = 'player'
      this.addLog('胜利！敌军已被全歼！')
    } else if (playerUnits.length === 0 || !playerGeneral) {
      this.state.gameOver = true
      this.state.winner = 'enemy'
      this.addLog('失败...我军已全军覆没...')
    }
  }

  endTurn(): void {
    this.state.units.forEach(unit => {
      unit.statusEffects = unit.statusEffects
        .map(e => ({ ...e, remainingTurns: e.remainingTurns - 1 }))
        .filter(e => e.remainingTurns > 0)

      const burnEffect = unit.statusEffects.find(e => e.type === 'burn')
      if (burnEffect && burnEffect.value) {
        unit.hp = Math.max(0, unit.hp - burnEffect.value)
        this.addLog(`${this.getUnitName(unit)} 受到 ${burnEffect.value} 点灼烧伤害`)
        if (unit.hp <= 0) {
          this.removeUnit(unit)
          this.addLog(`${this.getUnitName(unit)} 被灼烧致死！`)
        }
      }

      unit.hasMoved = false
      unit.hasAttacked = false
    })

    this.checkWinCondition()
    if (this.state.gameOver) return

    this.state.currentTurn = this.state.currentTurn === 'player' ? 'enemy' : 'player'
    if (this.state.currentTurn === 'player') {
      this.state.turnNumber++
      this.state.stats.turnsPlayed++
    }
    this.state.movesRemaining = 3

    this.addLog(`--- 第 ${this.state.turnNumber} 回合 ${this.state.currentTurn === 'player' ? '我方' : '敌方'}行动 ---`)

    if (this.state.currentTurn === 'enemy') {
      this.executeAI()
    }
  }

  private executeAI(): void {
    const enemyUnits = this.state.units.filter(u => u.side === 'enemy')
    const playerUnits = this.state.units.filter(u => u.side === 'player')
    if (playerUnits.length === 0) return

    enemyUnits.forEach(enemy => {
      let closestPlayer: Unit | null = null
      let minDist = Infinity
      playerUnits.forEach(player => {
        const dist = this.hexDistance(enemy.position, player.position)
        if (dist < minDist) {
          minDist = dist
          closestPlayer = player
        }
      })

      const target = closestPlayer
      if (!target) return

      if (minDist <= enemy.range && !enemy.hasAttacked) {
        this.attackUnit(enemy.id, target.id)
      }

      if (!enemy.hasMoved && minDist > enemy.range) {
        const movable = this.getMovableRange(enemy)
        if (movable.length > 0) {
          let bestMove = movable[0]
          let bestDist = Infinity
          movable.forEach(pos => {
            const d = this.hexDistance(pos, target.position)
            if (d < bestDist) {
              bestDist = d
              bestMove = pos
            }
          })
          this.moveUnit(enemy.id, bestMove)

          const newDist = this.hexDistance(bestMove, target.position)
          if (newDist <= enemy.range && !enemy.hasAttacked) {
            this.attackUnit(enemy.id, target.id)
          }
        }
      }
    })

    setTimeout(() => {
      if (!this.state.gameOver) {
        this.endTurn()
      }
    }, 800)
  }

  applyStatusEffect(unitId: string, effect: StatusEffect): void {
    const unit = this.state.units.find(u => u.id === unitId)
    if (!unit) return
    unit.statusEffects = unit.statusEffects.filter(e => e.type !== effect.type)
    unit.statusEffects.push(effect)
  }

  addLog(message: string): void {
    this.state.battleLog.push({
      id: ++logIdCounter,
      message,
      timestamp: Date.now()
    })
    if (this.state.battleLog.length > 100) {
      this.state.battleLog.shift()
    }
  }

  getUnitName(unit: Unit): string {
    const typeName = this.getUnitTypeName(unit.type)
    const sideName = unit.side === 'player' ? '我方' : '敌方'
    const generalTag = unit.isGeneral ? '[主将]' : ''
    return `${sideName}${generalTag}${typeName}`
  }

  getUnitTypeName(type: UnitType): string {
    const names: Record<UnitType, string> = {
      infantry: '步兵',
      archer: '弓箭手',
      cavalry: '骑兵'
    }
    return names[type]
  }

  incrementTacticsUsed(): void {
    this.state.stats.tacticsUsed++
  }
}
