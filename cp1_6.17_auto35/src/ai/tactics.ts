import * as THREE from 'three'
import type { Ship, Faction, TacticType } from '../types'
import { GRID_SIZE, CELL_SIZE, gridToWorld } from '../renderer/sceneSetup'

export type FormationType = 'dense' | 'spread' | 'flank'

export interface TacticDecision {
  targetShipId: string | null
  moveTarget: THREE.Vector3 | null
  useSkill: boolean
  skillTargetId?: string | null
}

export function generateEnemyFormation(
  formationType: FormationType,
  shipCount: number
): { gridX: number; gridZ: number }[] {
  const positions: { gridX: number; gridZ: number }[] = []
  const enemyStartZ = Math.floor(GRID_SIZE / 2) - 2
  const centerX = Math.floor(GRID_SIZE / 2)

  switch (formationType) {
    case 'dense': {
      const cols = Math.ceil(Math.sqrt(shipCount * 1.5))
      for (let i = 0; i < shipCount; i++) {
        const col = i % cols
        const row = Math.floor(i / cols)
        positions.push({
          gridX: centerX - Math.floor(cols / 2) + col,
          gridZ: enemyStartZ - row
        })
      }
      break
    }
    case 'spread': {
      const spacing = Math.floor((GRID_SIZE - 4) / shipCount)
      for (let i = 0; i < shipCount; i++) {
        positions.push({
          gridX: 2 + i * spacing,
          gridZ: enemyStartZ - (i % 2)
        })
      }
      break
    }
    case 'flank': {
      const leftCount = Math.ceil(shipCount / 2)
      const rightCount = shipCount - leftCount
      for (let i = 0; i < leftCount; i++) {
        positions.push({
          gridX: 1 + i,
          gridZ: enemyStartZ - Math.floor(i / 3)
        })
      }
      for (let i = 0; i < rightCount; i++) {
        positions.push({
          gridX: GRID_SIZE - 2 - i,
          gridZ: enemyStartZ - Math.floor(i / 3)
        })
      }
      break
    }
  }

  return positions.map(p => ({
    gridX: Math.max(1, Math.min(GRID_SIZE - 2, p.gridX)),
    gridZ: Math.max(1, Math.min(GRID_SIZE / 2 - 1, p.gridZ))
  }))
}

export function pickRandomFormation(): FormationType {
  const formations: FormationType[] = ['dense', 'spread', 'flank']
  return formations[Math.floor(Math.random() * formations.length)]
}

export function applyTactic(
  ship: Ship,
  allies: Ship[],
  enemies: Ship[],
  tactic: TacticType
): TacticDecision {
  const decision: TacticDecision = {
    targetShipId: null,
    moveTarget: null,
    useSkill: false
  }

  if (!ship.status.alive || ship.status.stunned > 0) return decision

  const aliveEnemies = enemies.filter(e => e.status.alive)
  if (aliveEnemies.length === 0) return decision

  switch (tactic) {
    case 'focus_fire':
      return applyFocusFire(ship, allies, aliveEnemies)
    case 'encircle':
      return applyEncircle(ship, allies, aliveEnemies)
    case 'defensive':
      return applyDefensive(ship, allies, aliveEnemies)
  }
}

function applyFocusFire(
  ship: Ship,
  allies: Ship[],
  enemies: Ship[]
): TacticDecision {
  const decision: TacticDecision = {
    targetShipId: null,
    moveTarget: null,
    useSkill: false
  }

  const enemyHpMap = new Map<string, { ship: Ship; attackers: number; hp: number }>()
  for (const e of enemies) {
    enemyHpMap.set(e.id, { ship: e, attackers: 0, hp: e.hp })
  }
  for (const ally of allies) {
    if (ally.status.alive && ally.targetShipId && enemyHpMap.has(ally.targetShipId)) {
      const entry = enemyHpMap.get(ally.targetShipId)!
      entry.attackers++
    }
  }

  let bestTarget: Ship | null = null
  let bestScore = Infinity

  for (const entry of enemyHpMap.values()) {
    const distance = ship.position.distanceTo(entry.ship.position)
    const inRange = distance <= ship.stats.range
    const hpFactor = entry.hp / entry.ship.maxHp
    const attackerBonus = entry.attackers > 0 ? -2 : 0
    const score = hpFactor * 5 + (inRange ? 0 : distance * 0.5) + attackerBonus

    if (score < bestScore) {
      bestScore = score
      bestTarget = entry.ship
    }
  }

  if (bestTarget) {
    decision.targetShipId = bestTarget.id
    const distance = ship.position.distanceTo(bestTarget.position)
    if (distance > ship.stats.range * 0.9) {
      decision.moveTarget = calculateApproachPosition(ship, bestTarget)
    }
  }

  if (shouldUseSkill(ship, allies, enemies)) {
    decision.useSkill = true
  }

  return decision
}

