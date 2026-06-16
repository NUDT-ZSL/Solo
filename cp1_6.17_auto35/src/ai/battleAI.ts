import * as THREE from 'three'
import type { Ship, Projectile, BattleLog, Faction, TacticType } from '../types'
import { applyTactic, selectOptimalTactic, TacticDecision } from './tactics'
import { GRID_SIZE, CELL_SIZE } from '../renderer/sceneSetup'
import {
  calculateDamage,
  damageShip,
  healShip,
  stunShip,
  canUseSkill,
  triggerSkillCooldown
} from '../core/shipFactory'

export interface AIState {
  playerTactic: TacticType
  enemyTactic: TacticType
  tacticTimer: number
  shieldedShipIds: Set<string>
}

export interface AIUpdateResult {
  newProjectiles: Projectile[]
  logs: BattleLog[]
  events: AISkillEvent[]
}

export interface AISkillEvent {
  type: 'emp' | 'repair' | 'airstrike' | 'shield'
  shipId: string
  position: THREE.Vector3
  color: string
  affectedIds: string[]
}

let projectileIdCounter = 0
let logIdCounter = 0

export function createAIState(): AIState {
  return {
    playerTactic: 'focus_fire',
    enemyTactic: 'focus_fire',
    tacticTimer: 0,
    shieldedShipIds: new Set()
  }
}

export function updateAllShipsAI(
  ships: Ship[],
  state: AIState,
  deltaTime: number,
  currentFrame: number,
  maxProjectilesPerFrame: number = 5,
  totalProjectileCount: number = 0
): AIUpdateResult {
  const result: AIUpdateResult = {
    newProjectiles: [],
    logs: [],
    events: []
  }

  state.tacticTimer += deltaTime
  if (state.tacticTimer > 10) {
    state.tacticTimer = 0
    const playerShips = ships.filter(s => s.faction === 'player')
    const enemyShips = ships.filter(s => s.faction === 'enemy')
    state.playerTactic = selectOptimalTactic(playerShips, enemyShips, state.playerTactic)
    state.enemyTactic = selectOptimalTactic(enemyShips, playerShips, state.enemyTactic)
  }

  let projectilesCreated = 0
  const projectileBudget = Math.max(0, maxProjectilesPerFrame - totalProjectileCount)

  for (const ship of ships) {
    if (!ship.status.alive) continue
    if (ship.status.stunned > 0) continue

    const allies = ships.filter(s => s.faction === ship.faction && s.id !== ship.id)
    const enemies = ships.filter(s => s.faction !== ship.faction)
    const tactic = ship.faction === 'player' ? state.playerTactic : state.enemyTactic
    const decision = applyTactic(ship, allies, enemies, tactic)

    applyMoveDecision(ship, decision, deltaTime)
    applyAttackDecision(ship, decision, ships, result, projectilesCreated, projectileBudget)

    if (projectilesCreated < projectileBudget && result.newProjectiles.length > 0) {
      projectilesCreated = result.newProjectiles.length
    }

    if (decision.useSkill && canUseSkill(ship)) {
      executeSkill(ship, ships, state, result, currentFrame)
    }
  }

  return result
}

function applyMoveDecision(ship: Ship, decision: TacticDecision, deltaTime: number): void {
  if (decision.moveTarget) {
    ship.targetPosition = decision.moveTarget
  }

  if (ship.targetPosition) {
    const direction = ship.targetPosition.clone().sub(ship.position)
    direction.y = 0
    const distance = direction.length()

    if (distance > 0.1) {
      direction.normalize()
      const moveDistance = Math.min(distance, ship.stats.speed * deltaTime)
      ship.position.add(direction.multiplyScalar(moveDistance))

      const targetRotation = Math.atan2(direction.x, direction.z)
      const currentRotation = ship.mesh?.rotation.y ?? 0
      let rotationDiff = targetRotation - currentRotation
      while (rotationDiff > Math.PI) rotationDiff -= Math.PI * 2
      while (rotationDiff < -Math.PI) rotationDiff += Math.PI * 2
      if (ship.mesh) {
        ship.mesh.rotation.y = currentRotation + rotationDiff * Math.min(1, deltaTime * 5)
        ship.mesh.position.copy(ship.position)
      }
    } else {
      ship.targetPosition = null
    }
  } else if (ship.targetShipId && ship.mesh) {
    // No moving but face target
  }

  if (ship.mesh) {
    ship.mesh.position.copy(ship.position)
  }
}

