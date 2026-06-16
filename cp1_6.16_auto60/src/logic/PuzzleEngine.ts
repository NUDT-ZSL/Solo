import {
  Gear,
  GearType,
  GearPos,
  MoveRecord,
  PuzzleConfig,
  createGear,
  createEmptyGear,
  DEFAULT_CONFIG,
  GEAR_RADIUS_RATIO
} from '@/utils/gearData'

const GEAR_TYPES: GearType[] = [GearType.LARGE, GearType.SMALL, GearType.SPEED, GearType.CLUTCH]

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function shuffleArray<T>(arr: T[]): T[] {
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

function getGearAt(gears: Gear[], row: number, col: number): Gear | undefined {
  return gears.find(g => g.row === row && g.col === col)
}

function areAdjacent(a: GearPos, b: GearPos): boolean {
  const dr = Math.abs(a.row - b.row)
  const dc = Math.abs(a.col - b.col)
  return (dr === 1 && dc === 0) || (dr === 0 && dc === 1)
}

function canMesh(gearA: Gear, gearB: Gear): boolean {
  if (gearA.isEmpty || gearB.isEmpty) return false
  const ratioA = GEAR_RADIUS_RATIO[gearA.type]
  const ratioB = GEAR_RADIUS_RATIO[gearB.type]
  const combinedRadius = ratioA + ratioB
  return combinedRadius <= 1.6
}

function isRotationAligned(gearA: Gear, gearB: Gear): boolean {
  const rotDiff = Math.abs(gearA.rotation - gearB.rotation) % 180
  return rotDiff === 0 || rotDiff === 90
}

export function generatePuzzle(size: number, difficulty: number): PuzzleConfig {
  const safeSize = Math.max(
    DEFAULT_CONFIG.MIN_SIZE,
    Math.min(DEFAULT_CONFIG.MAX_SIZE, size)
  )
  const safeDifficulty = Math.max(
    DEFAULT_CONFIG.MIN_DIFFICULTY,
    Math.min(DEFAULT_CONFIG.MAX_DIFFICULTY, difficulty)
  )

  const gears: Gear[] = []
  const path: GearPos[] = []

  for (let r = 0; r < safeSize; r++) {
    for (let c = 0; c < safeSize; c++) {
      gears.push(createEmptyGear(r, c))
    }
  }

  let current: GearPos = { row: 0, col: 0 }
  const target: GearPos = { row: safeSize - 1, col: safeSize - 1 }
  path.push({ ...current })

  while (current.row !== target.row || current.col !== target.col) {
    const possibleMoves: GearPos[] = []
    if (current.row < safeSize - 1) possibleMoves.push({ row: current.row + 1, col: current.col })
    if (current.col < safeSize - 1) possibleMoves.push({ row: current.row, col: current.col + 1 })
    if (current.row > 0 && Math.random() > 0.7) possibleMoves.push({ row: current.row - 1, col: current.col })
    if (current.col > 0 && Math.random() > 0.7) possibleMoves.push({ row: current.row, col: current.col - 1 })

    const filtered = possibleMoves.filter(m => !path.some(p => p.row === m.row && p.col === m.col))
    if (filtered.length === 0) break

    current = randomChoice(filtered)
    path.push({ ...current })
  }

  const sourceGear = createGear(GearType.LARGE, 0, 0, {
    isSource: true,
    rotation: 0
  })
  const idx00 = gears.findIndex(g => g.row === 0 && g.col === 0)
  gears[idx00] = sourceGear

  const targetGear = createGear(GearType.LARGE, safeSize - 1, safeSize - 1, {
    isTarget: true,
    rotation: randomInt(0, 3) * 90
  })
  const idxE = gears.findIndex(g => g.row === safeSize - 1 && g.col === safeSize - 1)
  gears[idxE] = targetGear

  for (let i = 1; i < path.length - 1; i++) {
    const pos = path[i]
    const gearType = randomChoice(GEAR_TYPES)
    const rotation = randomInt(0, 3) * 90
    const gear = createGear(gearType, pos.row, pos.col, { rotation })
    const idx = gears.findIndex(g => g.row === pos.row && g.col === pos.col)
    gears[idx] = gear
  }

  const extraCount = Math.floor(safeDifficulty * safeSize * 0.8)
  const emptyPositions = gears
    .filter(g => g.isEmpty)
    .map(g => ({ row: g.row, col: g.col }))
  const shuffled = shuffleArray(emptyPositions)

  for (let i = 0; i < Math.min(extraCount, shuffled.length); i++) {
    const pos = shuffled[i]
    const gearType = randomChoice(GEAR_TYPES)
    const rotation = randomInt(0, 3) * 90
    const gear = createGear(gearType, pos.row, pos.col, { rotation })
    const idx = gears.findIndex(g => g.row === pos.row && g.col === pos.col)
    gears[idx] = gear
  }

  for (const gear of gears) {
    if (!gear.isEmpty && !gear.isSource && !gear.isTarget) {
      gear.rotation = randomInt(0, 3) * 90
    }
  }

  const minPathLength = path.length
  const maxSteps = Math.ceil(minPathLength * DEFAULT_CONFIG.STEP_MULTIPLIER)

  return {
    size: safeSize,
    difficulty: safeDifficulty,
    gears,
    maxSteps,
    minPathLength
  }
}

export function findConnectedPath(gears: Gear[]): Gear[] {
  const sourceGear = gears.find(g => g.isSource)
  const targetGear = gears.find(g => g.isTarget)
  if (!sourceGear || !targetGear) return []

  const visited = new Set<string>()
  const queue: { gear: Gear; path: Gear[] }[] = [{ gear: sourceGear, path: [sourceGear] }]
  visited.add(`${sourceGear.row},${sourceGear.col}`)

  while (queue.length > 0) {
    const { gear, path } = queue.shift()!

    if (gear.row === targetGear.row && gear.col === targetGear.col) {
      return path
    }

    const neighbors = gears.filter(g =>
      !g.isEmpty &&
      !visited.has(`${g.row},${g.col}`) &&
      areAdjacent(gear, g) &&
      canMesh(gear, g) &&
      isRotationAligned(gear, g)
    )

    for (const neighbor of neighbors) {
      visited.add(`${neighbor.row},${neighbor.col}`)
      queue.push({ gear: neighbor, path: [...path, neighbor] })
    }
  }

  return []
}

export function validatePath(path: GearPos[], puzzle: PuzzleConfig): { valid: boolean; errorPositions: GearPos[] } {
  const errorPositions: GearPos[] = []

  if (path.length < 2) {
    return { valid: false, errorPositions: path }
  }

  for (let i = 0; i < path.length - 1; i++) {
    const posA = path[i]
    const posB = path[i + 1]
    const gearA = getGearAt(puzzle.gears, posA.row, posA.col)
    const gearB = getGearAt(puzzle.gears, posB.row, posB.col)

    if (!gearA || !gearB || gearA.isEmpty || gearB.isEmpty) {
      errorPositions.push(posA, posB)
      continue
    }

    if (!areAdjacent(posA, posB)) {
      errorPositions.push(posA, posB)
      continue
    }

    if (!canMesh(gearA, gearB)) {
      errorPositions.push(posA, posB)
      continue
    }

    if (!isRotationAligned(gearA, gearB)) {
      errorPositions.push(posB)
    }
  }

  return { valid: errorPositions.length === 0, errorPositions }
}

export function getLinkedGears(clickedGear: Gear, allGears: Gear[]): Gear[] {
  if (clickedGear.isEmpty) return []

  const linked = new Set<string>()
  const queue: Gear[] = [clickedGear]
  linked.add(clickedGear.id)

  while (queue.length > 0) {
    const current = queue.shift()!
    const neighbors = allGears.filter(g =>
      !g.isEmpty &&
      !linked.has(g.id) &&
      areAdjacent(current, g) &&
      canMesh(current, g)
    )

    for (const neighbor of neighbors) {
      linked.add(neighbor.id)
      queue.push(neighbor)
    }
  }

  return allGears.filter(g => linked.has(g.id))
}

export function countSteps(moves: MoveRecord[]): number {
  return moves.length
}

export function findNextHintGear(gears: Gear[]): Gear | null {
  const connected = findConnectedPath(gears)
  if (connected.length === 0) return null

  const sourceGear = gears.find(g => g.isSource)
  if (!sourceGear) return null

  const frontier = connected[connected.length - 1]
  const candidates = gears.filter(g =>
    !g.isEmpty &&
    !g.isSource &&
    !connected.some(c => c.id === g.id) &&
    areAdjacent(frontier, g) &&
    canMesh(frontier, g)
  )

  if (candidates.length === 0) {
    const nonConnected = gears.filter(g =>
      !g.isEmpty &&
      !connected.some(c => c.id === g.id)
    )
    return nonConnected.length > 0 ? nonConnected[0] : null
  }

  return candidates[0]
}

export function generateRustTexture(coverage: number): string {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''

  ctx.fillStyle = '#8D6E63'
  ctx.fillRect(0, 0, 256, 256)

  const clampedCoverage = Math.min(1, Math.max(0, coverage))
  const rustAlpha = clampedCoverage * 0.8

  for (let i = 0; i < 8000 * clampedCoverage; i++) {
    const x = Math.random() * 256
    const y = Math.random() * 256
    const size = Math.random() * 3 + 1
    const rustColors = ['#8B4513', '#A0522D', '#CD853F', '#D2691E', '#B8860B']
    ctx.fillStyle = randomChoice(rustColors)
    ctx.globalAlpha = rustAlpha * (0.5 + Math.random() * 0.5)
    ctx.beginPath()
    ctx.arc(x, y, size, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.globalAlpha = 1
  return canvas.toDataURL()
}