function applyEncircle(
  ship: Ship,
  allies: Ship[],
  enemies: Ship[]
): TacticDecision {
  const decision: TacticDecision = {
    targetShipId: null,
    moveTarget: null,
    useSkill: false
  }

  let centroid = new THREE.Vector3()
  let count = 0
  for (const e of enemies) {
    centroid.add(e.position)
    count++
  }
  if (count > 0) centroid.divideScalar(count)

  let nearestEnemy: Ship | null = null
  let nearestDist = Infinity

  for (const e of enemies) {
    const dist = ship.position.distanceTo(e.position)
    if (dist < nearestDist) {
      nearestDist = dist
      nearestEnemy = e
    }
  }

  if (nearestEnemy) {
    decision.targetShipId = nearestEnemy.id
    const angle = Math.random() * Math.PI * 2
    const flankOffset = new THREE.Vector3(
      Math.cos(angle) * ship.stats.range * 0.6,
      0,
      Math.sin(angle) * ship.stats.range * 0.6
    )
    decision.moveTarget = nearestEnemy.position.clone().add(flankOffset)
    decision.moveTarget!.y = 0

    clampToBattlefield(decision.moveTarget!)

    if (nearestDist <= ship.stats.range) {
      decision.moveTarget = null
    }
  }

  if (shouldUseSkill(ship, allies, enemies)) {
    decision.useSkill = true
  }

  return decision
}

function applyDefensive(
  ship: Ship,
  allies: Ship[],
  enemies: Ship[]
): TacticDecision {
  const decision: TacticDecision = {
    targetShipId: null,
    moveTarget: null,
    useSkill: false
  }

  const flagship = allies.find(a => a.isFlagship && a.status.alive)
  const weakestAlly = allies
    .filter(a => a.status.alive)
    .sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0]

  let nearestEnemy: Ship | null = null
  let nearestDist = Infinity
  let threatToFlagship = false

  for (const e of enemies) {
    const distToShip = ship.position.distanceTo(e.position)
    if (distToShip < nearestDist) {
      nearestDist = distToShip
      nearestEnemy = e
    }
    if (flagship) {
      const distToFlag = flagship.position.distanceTo(e.position)
      if (distToFlag <= e.stats.range * 1.5) {
        threatToFlagship = true
      }
    }
  }

  if (nearestEnemy) {
    decision.targetShipId = nearestEnemy.id
  }

  if (flagship && threatToFlagship && !ship.isFlagship) {
    const anchorPos = flagship.position.clone()
    const offsetAngle = Math.random() * Math.PI * 2
    const defendOffset = new THREE.Vector3(
      Math.cos(offsetAngle) * 2,
      0,
      Math.sin(offsetAngle) * 2
    )
    decision.moveTarget = anchorPos.add(defendOffset)
    decision.moveTarget.y = 0
    clampToBattlefield(decision.moveTarget)
  } else if (weakestAlly && weakestAlly !== ship && weakestAlly.hp / weakestAlly.maxHp < 0.4) {
    decision.moveTarget = weakestAlly.position.clone()
    decision.moveTarget.y = 0
    clampToBattlefield(decision.moveTarget)
  } else if (nearestEnemy && nearestDist > ship.stats.range * 0.8) {
    decision.moveTarget = calculateApproachPosition(ship, nearestEnemy)
  }

  if (ship.skills[0]?.type === 'repair' && weakestAlly && weakestAlly.hp < weakestAlly.maxHp * 0.6) {
    const dist = ship.position.distanceTo(weakestAlly.position)
    if (dist <= 4 && ship.skills[0].currentCooldown <= 0) {
      decision.useSkill = true
    }
  } else if (ship.skills[0]?.type === 'shield' && allies.some(a => a.hp < a.maxHp * 0.3)) {
    if (ship.skills[0].currentCooldown <= 0) {
      decision.useSkill = true
    }
  } else if (shouldUseSkill(ship, allies, enemies)) {
    decision.useSkill = true
  }

  return decision
}

