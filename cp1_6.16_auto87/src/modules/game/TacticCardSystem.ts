import { GameEngine, HexCoord, Unit, PlayerSide } from './GameEngine'

export type CardType = 'ambush' | 'fireAttack' | 'rally' | 'confusion'

export interface TacticCard {
  id: string
  type: CardType
  name: string
  description: string
  icon: string
  needsTarget: 'unit' | 'cell' | 'none'
  targetSide: 'enemy' | 'ally' | 'any' | 'none'
}

const CARD_TEMPLATES: Record<CardType, Omit<TacticCard, 'id'>> = {
  ambush: {
    type: 'ambush',
    name: '伏兵',
    description: '提升我方步兵闪避率50%，持续2回合',
    icon: '🛡',
    needsTarget: 'unit',
    targetSide: 'ally'
  },
  fireAttack: {
    type: 'fireAttack',
    name: '火攻',
    description: '对3x3森林区域造成15点灼烧伤害，持续3回合',
    icon: '🔥',
    needsTarget: 'cell',
    targetSide: 'any'
  },
  rally: {
    type: 'rally',
    name: '鼓舞',
    description: '恢复所有我方单位8点生命',
    icon: '⚔',
    needsTarget: 'none',
    targetSide: 'none'
  },
  confusion: {
    type: 'confusion',
    name: '混乱',
    description: '强制目标敌方单位停止行动1回合',
    icon: '💫',
    needsTarget: 'unit',
    targetSide: 'enemy'
  }
}

let cardIdCounter = 0

function createCard(type: CardType): TacticCard {
  return {
    ...CARD_TEMPLATES[type],
    id: `card_${++cardIdCounter}`
  }
}

export class TacticCardSystem {
  private engine: GameEngine
  private hand: TacticCard[] = []
  private maxHandSize: number = 5
  private drawPerTurn: number = 2

  constructor(engine: GameEngine) {
    this.engine = engine
    this.drawCards(3)
  }

  getHand(): TacticCard[] {
    return this.hand
  }

  drawCards(count: number): void {
    const types: CardType[] = ['ambush', 'fireAttack', 'rally', 'confusion']
    for (let i = 0; i < count; i++) {
      if (this.hand.length >= this.maxHandSize) break
      const randomType = types[Math.floor(Math.random() * types.length)]
      this.hand.push(createCard(randomType))
    }
  }

  onNewTurn(): void {
    this.drawCards(this.drawPerTurn)
  }

  canPlayCard(cardId: string): boolean {
    const card = this.hand.find(c => c.id === cardId)
    if (!card) return false
    const state = this.engine.getState()
    return state.currentTurn === 'player' && !state.gameOver
  }

  getCardValidTargets(cardId: string): { units: Unit[]; cells: HexCoord[] } {
    const card = this.hand.find(c => c.id === cardId)
    if (!card) return { units: [], cells: [] }

    const state = this.engine.getState()
    const result: { units: Unit[]; cells: HexCoord[] } = { units: [], cells: [] }

    switch (card.type) {
      case 'ambush':
        result.units = state.units.filter(u => u.side === 'player' && u.type === 'infantry')
        break
      case 'fireAttack':
        for (let r = 0; r < state.grid.length; r++) {
          for (let q = 0; q < state.grid[r].length; q++) {
            if (state.grid[r][q].terrain === 'forest') {
              result.cells.push({ q, r })
            }
          }
        }
        break
      case 'rally':
        break
      case 'confusion':
        result.units = state.units.filter(u => u.side === 'enemy')
        break
    }

    return result
  }

  playCard(cardId: string, targetUnitId?: string, targetCell?: HexCoord): boolean {
    const cardIndex = this.hand.findIndex(c => c.id === cardId)
    if (cardIndex === -1) return false

    const card = this.hand[cardIndex]
    if (!this.canPlayCard(cardId)) return false

    let success = false

    switch (card.type) {
      case 'ambush':
        success = this.applyAmbush(targetUnitId)
        break
      case 'fireAttack':
        success = this.applyFireAttack(targetCell)
        break
      case 'rally':
        success = this.applyRally()
        break
      case 'confusion':
        success = this.applyConfusion(targetUnitId)
        break
    }

    if (success) {
      this.hand.splice(cardIndex, 1)
      this.engine.incrementTacticsUsed()
      this.engine.addLog(`【计策】使用了 ${card.name}`)
    }

    return success
  }

  private applyAmbush(targetUnitId?: string): boolean {
    if (!targetUnitId) return false
    this.engine.applyStatusEffect(targetUnitId, {
      type: 'ambush',
      remainingTurns: 2,
      value: 50
    })
    return true
  }

  private applyFireAttack(targetCell?: HexCoord): boolean {
    if (!targetCell) return false
    const state = this.engine.getState()
    const gridSize = this.engine.getGridSize()

    for (let dr = -1; dr <= 1; dr++) {
      for (let dq = -1; dq <= 1; dq++) {
        const q = targetCell.q + dq
        const r = targetCell.r + dr
        if (q < 0 || q >= gridSize || r < 0 || r >= gridSize) continue
        const cell = state.grid[r][q]
        if (cell.terrain === 'forest' && cell.unit) {
          const unit = cell.unit
          unit.hp = Math.max(0, unit.hp - 15)
          this.engine.applyStatusEffect(unit.id, {
            type: 'burn',
            remainingTurns: 3,
            value: 5
          })
          this.engine.addLog(`${this.engine.getUnitName(unit)} 被火攻，受到15点伤害！`)
          if (unit.hp <= 0) {
            const removeMethod = (this.engine as any).removeUnit
            if (removeMethod) removeMethod.call(this.engine, unit)
            this.engine.addLog(`${this.engine.getUnitName(unit)} 被大火吞噬！`)
          }
        }
      }
    }

    const checkWin = (this.engine as any).checkWinCondition
    if (checkWin) checkWin.call(this.engine)

    return true
  }

  private applyRally(): boolean {
    const state = this.engine.getState()
    state.units
      .filter(u => u.side === 'player')
      .forEach(unit => {
        const healAmount = Math.min(8, unit.maxHp - unit.hp)
        unit.hp += healAmount
        if (healAmount > 0) {
          this.engine.addLog(`${this.engine.getUnitName(unit)} 恢复了 ${healAmount} 点生命`)
        }
      })
    return true
  }

  private applyConfusion(targetUnitId?: string): boolean {
    if (!targetUnitId) return false
    const state = this.engine.getState()
    const target = state.units.find(u => u.id === targetUnitId)
    if (!target || target.side !== 'enemy') return false

    target.hasMoved = true
    target.hasAttacked = true
    this.engine.applyStatusEffect(targetUnitId, {
      type: 'stun',
      remainingTurns: 1
    })
    this.engine.addLog(`${this.engine.getUnitName(target)} 陷入混乱，停止行动！`)
    return true
  }
}
