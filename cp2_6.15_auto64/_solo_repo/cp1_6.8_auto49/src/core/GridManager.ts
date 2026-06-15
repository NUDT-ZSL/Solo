import {
  type Cell,
  type Position,
  type Item,
  type Unit,
  type CellType,
  type ItemType,
  GRID_SIZE,
  posKey,
  posEqual,
  getNeighbors,
} from './types'

export class GridManager {
  grid: Cell[][]

  constructor() {
    this.grid = []
    this.initializeGrid()
  }

  initializeGrid(): void {
    this.grid = []
    for (let row = 0; row < GRID_SIZE; row++) {
      const rowCells: Cell[] = []
      for (let col = 0; col < GRID_SIZE; col++) {
        rowCells.push({
          row,
          col,
          type: 'normal',
          occupant: null,
          item: null,
        })
      }
      this.grid.push(rowCells)
    }
  }

  generateObstacles(count: number = 8): void {
    let placed = 0
    const forbidden = new Set<string>()
    for (let c = 0; c < 3; c++) {
      forbidden.add(`0,${c}`)
      forbidden.add(`1,${c}`)
    }
    for (let c = GRID_SIZE - 3; c < GRID_SIZE; c++) {
      forbidden.add(`${GRID_SIZE - 1},${c}`)
      forbidden.add(`${GRID_SIZE - 2},${c}`)
    }

    while (placed < count) {
      const row = Math.floor(Math.random() * GRID_SIZE)
      const col = Math.floor(Math.random() * GRID_SIZE)
      const key = posKey({ row, col })
      if (this.grid[row][col].type === 'normal' && !forbidden.has(key)) {
        this.grid[row][col].type = 'obstacle'
        placed++
      }
    }
  }

  generateItems(count: number = 3): Item[] {
    const items: Item[] = []
    let placed = 0
    const itemTypes: ItemType[] = ['attackBoost', 'moveBoost']

    while (placed < count) {
      const row = Math.floor(Math.random() * GRID_SIZE)
      const col = Math.floor(Math.random() * GRID_SIZE)
      const cell = this.grid[row][col]
      if (cell.type === 'normal' && cell.occupant === null && cell.item === null) {
        const itemType = itemTypes[Math.floor(Math.random() * itemTypes.length)]
        const item: Item = {
          type: itemType,
          value: itemType === 'attackBoost' ? 10 : 1,
          position: { row, col },
          id: `item_${placed}`,
        }
        cell.item = item
        items.push(item)
        placed++
      }
    }
    return items
  }

  getCell(pos: Position): Cell | null {
    if (pos.row < 0 || pos.row >= GRID_SIZE || pos.col < 0 || pos.col >= GRID_SIZE) {
      return null
    }
    return this.grid[pos.row][pos.col]
  }

  isWalkable(pos: Position): boolean {
    const cell = this.getCell(pos)
    if (!cell) return false
    if (cell.type === 'obstacle') return false
    return true
  }

  isOccupied(pos: Position): boolean {
    const cell = this.getCell(pos)
    if (!cell) return true
    return cell.occupant !== null
  }

  placeUnit(unit: Unit): void {
    const cell = this.getCell(unit.position)
    if (cell) {
      cell.occupant = unit
    }
  }

  removeUnit(pos: Position): void {
    const cell = this.getCell(pos)
    if (cell) {
      cell.occupant = null
    }
  }

  moveUnitOnGrid(unit: Unit, from: Position, to: Position): void {
    this.removeUnit(from)
    unit.position = to
    this.placeUnit(unit)
  }

  getMoveableCells(unit: Unit): Position[] {
    const result: Position[] = []
    const visited = new Map<string, number>()
    const queue: { pos: Position; cost: number }[] = [{ pos: unit.position, cost: 0 }]
    visited.set(posKey(unit.position), 0)

    while (queue.length > 0) {
      const current = queue.shift()!
      if (current.cost > 0) {
        const cell = this.getCell(current.pos)
        if (cell && cell.type === 'normal' && cell.occupant === null) {
          result.push(current.pos)
        }
      }

      if (current.cost < unit.moveRange) {
        for (const neighbor of getNeighbors(current.pos)) {
          const key = posKey(neighbor)
          const newCost = current.cost + 1
          if (!visited.has(key) || visited.get(key)! > newCost) {
            if (this.isWalkable(neighbor)) {
              const cell = this.getCell(neighbor)
              if (cell && (cell.occupant === null || posEqual(neighbor, unit.position))) {
                visited.set(key, newCost)
                queue.push({ pos: neighbor, cost: newCost })
              }
            }
          }
        }
      }
    }

    return result
  }

  getAttackableCells(unit: Unit, fromPos?: Position): Position[] {
    const pos = fromPos || unit.position
    const result: Position[] = []
    const range = unit.attackRange

    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const target = { row, col }
        const dist = Math.abs(pos.row - row) + Math.abs(pos.col - col)
        if (dist > 0 && dist <= range) {
          const cell = this.getCell(target)
          if (cell && cell.type !== 'obstacle') {
            result.push(target)
          }
        }
      }
    }

    return result
  }

  getSkillTargets(unit: Unit, fromPos?: Position): Position[] {
    const pos = fromPos || unit.position
    const range = unit.skill.range
    const result: Position[] = []

    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const target = { row, col }
        const dist = Math.abs(pos.row - row) + Math.abs(pos.col - col)
        if (dist > 0 && dist <= range) {
          const cell = this.getCell(target)
          if (cell && cell.type !== 'obstacle') {
            result.push(target)
          }
        }
      }
    }

    return result
  }

  getAttackableEnemies(unit: Unit, fromPos?: Position): Unit[] {
    const attackable = this.getAttackableCells(unit, fromPos)
    const enemies: Unit[] = []
    for (const pos of attackable) {
      const cell = this.getCell(pos)
      if (cell && cell.occupant && cell.occupant.isPlayer !== unit.isPlayer && cell.occupant.isAlive) {
        enemies.push(cell.occupant)
      }
    }
    return enemies
  }

  findPath(from: Position, to: Position, maxDist: number): Position[] | null {
    if (posEqual(from, to)) return [from]

    const visited = new Set<string>()
    const parent = new Map<string, string>()
    const queue: Position[] = [from]
    visited.add(posKey(from))

    while (queue.length > 0) {
      const current = queue.shift()!
      const currentKey = posKey(current)
      const distFromStart = Math.abs(current.row - from.row) + Math.abs(current.col - from.col)

      if (posEqual(current, to)) {
        const path: Position[] = []
        let key = posKey(to)
        while (key !== posKey(from)) {
          const [r, c] = key.split(',').map(Number)
          path.unshift({ row: r, col: c })
          key = parent.get(key)!
        }
        return path
      }

      if (distFromStart >= maxDist) continue

      for (const neighbor of getNeighbors(current)) {
        const nKey = posKey(neighbor)
        if (!visited.has(nKey) && this.isWalkable(neighbor)) {
          const cell = this.getCell(neighbor)
          if (cell && (cell.occupant === null || posEqual(neighbor, to))) {
            visited.add(nKey)
            parent.set(nKey, currentKey)
            queue.push(neighbor)
          }
        }
      }
    }

    return null
  }

  getItemAt(pos: Position): Item | null {
    const cell = this.getCell(pos)
    return cell?.item || null
  }

  removeItem(pos: Position): void {
    const cell = this.getCell(pos)
    if (cell) {
      cell.item = null
    }
  }
}