function applyAttackDecision(
  ship: Ship,
  decision: TacticDecision,
  allShips: Ship[],
  result: AIUpdateResult,
  createdSoFar: number,
  budget: number
): void {
  ship.targetShipId = decision.targetShipId
  if (!ship.targetShipId) return

  const target = allShips.find(s => s.id === ship.targetShipId)
  if (!target || !target.status.alive) return

  const distance = ship.position.distanceTo(target.position)
  if (distance > ship.stats.range) return

  if (ship.attackCooldown > 0) return
  if (createdSoFar >= budget) return

  const damage = calculateDamage(ship, target)

  const projectile: Projectile = {
    id: `proj_${Date.now()}_${++projectileIdCounter}`,
    from: ship.position.clone().setY(0.5),
    to: target.position.clone().setY(0.5),
    progress: 0,
    speed: 12,
    damage,
    targetId: target.id,
    faction: ship.faction
  }
  result.newProjectiles.push(projectile)

  ship.attackCooldown = 2.0

  result.logs.push({
    id: `log_${Date.now()}_${++logIdCounter}`,
    timestamp: Date.now(),
    message: `${ship.name} 向 ${target.name} 开火，造成 ${damage} 点伤害`,
    type: 'attack'
  })
}

function executeSkill(
  ship: Ship,
  allShips: Ship[],
  state: AIState,
  result: AIUpdateResult,
  currentFrame: number
): void {
  const skill = ship.skills[0]
  if (!skill) return

  triggerSkillCooldown(ship)

  const affectedIds: string[] = []
  let eventColor = skill.color

  switch (skill.type) {
    case 'emp': {
      eventColor = '#1E88E5'
      for (const target of allShips) {
        if (target.faction !== ship.faction && target.status.alive) {
          if (ship.position.distanceTo(target.position) <= 3) {
            stunShip(target, 3)
            affectedIds.push(target.id)
            result.logs.push({
              id: `log_${Date.now()}_${++logIdCounter}`,
              timestamp: Date.now(),
              message: `${ship.name} 释放 EMP，${target.name} 被眩晕！`,
              type: 'stun'
            })
          }
        }
      }
      break
    }
    case 'repair': {
      eventColor = '#81C784'
      for (const target of allShips) {
        if (target.faction === ship.faction && target.status.alive) {
          if (ship.position.distanceTo(target.position) <= 4) {
            const healAmount = Math.round(target.maxHp * 0.3)
            const healed = healShip(target, healAmount)
            if (healed > 0) {
              affectedIds.push(target.id)
              result.logs.push({
                id: `log_${Date.now()}_${++logIdCounter}`,
                timestamp: Date.now(),
                message: `${ship.name} 修复光环恢复 ${target.name} ${healed} 点血量`,
                type: 'heal'
              })
            }
          }
        }
      }
      break
    }
    case 'airstrike': {
      eventColor = '#FF8A65'
      const enemies = allShips.filter(s => s.faction !== ship.faction && s.status.alive)
      if (enemies.length > 0) {
        enemies.sort((a, b) => ship.position.distanceTo(a.position) - ship.position.distanceTo(b.position))
        const primaryTarget = enemies[0]
        const airstrikeCenter = primaryTarget.position.clone()

        for (const target of enemies) {
          if (airstrikeCenter.distanceTo(target.position) <= 2.5) {
            const damage = Math.round(ship.stats.attack * 2.5)
            const actualDamage = damageShip(target, damage)
            if (actualDamage > 0) {
              affectedIds.push(target.id)
              result.logs.push({
                id: `log_${Date.now()}_${++logIdCounter}`,
                timestamp: Date.now(),
                message: `${ship.name} 主炮齐射命中 ${target.name}，造成 ${actualDamage} 点伤害！`,
                type: 'attack'
              })
              if (!target.status.alive) {
                result.logs.push({
                  id: `log_${Date.now()}_${++logIdCounter}`,
                  timestamp: Date.now(),
                  message: `💥 ${target.name} 被摧毁！`,
                  type: 'death'
                })
              }
            }
          }
        }
      }
      break
    }
    case 'shield': {
      eventColor = '#CE93D8'
      for (const target of allShips) {
        if (target.faction === ship.faction && target.status.alive) {
          if (ship.position.distanceTo(target.position) <= 5) {
            state.shieldedShipIds.add(target.id)
            affectedIds.push(target.id)
            setTimeout(() => state.shieldedShipIds.delete(target.id), 3000)
          }
        }
      }
      result.logs.push({
        id: `log_${Date.now()}_${++logIdCounter}`,
        timestamp: Date.now(),
        message: `${ship.name} 激活能量护盾，保护 ${affectedIds.length} 艘友舰！`,
        type: 'skill'
      })
      break
    }
  }

  result.events.push({
    type: skill.type,
    shipId: ship.id,
    position: ship.position.clone(),
    color: eventColor,
    affectedIds
  })
}

