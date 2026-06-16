import * as THREE from 'three'
import { generateId, randomRange, bezierInterpolation, colorInterpolation, distance } from './utils'
import type { Enemy } from './enemy'

export interface Ship {
  id: string
  position: THREE.Vector3
  targetPosition: THREE.Vector3 | null
  color: string
  baseColor: string
  hp: number
  maxHp: number
  speed: number
  rotation: THREE.Euler
  isSelected: boolean
  isMoving: boolean
  isAttacking: boolean
  attackCooldown: number
  yawRotation: number
  yawSpeed: number
  hoverTime: number
  hoverAmplitude: number
  hoverPeriod: number
  formationPosition: THREE.Vector3 | null
  bezierPath: { p0: THREE.Vector3; p1: THREE.Vector3; p2: THREE.Vector3 } | null
  pathProgress: number
  pathDuration: number
  colorTransition: {
    from: string
    to: string
    progress: number
    duration: number
  } | null
  lastAttackTime: number
}

export function createShip(
  position: THREE.Vector3,
  color: string
): Ship {
  return {
    id: generateId(),
    position: position.clone(),
    targetPosition: null,
    color,
    baseColor: color,
    hp: randomRange(100, 200),
    maxHp: 200,
    speed: randomRange(1, 3),
    rotation: new THREE.Euler(0, 0, 0),
    isSelected: false,
    isMoving: false,
    isAttacking: false,
    attackCooldown: 0.5,
    yawRotation: 0,
    yawSpeed: 30 * (Math.PI / 180),
    hoverTime: 0,
    hoverAmplitude: 0.5,
    hoverPeriod: 2,
    formationPosition: null,
    bezierPath: null,
    pathProgress: 0,
    pathDuration: 2,
    colorTransition: null,
    lastAttackTime: 0,
  }
}

export function moveShip(ship: Ship, target: THREE.Vector3): void {
  ship.targetPosition = target.clone()
  ship.isMoving = true
  ship.bezierPath = null
  ship.formationPosition = null
}

export function moveShipWithBezier(
  ship: Ship,
  target: THREE.Vector3,
  path: { p0: THREE.Vector3; p1: THREE.Vector3; p2: THREE.Vector3 },
  duration: number = 2
): void {
  ship.bezierPath = path
  ship.pathProgress = 0
  ship.pathDuration = duration
  ship.targetPosition = target.clone()
  ship.isMoving = true
  ship.formationPosition = null
}

export function rotateShip(ship: Ship, targetDir: THREE.Vector3, delta: number): void {
  if (targetDir.length() < 0.001) return

  const targetYaw = Math.atan2(targetDir.x, targetDir.z)
  let currentYaw = ship.rotation.y
  let diff = targetYaw - currentYaw

  while (diff > Math.PI) diff -= Math.PI * 2
  while (diff < -Math.PI) diff += Math.PI * 2

  const rotationSpeed = 2 * delta
  ship.rotation.y += diff * Math.min(1, rotationSpeed)

  if (ship.isMoving) {
    ship.yawRotation += ship.yawSpeed * delta
  }
}

export function updateShip(
  ship: Ship,
  delta: number,
  currentTime: number,
  enemy: Enemy | null
): { shouldFireLaser: boolean; laserTarget: THREE.Vector3 | null } {
  let shouldFireLaser = false
  let laserTarget: THREE.Vector3 | null = null

  if (ship.colorTransition) {
    ship.colorTransition.progress += delta / ship.colorTransition.duration
    if (ship.colorTransition.progress >= 1) {
      ship.color = ship.colorTransition.to
      ship.baseColor = ship.colorTransition.to
      ship.colorTransition = null
    } else {
      ship.color = colorInterpolation(
        ship.colorTransition.from,
        ship.colorTransition.to,
        ship.colorTransition.progress
      )
    }
  }

  if (ship.bezierPath) {
    ship.pathProgress += delta / ship.pathDuration
    if (ship.pathProgress >= 1) {
      ship.position.copy(ship.bezierPath.p2)
      ship.bezierPath = null
      ship.isMoving = false
      ship.targetPosition = null
    } else {
      const newPos = bezierInterpolation(
        ship.bezierPath.p0,
        ship.bezierPath.p1,
        ship.bezierPath.p2,
        ship.pathProgress
      )
      const dir = newPos.clone().sub(ship.position).normalize()
      rotateShip(ship, dir, delta)
      ship.position.copy(newPos)
    }
  } else if (ship.targetPosition && ship.isMoving) {
    const dir = ship.targetPosition.clone().sub(ship.position)
    const dist = dir.length()

    if (dist < 0.5) {
      ship.position.copy(ship.targetPosition)
      ship.isMoving = false
      ship.targetPosition = null
    } else {
      dir.normalize()
      rotateShip(ship, dir, delta)
      const moveSpeed = ship.speed * delta
      if (ship.formationPosition) {
        const formationDist = distance(ship.position, ship.formationPosition)
        const adjustedSpeed = formationDist > 10 ? ship.speed * 1.2 : ship.speed
        ship.position.add(dir.multiplyScalar(adjustedSpeed * delta))
      } else {
        ship.position.add(dir.multiplyScalar(moveSpeed))
      }
    }
  }

  if (!ship.isMoving) {
    ship.hoverTime += delta
    const hoverOffset = Math.sin(ship.hoverTime * (Math.PI * 2) / ship.hoverPeriod) * ship.hoverAmplitude
    ship.position.y = ship.position.y + (hoverOffset - (ship.position.y % ship.hoverAmplitude)) * 0.1
  }

  if (enemy && !enemy.isExploding) {
    const distToEnemy = distance(ship.position, enemy.position)
    if (distToEnemy < 50) {
      ship.isAttacking = true
      const dirToEnemy = enemy.position.clone().sub(ship.position).normalize()
      rotateShip(ship, dirToEnemy, delta)

      if (currentTime - ship.lastAttackTime >= ship.attackCooldown) {
        shouldFireLaser = true
        laserTarget = enemy.position.clone()
        ship.lastAttackTime = currentTime
      }
    } else {
      ship.isAttacking = false
    }
  } else {
    ship.isAttacking = false
  }

  return { shouldFireLaser, laserTarget }
}

export function setShipFormationPosition(
  ship: Ship,
  position: THREE.Vector3
): void {
  ship.formationPosition = position.clone()
  ship.targetPosition = position.clone()
  ship.isMoving = true
  ship.bezierPath = null
}

export function setShipColorTransition(
  ship: Ship,
  targetColor: string,
  duration: number = 1.5
): void {
  ship.colorTransition = {
    from: ship.color,
    to: targetColor,
    progress: 0,
    duration,
  }
}

export function getShipFrontPosition(ship: Ship): THREE.Vector3 {
  const frontOffset = new THREE.Vector3(
    Math.sin(ship.rotation.y) * 5,
    0,
    Math.cos(ship.rotation.y) * 5
  )
  return ship.position.clone().add(frontOffset)
}