function shouldUseSkill(ship: Ship, allies: Ship[], enemies: Ship[]): boolean {
  const skill = ship.skills[0]
  if (!skill || skill.currentCooldown > 0) return false

  switch (skill.type) {
    case 'emp': {
      let nearbyEnemies = 0
      for (const e of enemies) {
        if (e.status.alive && ship.position.distanceTo(e.position) <= 3) {
          nearbyEnemies++
        }
      }
      return nearbyEnemies >= 2
    }
    case 'repair': {
      let hurtAllies = 0
      for (const a of allies) {
        if (a.status.alive && a.hp < a.maxHp * 0.7 && ship.position.distanceTo(a.position) <= 4) {
          hurtAllies++
        }
      }
      return hurtAllies >= 2
    }
    case 'airstrike': {
      let clusterCount = 0
      for (const e of enemies) {
        if (e.status.alive) {
          let nearby = 0
          for (const e2 of enemies) {
            if (e2.status.alive && e.position.distanceTo(e2.position) <= 2) {
              nearby++
            }
          }
          clusterCount = Math.max(clusterCount, nearby)
        }
      }
      return clusterCount >= 2
    }
    case 'shield': {
      const flagship = allies.find(a => a.isFlagship && a.status.alive)
      if (flagship && flagship.hp < flagship.maxHp * 0.5) {
        return ship.position.distanceTo(flagship.position) <= 5
      }
      const lowHpCount = allies.filter(a => a.status.alive && a.hp < a.maxHp * 0.3).length
      return lowHpCount >= 2
    }
  }
  return false
}

function calculateApproachPosition(ship: Ship, target: Ship): THREE.Vector3 {
  const direction = ship.position.clone().sub(target.position).normalize()
  const approachDist = ship.stats.range * 0.75
  const pos = target.position.clone().add(direction.multiplyScalar(approachDist))
  pos.y = 0
  clampToBattlefield(pos)
  return pos
}

function clampToBattlefield(pos: THREE.Vector3): void {
  const halfSize = (GRID_SIZE * CELL_SIZE) / 2 - 1
  pos.x = Math.max(-halfSize, Math.min(halfSize, pos.x))
  pos.z = Math.max(-halfSize, Math.min(halfSize, pos.z))
}

export function selectOptimalTactic(
  factionShips: Ship[],
  enemyShips: Ship[],
  currentTactic: TacticType
): TacticType {
  const aliveAllies = factionShips.filter(s => s.status.alive)
  const aliveEnemies = enemyShips.filter(s => s.status.alive)
  const flagship = aliveAllies.find(s => s.isFlagship)

  if (flagship && flagship.hp < flagship.maxHp * 0.4) {
    return 'defensive'
  }

  if (aliveAllies.length > aliveEnemies.length) {
    return 'encircle'
  }

  if (aliveEnemies.length === 1) {
    return 'focus_fire'
  }

  const avgHpRatio = aliveAllies.reduce((sum, s) => sum + s.hp / s.maxHp, 0) / aliveAllies.length
  if (avgHpRatio < 0.5) {
    return 'defensive'
  }

  const tacticDuration = Math.random()
  if (tacticDuration > 0.85) {
    const tactics: TacticType[] = ['focus_fire', 'encircle', 'defensive']
    return tactics.filter(t => t !== currentTactic)[Math.floor(Math.random() * 2)]
  }

  return currentTactic
}
