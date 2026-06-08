export type ElementType = 'fire' | 'ice' | 'wind' | 'earth'

export interface Gem {
  id: string
  element: ElementType
}

export interface Cell {
  row: number
  col: number
  gem: Gem | null
  owner: 1 | 2 | null
  isFortified: boolean
  isFrozen: boolean
  frozenBy: 1 | 2 | null
}

export interface Player {
  id: 1 | 2
  name: string
  hand: Gem[]
  territoryCount: number
}

export type GamePhase = 'select' | 'place' | 'resolving' | 'gameover'

export interface LineMatch {
  cells: { row: number; col: number }[]
  element: ElementType
}

export interface ElementEffectResult {
  type: ElementType
  affectedCells: { row: number; col: number }[]
  description: string
}

export interface AnimationEvent {
  type: 'place' | 'eliminate' | 'territory' | 'element' | 'victory'
  row: number
  col: number
  element?: ElementType
  player?: 1 | 2
  data?: unknown
}

export const ELEMENT_COLORS: Record<ElementType, string> = {
  fire: '#FF4500',
  ice: '#00BFFF',
  wind: '#00CED1',
  earth: '#8B6914',
}

export const ELEMENT_GLOW: Record<ElementType, string> = {
  fire: '#FF6B35',
  ice: '#87CEEB',
  wind: '#40E0D0',
  earth: '#DAA520',
}

export const ELEMENT_NAMES: Record<ElementType, string> = {
  fire: '火',
  ice: '冰',
  wind: '风',
  earth: '土',
}

export const BOARD_SIZE = 6
export const WIN_TERRITORY = 18
export const MAX_HAND_SIZE = 5

const DIRECTIONS = [
  [-1, 0], [1, 0], [0, -1], [0, 1],
  [-1, -1], [-1, 1], [1, -1], [1, 1],
]

export function createGem(element: ElementType): Gem {
  return {
    id: `gem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    element,
  }
}

export function randomElement(): ElementType {
  const elements: ElementType[] = ['fire', 'ice', 'wind', 'earth']
  return elements[Math.floor(Math.random() * elements.length)]
}

export function createEmptyCell(row: number, col: number): Cell {
  return {
    row,
    col,
    gem: null,
    owner: null,
    isFortified: false,
    isFrozen: false,
    frozenBy: null,
  }
}

export function createBoard(): Cell[][] {
  const board: Cell[][] = []
  for (let r = 0; r < BOARD_SIZE; r++) {
    const row: Cell[] = []
    for (let c = 0; c < BOARD_SIZE; c++) {
      row.push(createEmptyCell(r, c))
    }
    board.push(row)
  }
  return board
}

export function findLineMatches(board: Cell[][], row: number, col: number): LineMatch[] {
  const cell = board[row][col]
  if (!cell.gem) return []

  const matches: LineMatch[] = []
  const visitedDirs = new Set<string>()

  for (const [dr, dc] of DIRECTIONS) {
    const dirKey = `${dr},${dc}`
    const oppKey = `${-dr},${-dc}`
    if (visitedDirs.has(dirKey) || visitedDirs.has(oppKey)) continue
    visitedDirs.add(dirKey)

    const line: { row: number; col: number }[] = [{ row, col }]
    let r = row + dr
    let c = col + dc
    while (
      r >= 0 && r < BOARD_SIZE &&
      c >= 0 && c < BOARD_SIZE &&
      board[r][c].gem &&
      board[r][c].gem!.element === cell.gem!.element
    ) {
      line.push({ row: r, col: c })
      r += dr
      c += dc
    }

    r = row - dr
    c = col - dc
    while (
      r >= 0 && r < BOARD_SIZE &&
      c >= 0 && c < BOARD_SIZE &&
      board[r][c].gem &&
      board[r][c].gem!.element === cell.gem!.element
    ) {
      line.push({ row: r, col: c })
      r -= dr
      c -= dc
    }

    if (line.length >= 3) {
      matches.push({
        cells: line,
        element: cell.gem!.element,
      })
    }
  }

  return matches
}

export function getAdjacentCells(row: number, col: number): { row: number; col: number }[] {
  const result: { row: number; col: number }[] = []
  for (const [dr, dc] of DIRECTIONS) {
    const r = row + dr
    const c = col + dc
    if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
      result.push({ row: r, col: c })
    }
  }
  return result
}
