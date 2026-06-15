import type { MazeCell, TotemState, EyeColor, EyeDirection, Fragment } from './types'
import { EYE_COLORS, EYE_DIRECTIONS, COMPLEMENTARY } from './types'

interface MazeData {
  grid: MazeCell[][]
  totems: TotemState[]
  playerStart: { x: number; y: number }
  exitPos: { x: number; y: number }
  gridWidth: number
  gridHeight: number
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function carveMaze(cols: number, rows: number): boolean[][] {
  const w = 2 * cols + 1
  const h = 2 * rows + 1
  const visited: boolean[][] = Array.from({ length: rows }, () =>
    Array(cols).fill(false)
  )
  const grid: boolean[][] = Array.from({ length: h }, () => Array(w).fill(false))

  const stack: [number, number][] = []
  const dirs = [
    [0, -1],
    [0, 1],
    [-1, 0],
    [1, 0],
  ]

  const startR = 0
  const startC = 0
  visited[startR][startC] = true
  grid[1][1] = true
  stack.push([startC, startR])

  while (stack.length > 0) {
    const [cx, cy] = stack[stack.length - 1]
    const neighbors: number[][] = []
    for (const [dx, dy] of dirs) {
      const nx = cx + dx
      const ny = cy + dy
      if (nx >= 0 && nx < cols && ny >= 0 && ny < rows && !visited[ny][nx]) {
        neighbors.push([nx, ny, dx, dy])
      }
    }
    if (neighbors.length === 0) {
      stack.pop()
      continue
    }
    const [nx, ny, dx, dy] = neighbors[Math.floor(Math.random() * neighbors.length)]
    visited[ny][nx] = true
    const gx1 = 2 * cx + 1
    const gy1 = 2 * cy + 1
    const gx2 = 2 * nx + 1
    const gy2 = 2 * ny + 1
    const wallX = gx1 + dx
    const wallY = gy1 + dy
    grid[wallY][wallX] = true
    grid[gy2][gx2] = true
    stack.push([nx, ny])
  }

  return grid
}

export function generateMaze(
  level: number,
  cols: number,
  rows: number,
  totemCount: number
): MazeData {
  const w = 2 * cols + 1
  const h = 2 * rows + 1
  const passages = carveMaze(cols, rows)

  const grid: MazeCell[][] = Array.from({ length: h }, (_, y) =>
    Array.from({ length: w }, (_, x) => ({
      type: passages[y][x] ? 'empty' as const : 'wall' as const,
      totem: null,
      isWalkable: passages[y][x],
      fragmentCollected: false,
    }))
  )

  const passageCells: [number, number][] = []
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      if (passages[y][x]) {
        passageCells.push([x, y])
      }
    }
  }

  const shuffled = shuffle(passageCells)

  const playerStart = { x: 1, y: 1 }
  const exitPos = { x: w - 2, y: h - 2 }
  grid[exitPos.y][exitPos.x].type = 'exit'

  const centerX = Math.floor(w / 2)
  const centerY = Math.floor(h / 2)

  const usedPositions = new Set<string>()
  usedPositions.add(`${playerStart.x},${playerStart.y}`)
  usedPositions.add(`${exitPos.x},${exitPos.y}`)
  usedPositions.add(`${centerX},${centerY}`)

  const totemPositions: [number, number][] = []
  for (const [x, y] of shuffled) {
    if (totemPositions.length >= totemCount) break
    const key = `${x},${y}`
    if (usedPositions.has(key)) continue
    let tooClose = false
    for (const [tx, ty] of totemPositions) {
      if (Math.abs(x - tx) + Math.abs(y - ty) < 4) {
        tooClose = true
        break
      }
    }
    if (tooClose) continue
    totemPositions.push([x, y])
    usedPositions.add(key)
  }

  let baseColor: EyeColor
  if (level === 1) {
    baseColor = EYE_COLORS[Math.floor(Math.random() * EYE_COLORS.length)]
  } else {
    baseColor = 'red'
  }

  const totems: TotemState[] = totemPositions.map(([x, y], idx) => {
    let color: EyeColor
    if (level === 1) {
      color = baseColor
    } else {
      if (idx % 2 === 0) {
        color = baseColor
      } else {
        color = COMPLEMENTARY[baseColor]
      }
      if (idx % 4 >= 2) {
        const otherPair = EYE_COLORS.find(
          (c) => c !== baseColor && c !== COMPLEMENTARY[baseColor]
        )!
        color = idx % 4 === 2 ? otherPair : COMPLEMENTARY[otherPair]
      }
    }

    const direction: EyeDirection =
      EYE_DIRECTIONS[Math.floor(Math.random() * EYE_DIRECTIONS.length)]

    const totem: TotemState = {
      id: `totem-${idx}`,
      gridX: x,
      gridY: y,
      eyeColor: color,
      eyeDirection: direction,
      isMatched: false,
      rotationAngle: 0,
      targetAngle: 0,
    }

    grid[y][x].type = 'totem'
    grid[y][x].totem = totem

    return totem
  })

  return {
    grid,
    totems,
    playerStart,
    exitPos,
    gridWidth: w,
    gridHeight: h,
  }
}

export function generateFragmentPositions(
  grid: MazeCell[][],
  count: number,
  excludePositions: Set<string>
): Fragment[] {
  const candidates: [number, number][] = []
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[0].length; x++) {
      if (grid[y][x].isWalkable && !excludePositions.has(`${x},${y}`)) {
        candidates.push([x, y])
      }
    }
  }
  const shuffled = shuffle(candidates)
  return shuffled.slice(0, count).map(([x, y]) => ({
    gridX: x,
    gridY: y,
    collected: false,
    sparklePhase: Math.random() * Math.PI * 2,
  }))
}
