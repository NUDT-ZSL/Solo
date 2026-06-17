import { EventEmitter } from './EventBus'
import type { Tile, Position, Fragment, Door } from './types'

type EventBus = EventEmitter<Record<string, unknown>>

const FREQUENCIES = [440, 523, 659, 784, 880, 1047]

type Grid = Tile[][]

export default class MazeEngine {
  private eventBus: EventBus
  private grid: Grid = []
  private gridW = 0
  private gridH = 0
  private fragments: Fragment[] = []
  private doors: Door[] = []

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus
  }

  generate(width: number, height: number, level: number): void {
    this.gridW = 2 * width + 1
    this.gridH = 2 * height + 1
    this.fragments = []
    this.doors = []

    this.grid = []
    for (let r = 0; r < this.gridH; r++) {
      const row: Tile[] = []
      for (let c = 0; c < this.gridW; c++) {
        row.push({ x: c, y: r, type: 'wall', wallType: 'stone' })
      }
      this.grid.push(row)
    }

    const visited: boolean[][] = Array.from({ length: height }, () =>
      Array(width).fill(false)
    )

    const stack: Position[] = []
    const startCell: Position = { x: 0, y: 0 }
    visited[0][0] = true
    this.grid[1][1].type = 'start'
    stack.push(startCell)

    while (stack.length > 0) {
      const current = stack[stack.length - 1]
      const neighbors = this._getUnvisitedNeighbors(current.x, current.y, width, height, visited)

      if (neighbors.length === 0) {
        stack.pop()
      } else {
        const next = neighbors[Math.floor(Math.random() * neighbors.length)]
        visited[next.y][next.x] = true

        const wallY = 2 * current.y + 1 + (next.y - current.y)
        const wallX = 2 * current.x + 1 + (next.x - current.x)
        this.grid[wallY][wallX].type = 'path'

        const cellY = 2 * next.y + 1
        const cellX = 2 * next.x + 1
        if (this.grid[cellY][cellX].type !== 'start') {
          this.grid[cellY][cellX].type = 'path'
        }

        stack.push(next)
      }
    }

    const endY = 2 * (height - 1) + 1
    const endX = 2 * (width - 1) + 1
    this.grid[endY][endX].type = 'end'

    this._placeFragments(level)
    this._placeDoors()
    this._assignWallTypes(level)

    this.eventBus.emit('mazeGenerated', { width, height, level })
  }

  getTile(x: number, y: number): Tile {
    if (x < 0 || x >= this.gridW || y < 0 || y >= this.gridH) {
      return { x, y, type: 'wall', wallType: 'stone' }
    }
    return this.grid[y][x]
  }

  checkCollision(x: number, y: number): boolean {
    const tile = this.getTile(x, y)
    if (tile.type === 'wall') return true
    if (tile.type === 'door' && !tile.isOpen) return true
    return false
  }

  getNeighbors(x: number, y: number): Tile[] {
    return [
      this.getTile(x, y - 1),
      this.getTile(x, y + 1),
      this.getTile(x - 1, y),
      this.getTile(x + 1, y),
    ]
  }

  unlockDoor(doorId: string): void {
    const door = this.doors.find(d => d.id === doorId)
    if (!door) return

    door.isOpen = true
    door.openProgress = 0

    const tile = this.grid[door.position.y][door.position.x]
    tile.isOpen = true

    this.eventBus.emit('pathUnlocked', { doorId, position: door.position })
  }

  collectFragment(fragmentId: string): number {
    const frag = this.fragments.find(f => f.id === fragmentId)
    if (!frag || frag.collected) return 0

    frag.collected = true

    const tile = this.grid[frag.position.y][frag.position.x]
    tile.type = 'path'

    return frag.frequency
  }

  getGrid(): Tile[][] {
    return this.grid
  }

  getGridSize(): { w: number; h: number } {
    return { w: this.gridW, h: this.gridH }
  }

  getFragments(): Fragment[] {
    return this.fragments
  }

  getDoors(): Door[] {
    return this.doors
  }

  getStartPosition(): Position {
    return { x: 1, y: 1 }
  }

  getEndPosition(): Position {
    return { x: this.gridW - 2, y: this.gridH - 2 }
  }

  private _getUnvisitedNeighbors(
    cx: number,
    cy: number,
    w: number,
    h: number,
    visited: boolean[][]
  ): Position[] {
    const dirs = [
      { x: 0, y: -1 },
      { x: 0, y: 1 },
      { x: -1, y: 0 },
      { x: 1, y: 0 },
    ]
    const result: Position[] = []
    for (const d of dirs) {
      const nx = cx + d.x
      const ny = cy + d.y
      if (nx >= 0 && nx < w && ny >= 0 && ny < h && !visited[ny][nx]) {
        result.push({ x: nx, y: ny })
      }
    }
    return result
  }

  private _findDeadEnds(): Position[] {
    const deadEnds: Position[] = []

    for (let r = 1; r < this.gridH; r += 2) {
      for (let c = 1; c < this.gridW; c += 2) {
        const tile = this.grid[r][c]
        if (tile.type !== 'path') continue

        const openNeighbors = this._countOpenNeighbors(c, r)
        if (openNeighbors === 1) {
          deadEnds.push({ x: c, y: r })
        }
      }
    }

    return deadEnds
  }

  private _countOpenNeighbors(x: number, y: number): number {
    const dirs = [
      { dx: 0, dy: -1 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
      { dx: 1, dy: 0 },
    ]
    let count = 0
    for (const d of dirs) {
      const nx = x + d.dx
      const ny = y + d.dy
      if (nx >= 0 && nx < this.gridW && ny >= 0 && ny < this.gridH) {
        const neighbor = this.grid[ny][nx]
        if (neighbor.type !== 'wall') count++
      }
    }
    return count
  }

  private _placeFragments(level: number): void {
    const count = level + 2
    const deadEnds = this._findDeadEnds()

    const shuffled = deadEnds.sort(() => Math.random() - 0.5)
    const selected = shuffled.slice(0, Math.min(count, shuffled.length))

    const dirs = [
      { dx: 0, dy: -1 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
      { dx: 1, dy: 0 },
    ]

    for (let i = 0; i < selected.length; i++) {
      const pos = selected[i]
      const freq = FREQUENCIES[Math.floor(Math.random() * FREQUENCIES.length)]
      const id = `frag-${i}`

      this.grid[pos.y][pos.x].type = 'fragment'
      this.grid[pos.y][pos.x].fragmentId = id

      for (const d of dirs) {
        const wx = pos.x + d.dx
        const wy = pos.y + d.dy
        if (wx >= 0 && wx < this.gridW && wy >= 0 && wy < this.gridH) {
          if (this.grid[wy][wx].type === 'wall') {
            this.grid[wy][wx].isFragmentWall = true
          }
        }
      }

      this.fragments.push({
        id,
        position: pos,
        frequency: freq,
        collected: false,
      })
    }
  }

  private _placeDoors(): void {
    const doorCount = Math.min(2, this.fragments.length)
    const shuffledFrags = [...this.fragments].sort(() => Math.random() - 0.5)
    const doorFragments = shuffledFrags.slice(0, doorCount)

    for (let i = 0; i < doorFragments.length; i++) {
      const frag = doorFragments[i]
      const doorPos = this._findWallAdjacentToPath(frag.position)
      if (!doorPos) continue

      const id = `door-${i}`
      const tile = this.grid[doorPos.y][doorPos.x]

      tile.type = 'door'
      tile.doorId = id
      tile.doorFrequency = frag.frequency
      tile.isOpen = false
      tile.hasTuningFork = true
      tile.tuningForkActivated = false

      this.doors.push({
        id,
        position: doorPos,
        frequency: frag.frequency,
        isOpen: false,
        openProgress: 0,
      })
    }
  }

  private _findWallAdjacentToPath(pos: Position): Position | null {
    const dirs = [
      { dx: 0, dy: -1 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
      { dx: 1, dy: 0 },
    ]
    const candidates: Position[] = []

    for (const d of dirs) {
      const wx = pos.x + d.dx
      const wy = pos.y + d.dy
      if (wx >= 0 && wx < this.gridW && wy >= 0 && wy < this.gridH) {
        const t = this.grid[wy][wx]
        if (t.type === 'wall') {
          const hasPathNeighbor = this._hasAdjacentPathCell(wx, wy)
          if (hasPathNeighbor) {
            candidates.push({ x: wx, y: wy })
          }
        }
      }
    }

    if (candidates.length === 0) return null
    return candidates[Math.floor(Math.random() * candidates.length)]
  }

  private _hasAdjacentPathCell(x: number, y: number): boolean {
    const dirs = [
      { dx: 0, dy: -1 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
      { dx: 1, dy: 0 },
    ]
    for (const d of dirs) {
      const nx = x + d.dx
      const ny = y + d.dy
      if (nx >= 0 && nx < this.gridW && ny >= 0 && ny < this.gridH) {
        if (this.grid[ny][nx].type !== 'wall') return true
      }
    }
    return false
  }

  private _markFragmentWalls(): void {
    const dirs = [
      { dx: 0, dy: -1 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
      { dx: 1, dy: 0 },
    ]

    for (const frag of this.fragments) {
      for (const d of dirs) {
        const nx = frag.position.x + d.dx
        const ny = frag.position.y + d.dy
        if (nx >= 0 && nx < this.gridW && ny >= 0 && ny < this.gridH) {
          const neighbor = this.grid[ny][nx]
          if (neighbor.type === 'wall') {
            neighbor.isFragmentWall = true
          }
        }
      }
    }
  }

  getFragmentWalls(): Position[] {
    const result: Position[] = []
    for (let r = 0; r < this.gridH; r++) {
      for (let c = 0; c < this.gridW; c++) {
        const tile = this.grid[r][c]
        if (tile.isFragmentWall === true) {
          result.push({ x: c, y: r })
        }
      }
    }
    return result
  }

  private _assignWallTypes(level: number): void {
    this._markFragmentWalls()

    const wallTiles: Position[] = []

    for (let r = 0; r < this.gridH; r++) {
      for (let c = 0; c < this.gridW; c++) {
        const tile = this.grid[r][c]
        if (tile.type !== 'wall') continue
        if (tile.isFragmentWall) continue

        const pathNeighborCount = this._countOpenNeighbors(c, r)
        if (pathNeighborCount < 2) continue

        wallTiles.push({ x: c, y: r })
      }
    }

    const shuffled = wallTiles.sort(() => Math.random() - 0.5)
    const crystalCount = Math.floor(shuffled.length * 0.2)
    const metalCount = Math.floor(shuffled.length * 0.1)

    for (let i = 0; i < crystalCount && i < shuffled.length; i++) {
      const pos = shuffled[i]
      this.grid[pos.y][pos.x].wallType = 'crystal'
    }

    for (let i = crystalCount; i < crystalCount + metalCount && i < shuffled.length; i++) {
      const pos = shuffled[i]
      this.grid[pos.y][pos.x].wallType = 'metal'
    }
  }
}
