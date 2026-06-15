export interface WallData {
  id: string
  x: number
  z: number
  orientation: 'horizontal' | 'vertical'
  colorHue: number
  reflectivity: number
  transparency: number
  isCorrectPath: boolean
}

export interface CellData {
  row: number
  col: number
  visited: boolean
  walls: {
    top: boolean
    right: boolean
    bottom: boolean
    left: boolean
  }
}

export interface MazeData {
  gridSize: number
  cellSize: number
  wallHeight: number
  cells: CellData[][]
  walls: WallData[]
  startPosition: { x: number; z: number }
  goalPosition: { x: number; z: number }
  correctPathCells: Set<string>
}

const GRID_SIZE = 20
const CELL_SIZE = 2
const WALL_HEIGHT = 3
const BASE_REFLECTIVITY = 0.6
const BASE_TRANSPARENCY = 0.4
const HUE_COUNT = 12
const MIN_HUE_DIFF = 30

function hslToHex(h: number, s: number = 70, l: number = 55): string {
  const c = (1 - Math.abs(2 * l / 100 - 1)) * s / 100
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l / 100 - c / 2
  let r = 0, g = 0, b = 0
  if (h >= 0 && h < 60) { r = c; g = x; b = 0 }
  else if (h < 120) { r = x; g = c; b = 0 }
  else if (h < 180) { r = 0; g = c; b = x }
  else if (h < 240) { r = 0; g = x; b = c }
  else if (h < 300) { r = x; g = 0; b = c }
  else if (h < 360) { r = c; g = 0; b = x }
  const toHex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

function generateHues(): number[] {
  const hues: number[] = []
  const step = 360 / HUE_COUNT
  for (let i = 0; i < HUE_COUNT; i++) {
    hues.push(Math.round(i * step + Math.random() * step * 0.3))
  }
  return hues
}

function getRandomHue(hues: number[], neighborHues: number[]): number {
  const candidates = hues.filter(h => {
    return neighborHues.every(nh => {
      const diff = Math.min(Math.abs(h - nh), 360 - Math.abs(h - nh))
      return diff >= MIN_HUE_DIFF
    })
  })
  if (candidates.length === 0) return hues[Math.floor(Math.random() * hues.length)]
  return candidates[Math.floor(Math.random() * candidates.length)]
}

function createCells(gridSize: number): CellData[][] {
  const cells: CellData[][] = []
  for (let r = 0; r < gridSize; r++) {
    cells[r] = []
    for (let c = 0; c < gridSize; c++) {
      cells[r][c] = {
        row: r,
        col: c,
        visited: false,
        walls: { top: true, right: true, bottom: true, left: true }
      }
    }
  }
  return cells
}

function generateMazeRecursive(cells: CellData[][], gridSize: number): void {
  const stack: CellData[] = []
  const start = cells[0][0]
  start.visited = true
  stack.push(start)

  while (stack.length > 0) {
    const current = stack[stack.length - 1]
    const { row, col } = current
    const neighbors: { cell: CellData; dir: 'top' | 'right' | 'bottom' | 'left' }[] = []

    if (row > 0 && !cells[row - 1][col].visited)
      neighbors.push({ cell: cells[row - 1][col], dir: 'top' })
    if (col < gridSize - 1 && !cells[row][col + 1].visited)
      neighbors.push({ cell: cells[row][col + 1], dir: 'right' })
    if (row < gridSize - 1 && !cells[row + 1][col].visited)
      neighbors.push({ cell: cells[row + 1][col], dir: 'bottom' })
    if (col > 0 && !cells[row][col - 1].visited)
      neighbors.push({ cell: cells[row][col - 1], dir: 'left' })

    if (neighbors.length === 0) {
      stack.pop()
      continue
    }

    const { cell: next, dir } = neighbors[Math.floor(Math.random() * neighbors.length)]
    current.walls[dir] = false
    const opposite: Record<string, 'top' | 'right' | 'bottom' | 'left'> = {
      top: 'bottom', right: 'left', bottom: 'top', left: 'right'
    }
    next.walls[opposite[dir]] = false
    next.visited = true
    stack.push(next)
  }
}

function findCorrectPath(cells: CellData[][], gridSize: number): Set<string> {
  const startRow = 0, startCol = 0
  const endRow = gridSize - 1, endCol = gridSize - 1
  const queue: { r: number; c: number; path: string[] }[] = [{ r: startRow, c: startCol, path: [`${startRow},${startCol}`] }]
  const visited = new Set<string>()
  visited.add(`${startRow},${startCol}`)

  while (queue.length > 0) {
    const { r, c, path } = queue.shift()!
    if (r === endRow && c === endCol) return new Set(path)
    const cell = cells[r][c]
    if (!cell.walls.top && r > 0 && !visited.has(`${r - 1},${c}`)) {
      visited.add(`${r - 1},${c}`)
      queue.push({ r: r - 1, c, path: [...path, `${r - 1},${c}`] })
    }
    if (!cell.walls.right && c < gridSize - 1 && !visited.has(`${r},${c + 1}`)) {
      visited.add(`${r},${c + 1}`)
      queue.push({ r, c: c + 1, path: [...path, `${r},${c + 1}`] })
    }
    if (!cell.walls.bottom && r < gridSize - 1 && !visited.has(`${r + 1},${c}`)) {
      visited.add(`${r + 1},${c}`)
      queue.push({ r: r + 1, c, path: [...path, `${r + 1},${c}`] })
    }
    if (!cell.walls.left && c > 0 && !visited.has(`${r},${c - 1}`)) {
      visited.add(`${r},${c - 1}`)
      queue.push({ r, c: c - 1, path: [...path, `${r},${c - 1}`] })
    }
  }
  return new Set()
}

export function generateMaze(): MazeData {
  const hues = generateHues()
  const cells = createCells(GRID_SIZE)
  generateMazeRecursive(cells, GRID_SIZE)
  const correctPath = findCorrectPath(cells, GRID_SIZE)

  const walls: WallData[] = []
  const horizontalWallHues: Map<string, number> = new Map()
  const verticalWallHues: Map<string, number> = new Map()

  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const cell = cells[r][c]
      const worldX = c * CELL_SIZE - (GRID_SIZE * CELL_SIZE) / 2 + CELL_SIZE / 2
      const worldZ = r * CELL_SIZE - (GRID_SIZE * CELL_SIZE) / 2 + CELL_SIZE / 2
      const cellKey = `${r},${c}`
      const onPath = correctPath.has(cellKey)

      if (cell.walls.top) {
        const key = `h_${r}_${c}`
        const neighborKeys = [
          `h_${r}_${c - 1}`, `v_${r - 1}_${c}`, `v_${r - 1}_${c + 1}`
        ]
        const neighborHues: number[] = []
        for (const nk of neighborKeys) {
          if (horizontalWallHues.has(nk)) neighborHues.push(horizontalWallHues.get(nk)!)
          if (verticalWallHues.has(nk)) neighborHues.push(verticalWallHues.get(nk)!)
        }
        const hue = getRandomHue(hues, neighborHues)
        horizontalWallHues.set(key, hue)
        walls.push({
          id: `wall_top_${r}_${c}`,
          x: worldX,
          z: worldZ - CELL_SIZE / 2,
          orientation: 'horizontal',
          colorHue: hue,
          reflectivity: BASE_REFLECTIVITY + (Math.random() - 0.5) * 0.1,
          transparency: BASE_TRANSPARENCY + (Math.random() - 0.5) * 0.1,
          isCorrectPath: onPath
        })
      }
      if (cell.walls.left) {
        const key = `v_${r}_${c}`
        const neighborKeys = [
          `v_${r - 1}_${c}`, `h_${r}_${c - 1}`, `h_${r + 1}_${c - 1}`
        ]
        const neighborHues: number[] = []
        for (const nk of neighborKeys) {
          if (horizontalWallHues.has(nk)) neighborHues.push(horizontalWallHues.get(nk)!)
          if (verticalWallHues.has(nk)) neighborHues.push(verticalWallHues.get(nk)!)
        }
        const hue = getRandomHue(hues, neighborHues)
        verticalWallHues.set(key, hue)
        walls.push({
          id: `wall_left_${r}_${c}`,
          x: worldX - CELL_SIZE / 2,
          z: worldZ,
          orientation: 'vertical',
          colorHue: hue,
          reflectivity: BASE_REFLECTIVITY + (Math.random() - 0.5) * 0.1,
          transparency: BASE_TRANSPARENCY + (Math.random() - 0.5) * 0.1,
          isCorrectPath: onPath
        })
      }
      if (r === GRID_SIZE - 1 && cell.walls.bottom) {
        const key = `h_${r + 1}_${c}`
        const hue = getRandomHue(hues, [])
        horizontalWallHues.set(key, hue)
        walls.push({
          id: `wall_bottom_${r}_${c}`,
          x: worldX,
          z: worldZ + CELL_SIZE / 2,
          orientation: 'horizontal',
          colorHue: hue,
          reflectivity: BASE_REFLECTIVITY + (Math.random() - 0.5) * 0.1,
          transparency: BASE_TRANSPARENCY + (Math.random() - 0.5) * 0.1,
          isCorrectPath: onPath
        })
      }
      if (c === GRID_SIZE - 1 && cell.walls.right) {
        const key = `v_${r}_${c + 1}`
        const hue = getRandomHue(hues, [])
        verticalWallHues.set(key, hue)
        walls.push({
          id: `wall_right_${r}_${c}`,
          x: worldX + CELL_SIZE / 2,
          z: worldZ,
          orientation: 'vertical',
          colorHue: hue,
          reflectivity: BASE_REFLECTIVITY + (Math.random() - 0.5) * 0.1,
          transparency: BASE_TRANSPARENCY + (Math.random() - 0.5) * 0.1,
          isCorrectPath: onPath
        })
      }
    }
  }

  return {
    gridSize: GRID_SIZE,
    cellSize: CELL_SIZE,
    wallHeight: WALL_HEIGHT,
    cells,
    walls,
    startPosition: {
      x: -GRID_SIZE * CELL_SIZE / 2 + CELL_SIZE / 2,
      z: -GRID_SIZE * CELL_SIZE / 2 + CELL_SIZE / 2
    },
    goalPosition: {
      x: GRID_SIZE * CELL_SIZE / 2 - CELL_SIZE / 2,
      z: GRID_SIZE * CELL_SIZE / 2 - CELL_SIZE / 2
    },
    correctPathCells: correctPath
  }
}

export { hslToHex, WALL_HEIGHT, CELL_SIZE, GRID_SIZE }
