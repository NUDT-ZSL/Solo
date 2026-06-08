import type { TotemState, EyeDirection } from './types'
import { EYE_DIRECTIONS, COMPLEMENTARY, getInwardDirection } from './types'

export function rotateDirection(dir: EyeDirection): EyeDirection {
  const idx = EYE_DIRECTIONS.indexOf(dir)
  return EYE_DIRECTIONS[(idx + 1) % 4]
}

export function rotateTotem(
  totem: TotemState,
  chainEnabled: boolean,
  allTotems: TotemState[]
): TotemState[] {
  const newDirection = rotateDirection(totem.eyeDirection)
  const updated: TotemState = {
    ...totem,
    eyeDirection: newDirection,
    rotationAngle: totem.targetAngle,
    targetAngle: totem.targetAngle + 90,
    isMatched: false,
  }

  const results = allTotems.map((t) =>
    t.id === totem.id ? updated : { ...t, isMatched: false }
  )

  if (chainEnabled) {
    const neighbors = getNeighborTotems(totem.gridX, totem.gridY, results)
    for (const neighbor of neighbors) {
      const idx = results.findIndex((t) => t.id === neighbor.id)
      if (idx !== -1) {
        results[idx] = {
          ...results[idx],
          eyeDirection: rotateDirection(results[idx].eyeDirection),
          rotationAngle: results[idx].targetAngle,
          targetAngle: results[idx].targetAngle + 90,
        }
      }
    }
  }

  return results
}

function getNeighborTotems(
  x: number,
  y: number,
  totems: TotemState[]
): TotemState[] {
  return totems.filter(
    (t) =>
      (Math.abs(t.gridX - x) === 2 && t.gridY === y) ||
      (Math.abs(t.gridY - y) === 2 && t.gridX === x)
  )
}

export function checkLevelRule(
  totems: TotemState[],
  level: number,
  centerX: number,
  centerY: number
): boolean {
  if (totems.length === 0) return false

  if (level === 1) {
    return checkLevel1(totems, centerX, centerY)
  } else if (level === 2) {
    return checkLevel2(totems, centerX, centerY)
  }
  return checkLevel3(totems, centerX, centerY)
}

function checkLevel1(
  totems: TotemState[],
  centerX: number,
  centerY: number
): boolean {
  const firstColor = totems[0].eyeColor
  return totems.every((t) => {
    if (t.eyeColor !== firstColor) return false
    const inward = getInwardDirection(t.gridX, t.gridY, centerX, centerY)
    return t.eyeDirection === inward
  })
}

function checkLevel2(
  totems: TotemState[],
  centerX: number,
  centerY: number
): boolean {
  const allFaceCenter = totems.every((t) => {
    const inward = getInwardDirection(t.gridX, t.gridY, centerX, centerY)
    return t.eyeDirection === inward
  })
  if (!allFaceCenter) return false

  for (const t of totems) {
    const neighbors = getNeighborTotems(t.gridX, t.gridY, totems)
    for (const n of neighbors) {
      if (COMPLEMENTARY[t.eyeColor] !== n.eyeColor) return false
    }
  }
  return true
}

function checkLevel3(
  totems: TotemState[],
  centerX: number,
  centerY: number
): boolean {
  return checkLevel2(totems, centerX, centerY)
}

export function getNeighborTotemIds(
  x: number,
  y: number,
  totems: TotemState[]
): string[] {
  return getNeighborTotems(x, y, totems).map((t) => t.id)
}