export function processProjectileHits(
  projectiles: Projectile[],
  ships: Ship[],
  state: AIState,
  deltaTime: number
): { logs: BattleLog[]; hitProjectileIds: string[]; destroyedIds: string[] } {
  const logs: BattleLog[] = []
  const hitProjectileIds: string[] = []
  const destroyedIds: string[] = []

  for (const proj of projectiles) {
    const totalDistance = proj.from.distanceTo(proj.to)
    proj.progress += (proj.speed * deltaTime) / totalDistance

    if (proj.progress >= 1) {
      hitProjectileIds.push(proj.id)

      const target = ships.find(s => s.id === proj.targetId)
      if (target && target.status.alive) {
        if (state.shieldedShipIds.has(target.id)) {
          logs.push({
            id: `log_${Date.now()}_${++logIdCounter}`,
            timestamp: Date.now(),
            message: `${target.name} 的护盾抵挡了攻击！`,
            type: 'info'
          })
        } else {
          const actualDamage = damageShip(target, proj.damage)
          if (actualDamage > 0 && !target.status.alive) {
            destroyedIds.push(target.id)
            logs.push({
              id: `log_${Date.now()}_${++logIdCounter}`,
              timestamp: Date.now(),
              message: `💥 ${target.name} 被摧毁！`,
              type: 'death'
            })
          }
        }
      }
    }
  }

  return { logs, hitProjectileIds, destroyedIds }
}

