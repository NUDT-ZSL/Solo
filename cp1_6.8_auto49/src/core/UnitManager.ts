import {
  type Unit,
  type UnitType,
  type Position,
  type Skill,
  GRID_SIZE,
} from './types'

export class UnitManager {
  units: Unit[] = []

  createUnit(
    id: string,
    name: string,
    type: UnitType,
    position: Position,
    isPlayer: boolean
  ): Unit {
    const stats = this.getBaseStats(type)
    const unit: Unit = {
      id,
      name,
      type,
      hp: stats.hp,
      maxHp: stats.hp,
      attack: stats.attack,
      moveRange: stats.moveRange,
      attackRange: stats.attackRange,
      position,
      hasActed: false,
      hasMoved: false,
      skill: this.getSkill(type),
      isAlive: true,
      isPlayer,
    }
    this.units.push(unit)
    return unit
  }

  private getBaseStats(type: UnitType): {
    hp: number
    attack: number
    moveRange: number
    attackRange: number
  } {
    switch (type) {
      case 'warrior':
        return { hp: 120, attack: 25, moveRange: 3, attackRange: 1 }
      case 'archer':
        return { hp: 70, attack: 20, moveRange: 4, attackRange: 3 }
      case 'mage':
        return { hp: 60, attack: 30, moveRange: 3, attackRange: 2 }
      case 'enemy_warrior':
        return { hp: 90, attack: 20, moveRange: 3, attackRange: 1 }
      case 'enemy_archer':
        return { hp: 55, attack: 16, moveRange: 4, attackRange: 3 }
      case 'enemy_mage':
        return { hp: 50, attack: 24, moveRange: 3, attackRange: 2 }
      default:
        return { hp: 80, attack: 15, moveRange: 3, attackRange: 1 }
    }
  }

  private getSkill(type: UnitType): Skill {
    switch (type) {
      case 'warrior':
        return {
          name: '猛击',
          damageMultiplier: 1.5,
          range: 1,
          aoe: 0,
          cooldown: 3,
          currentCooldown: 0,
          knockback: 1,
        }
      case 'archer':
        return {
          name: '精准射击',
          damageMultiplier: 2,
          range: 4,
          aoe: 0,
          cooldown: 3,
          currentCooldown: 0,
          ignoreObstacles: true,
        }
      case 'mage':
        return {
          name: '火球术',
          damageMultiplier: 1.2,
          range: 2,
          aoe: 1,
          cooldown: 3,
          currentCooldown: 0,
        }
      case 'enemy_warrior':
        return {
          name: '重击',
          damageMultiplier: 1.3,
          range: 1,
          aoe: 0,
          cooldown: 4,
          currentCooldown: 0,
        }
      case 'enemy_archer':
        return {
          name: '毒箭',
          damageMultiplier: 1.5,
          range: 3,
          aoe: 0,
          cooldown: 4,
          currentCooldown: 0,
        }
      case 'enemy_mage':
        return {
          name: '暗影爆发',
          damageMultiplier: 1.1,
          range: 2,
          aoe: 1,
          cooldown: 4,
          currentCooldown: 0,
        }
      default:
        return {
          name: '攻击',
          damageMultiplier: 1,
          range: 1,
          aoe: 0,
          cooldown: 0,
          currentCooldown: 0,
        }
    }
  }

  getAliveUnits(isPlayer: boolean): Unit[] {
    return this.units.filter(u => u.isAlive && u.isPlayer === isPlayer)
  }

  getUnitById(id: string): Unit | undefined {
    return this.units.find(u => u.id === id)
  }

  resetTurn(isPlayer: boolean): void {
    for (const unit of this.units) {
      if (unit.isPlayer === isPlayer && unit.isAlive) {
        unit.hasActed = false
        unit.hasMoved = false
        if (unit.skill.currentCooldown > 0) {
          unit.skill.currentCooldown--
        }
      }
    }
  }

  dealDamage(target: Unit, damage: number): boolean {
    target.hp = Math.max(0, target.hp - damage)
    if (target.hp <= 0) {
      target.isAlive = false
      return true
    }
    return false
  }

  applyItem(unit: Unit, itemType: 'attackBoost' | 'moveBoost', value: number): void {
    if (itemType === 'attackBoost') {
      unit.attack += value
    } else if (itemType === 'moveBoost') {
      unit.moveRange += value
    }
  }

  canUseSkill(unit: Unit): boolean {
    return unit.skill.currentCooldown === 0
  }

  useSkill(unit: Unit): void {
    unit.skill.currentCooldown = unit.skill.cooldown
  }
}

export function createPlayerUnits(): { id: string; name: string; type: UnitType; position: Position }[] {
  return [
    { id: 'player_warrior', name: '战士', type: 'warrior', position: { row: 0, col: 1 } },
    { id: 'player_archer', name: '弓箭手', type: 'archer', position: { row: 1, col: 0 } },
    { id: 'player_mage', name: '法师', type: 'mage', position: { row: 0, col: 2 } },
  ]
}

export function createEnemyUnits(): { id: string; name: string; type: UnitType; position: Position }[] {
  const enemies: { id: string; name: string; type: UnitType; position: Position }[] = []
  const types: UnitType[] = ['enemy_warrior', 'enemy_archer', 'enemy_mage']
  const names: string[] = ['暗影战士', '暗影弓手', '暗影法师']

  let count = 3 + Math.floor(Math.random() * 2)
  const usedPositions = new Set<string>()

  for (let i = 0; i < count; i++) {
    let row: number, col: number
    do {
      row = GRID_SIZE - 2 + Math.floor(Math.random() * 2)
      col = Math.floor(Math.random() * GRID_SIZE)
    } while (usedPositions.has(`${row},${col}`))

    usedPositions.add(`${row},${col}`)
    const typeIndex = i % 3
    enemies.push({
      id: `enemy_${i}`,
      name: names[typeIndex],
      type: types[typeIndex],
      position: { row, col },
    })
  }

  return enemies
}
