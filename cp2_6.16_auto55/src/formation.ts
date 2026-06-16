import * as THREE from 'three'

export enum FormationType {
  DIAMOND = 'diamond',
  V_SHAPE = 'v_shape',
  COLUMN = 'column',
  CIRCLE = 'circle',
  TRIANGLE = 'triangle',
}

export const FORMATION_COLORS: Record<FormationType, string> = {
  [FormationType.DIAMOND]: '#ff4444',
  [FormationType.V_SHAPE]: '#44ff44',
  [FormationType.COLUMN]: '#4444ff',
  [FormationType.CIRCLE]: '#ffaa00',
  [FormationType.TRIANGLE]: '#ffffff',
}

export const FORMATION_NAMES: Record<FormationType, string> = {
  [FormationType.DIAMOND]: '菱形阵型',
  [FormationType.V_SHAPE]: 'V型阵型',
  [FormationType.COLUMN]: '纵队阵型',
  [FormationType.CIRCLE]: '圆圈阵型',
  [FormationType.TRIANGLE]: '三角阵型',
}

const SPACING = 30

export function formationPositions(
  type: FormationType,
  count: number,
  leader: THREE.Vector3,
  spacing: number = SPACING
): THREE.Vector3[] {
  const positions: THREE.Vector3[] = []

  if (count === 0) return positions

  positions.push(leader.clone())

  if (count === 1) return positions

  switch (type) {
    case FormationType.DIAMOND:
      return diamondFormation(count, leader, spacing)

    case FormationType.V_SHAPE:
      return vShapeFormation(count, leader, spacing)

    case FormationType.COLUMN:
      return columnFormation(count, leader, spacing)

    case FormationType.CIRCLE:
      return circleFormation(count, leader, spacing)

    case FormationType.TRIANGLE:
      return triangleFormation(count, leader, spacing)

    default:
      return triangleFormation(count, leader, spacing)
  }
}

function diamondFormation(
  count: number,
  leader: THREE.Vector3,
  spacing: number
): THREE.Vector3[] {
  const positions: THREE.Vector3[] = [leader.clone()]

  if (count === 1) return positions

  const layers = Math.ceil(Math.sqrt(count))
  let index = 1

  for (let layer = 1; layer <= layers && index < count; layer++) {
    for (let x = -layer; x <= layer && index < count; x++) {
      const remainingInLayer = layer * 2 + 1 - Math.abs(x)
      for (let z = 0; z < remainingInLayer && index < count; z++) {
        const zOffset = (z - Math.floor(remainingInLayer / 2)) * spacing
        const pos = new THREE.Vector3(
          leader.x + x * spacing,
          leader.y,
          leader.z + layer * spacing + zOffset
        )
        positions.push(pos)
        index++
      }
    }
  }

  return positions
}

function vShapeFormation(
  count: number,
  leader: THREE.Vector3,
  spacing: number
): THREE.Vector3[] {
  const positions: THREE.Vector3[] = [leader.clone()]

  if (count === 1) return positions

  let index = 1
  let row = 1

  while (index < count) {
    const left = new THREE.Vector3(
      leader.x - row * spacing,
      leader.y,
      leader.z + row * spacing
    )
    positions.push(left)
    index++

    if (index < count) {
      const right = new THREE.Vector3(
        leader.x + row * spacing,
        leader.y,
        leader.z + row * spacing
      )
      positions.push(right)
      index++
    }

    row++
  }

  return positions
}

function columnFormation(
  count: number,
  leader: THREE.Vector3,
  spacing: number
): THREE.Vector3[] {
  const positions: THREE.Vector3[] = [leader.clone()]

  for (let i = 1; i < count; i++) {
    const pos = new THREE.Vector3(
      leader.x,
      leader.y,
      leader.z + i * spacing
    )
    positions.push(pos)
  }

  return positions
}

function circleFormation(
  count: number,
  leader: THREE.Vector3,
  spacing: number
): THREE.Vector3[] {
  const positions: THREE.Vector3[] = [leader.clone()]

  if (count === 1) return positions

  const radius = spacing * Math.ceil(count / 6)
  const angleStep = (Math.PI * 2) / (count - 1)

  for (let i = 0; i < count - 1; i++) {
    const angle = angleStep * i
    const pos = new THREE.Vector3(
      leader.x + Math.cos(angle) * radius,
      leader.y,
      leader.z + Math.sin(angle) * radius
    )
    positions.push(pos)
  }

  return positions
}

function triangleFormation(
  count: number,
  leader: THREE.Vector3,
  spacing: number
): THREE.Vector3[] {
  const positions: THREE.Vector3[] = [leader.clone()]

  if (count === 1) return positions

  let index = 1
  let row = 1

  while (index < count) {
    const shipsInRow = row + 1
    const startX = -(row * spacing) / 2

    for (let i = 0; i < shipsInRow && index < count; i++) {
      const pos = new THREE.Vector3(
        leader.x + startX + i * spacing,
        leader.y,
        leader.z + row * spacing
      )
      positions.push(pos)
      index++
    }

    row++
  }

  return positions
}

export function updateFormation(
  ships: { id: string; formationPosition: THREE.Vector3 | null }[],
  type: FormationType,
  leaderId: string
): THREE.Vector3[] {
  const leader = ships.find(s => s.id === leaderId)
  if (!leader) return []

  const leaderPos = leader.formationPosition || new THREE.Vector3()
  return formationPositions(type, ships.length, leaderPos)
}