export function manualUseSkill(
  ship: Ship,
  allShips: Ship[],
  state: AIState,
  skillIndex: number = 0,
  targetPosition?: THREE.Vector3
): { event: AISkillEvent | null; logs: BattleLog[] } {
  if (!canUseSkill(ship, skillIndex)) {
    return { event: null, logs: [] }
  }

  const skill = ship.skills[skillIndex]
  if (!skill) return { event: null, logs: [] }

  triggerSkillCooldown(ship, skillIndex)

  const result: { event: AISkillEvent | null; logs: BattleLog[] } = {
    event: null,
    logs: []
  }

  const affectedIds: string[] = []

  switch (skill.type) {
    case 'emp': {
      for (const target of allShips) {
        if (target.faction !== ship.faction && target.status.alive) {
          if (ship.position.distanceTo(target.position) <= 3) {
            stunShip(target, 3)
            affectedIds.push(target.id)
            result.logs.push({
              id: `log_${Date.now()}_${++logIdCounter}`,
              timestamp: Date.now(),
              message: `${ship.name} 手动释放 EMP，${target.name} 被眩晕！`,
              type: 'stun'
            })
          }
        }
      }
      break
    }
    case 'repair': {
      for (const target of allShips) {
        if (target.faction === ship.faction && target.status.alive) {
          if (ship.position.distanceTo(target.position) <= 4) {
            const healAmount = Math.round(target.maxHp * 0.3)
            const healed = healShip(target, healAmount)
            if (healed > 0) {
              affectedIds.push(target.id)
              result.logs.push({
                id: `log_${Date.now()}_${++logIdCounter}`,
                timestamp: Date.now(),
                message: `${ship.name} 修复光环恢复 ${target.name} ${healed} 点血量`,
                type: 'heal'
              })
            }
          }
        }
      }
      break
    }
    case 'airstrike': {
      const center = targetPosition || ship.position.clone()
      for (const target of allShips) {
        if (target.faction !== ship.faction && target.status.alive) {
          if (center.distanceTo(target.position) <= 2.5) {
            const damage = Math.round(ship.stats.attack * 2.5)
            damageShip(target, damage)
            affectedIds.push(target.id)
          }
        }
      }
      result.logs.push({
        id: `log_${Date.now()}_${++logIdCounter}`,
        timestamp: Date.now(),
        message: `${ship.name} 手动呼叫主炮齐射！`,
        type: 'skill'
      })
      break
    }
    case 'shield': {
      for (const target of allShips) {
        if (target.faction === ship.faction && target.status.alive) {
          if (ship.position.distanceTo(target.position) <= 5) {
            state.shieldedShipIds.add(target.id)
            affectedIds.push(target.id)
            setTimeout(() => state.shieldedShipIds.delete(target.id), 3000)
          }
        }
      }
      result.logs.push({
        id: `log_${Date.now()}_${++logIdCounter}`,
        timestamp: Date.now(),
        message: `${ship.name} 手动激活能量护盾！`,
        type: 'skill'
      })
      break
    }
  }

  result.event = {
    type: skill.type,
    shipId: ship.id,
    position: skill.type === 'airstrike' && targetPosition ? targetPosition : ship.position.clone(),
    color: skill.color,
    affectedIds
  }

  return result
}

export function recallShip(ship: Ship, faction: Faction, allShips: Ship[]): boolean {
  if (!ship.status.alive || ship.faction !== faction) return false

  const teamStartZ = faction === 'player' ? (GRID_SIZE / 2 - 1) : (-GRID_SIZE / 2 + 1)
  const gridCenterX = 0

  let validPos = new THREE.Vector3(gridCenterX, 0, teamStartZ * CELL_SIZE)
  const gridOffset = (GRID_SIZE * CELL_SIZE) / 2 - CELL_SIZE / 2
  validPos.z = faction === 'player'
    ? gridOffset - CELL_SIZE * 2
    : -gridOffset + CELL_SIZE * 2

  const usedPositions = allShips
    .filter(s => s.status.alive && s.id !== ship.id)
    .map(s => s.position)

  let found = false
  for (let attempt = 0; attempt < 20 && !found; attempt++) {
    const offsetX = (Math.random() - 0.5) * 6
    const offsetZ = (Math.random() - 0.5) * 2
    const testPos = validPos.clone().add(new THREE.Vector3(offsetX, 0, offsetZ))
    const tooClose = usedPositions.some(p => p.distanceTo(testPos) < 1.2)
    if (!tooClose) {
      validPos = testPos
      found = true
    }
  }

  ship.position.copy(validPos)
  ship.targetPosition = null
  if (ship.mesh) {
    ship.mesh.position.copy(ship.position)
  }

  return true
}
