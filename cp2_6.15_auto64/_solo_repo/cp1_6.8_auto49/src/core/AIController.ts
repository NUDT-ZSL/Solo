import type { Unit, Position } from './types'
import { manhattanDistance, getNeighbors, posKey } from './types'
import type { GridManager } from './GridManager'

export interface AIAction {
  unit: Unit
  type: 'move' | 'attack' | 'skill' | 'wait'
  target?: Position
  targetUnit?: Unit
  path?: Position[]
}

export class AIController {
  gridManager: GridManager

  constructor(gridManager: GridManager) {
    this.gridManager = gridManager
  }

  computeActions(enemies: Unit[], playerUnits: Unit[]): AIAction[] {
    const actions: AIAction[] = []
    const aliveEnemies = enemies.filter(e => e.isAlive && !e.hasActed)
    const alivePlayers = playerUnits.filter(p => p.isAlive)
    const threatenedPositions = new Set<string>()

    for (const enemy of aliveEnemies) {
      const action = this.computeActionForUnit(enemy, alivePlayers, threatenedPositions)
      if (action) {
        actions.push(action)
        if (action.target) {
          threatenedPositions.add(posKey(action.target))
        }
      }
    }

    return actions
  }

  private computeActionForUnit(
    enemy: Unit,
    playerUnits: Unit[],
    threatenedPositions: Set<string>
  ): AIAction | null {
    const attackableEnemies = this.gridManager.getAttackableEnemies(enemy)
    const sortedTargets = [...playerUnits].sort((a, b) => a.hp - b.hp)

    if (attackableEnemies.length > 0) {
      const target = attackableEnemies.sort((a, b) => a.hp - b.hp)[0]

      if (enemy.skill.aoe > 0 && this.gridManager.canUseSkill(enemy) === false) {
        // Use regular attack
      }

      if (enemy.skill.aoe > 0 && enemy.skill.currentCooldown === 0) {
        const aoeTargets = this.getAoeTargets(enemy, target.position, playerUnits)
        if (aoeTargets.length >= 2) {
          return {
            unit: enemy,
            type: 'skill',
            target: target.position,
            targetUnit: target,
          }
        }
      }

      return {
        unit: enemy,
        type: 'attack',
        target: target.position,
        targetUnit: target,
      }
    }

    const moveAction = this.computeMoveTowardTarget(enemy, sortedTargets, threatenedPositions)
    if (moveAction) {
      return moveAction
    }

    return { unit: enemy, type: 'wait' }
  }

  private getAoeTargets(enemy: Unit, center: Position, playerUnits: Unit[]): Unit[] {
    const aoe = enemy.skill.aoe
    const targets: Unit[] = []
    for (const player of playerUnits) {
      if (manhattanDistance(center, player.position) <= aoe) {
        targets.push(player)
      }
    }
    return targets
  }

  private computeMoveTowardTarget(
    enemy: Unit,
    sortedTargets: Unit[],
    threatenedPositions: Set<string>
  ): AIAction | null {
    const moveableCells = this.gridManager.getMoveableCells(enemy)
    if (moveableCells.length === 0) return null

    let bestTarget: Unit | null = null
    for (const target of sortedTargets) {
      if (target.isAlive) {
        bestTarget = target
        break
      }
    }
    if (!bestTarget) return null

    let bestCell: Position | null = null
    let bestScore = -Infinity

    for (const cell of moveableCells) {
      let score = 0
      const distToTarget = manhattanDistance(cell, bestTarget.position)
      score -= distToTarget * 10

      const canAttackFromHere = this.canAttackFrom(enemy, cell, sortedTargets)
      if (canAttackFromHere) {
        score += 100
        const attackable = this.getAttackableFrom(enemy, cell, sortedTargets)
        const lowestHp = attackable.sort((a, b) => a.hp - b.hp)[0]
        if (lowestHp) {
          score += (1 - lowestHp.hp / lowestHp.maxHp) * 50
        }
      }

      if (threatenedPositions.has(posKey(cell))) {
        score -= 5
      }

      for (const neighbor of getNeighbors(cell)) {
        const neighborCell = this.gridManager.getCell(neighbor)
        if (neighborCell?.occupant?.isPlayer === false && neighborCell.occupant.id !== enemy.id) {
          score += 3
        }
      }

      if (score > bestScore) {
        bestScore = score
        bestCell = cell
      }
    }

    if (bestCell) {
      const path = this.gridManager.findPath(enemy.position, bestCell, enemy.moveRange)
      return {
        unit: enemy,
        type: 'move',
        target: bestCell,
        path: path || undefined,
      }
    }

    return null
  }

  private canAttackFrom(enemy: Unit, from: Position, playerUnits: Unit[]): boolean {
    for (const player of playerUnits) {
      if (!player.isAlive) continue
      const dist = manhattanDistance(from, player.position)
      if (dist <= enemy.attackRange) return true
    }
    return false
  }

  private getAttackableFrom(enemy: Unit, from: Position, playerUnits: Unit[]): Unit[] {
    return playerUnits.filter(p => {
      if (!p.isAlive) return false
      return manhattanDistance(from, p.position) <= enemy.attackRange
    })
  }
}
