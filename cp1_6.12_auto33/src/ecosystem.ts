export const GRID_SIZE = 20

export type OrganismType = 'grass' | 'rabbit' | 'fox' | 'empty'

export interface Position {
  x: number
  y: number
}

export interface Grass {
  type: 'grass'
  regrowTimer: number
}

export interface Animal {
  type: 'rabbit' | 'fox'
  energy: number
  x: number
  y: number
  prevX: number
  prevY: number
  id: number
}

export interface Cell {
  x: number
  y: number
  grass: Grass | null
  animal: Animal | null
  forbidden: boolean
}

export interface EcosystemStats {
  grassCount: number
  rabbitCount: number
  foxCount: number
  grassCoverage: number
  turn: number
}

export interface EcosystemConfig {
  grassDensity: number
  rabbitCount: number
  foxCount: number
  grassRegrowTime: number
  rabbitBreedThreshold: number
}

const DEFAULT_CONFIG: EcosystemConfig = {
  grassDensity: 50,
  rabbitCount: 20,
  foxCount: 5,
  grassRegrowTime: 3,
  rabbitBreedThreshold: 100
}

const MAX_HISTORY = 200
const FOX_BREED_THRESHOLD = 150
const RABBIT_ENERGY_FROM_GRASS = 30
const FOX_ENERGY_FROM_RABBIT = 50
const RABBIT_MOVE_ENERGY_COST = 5
const FOX_MOVE_ENERGY_COST = 8
const RABBIT_STARVATION_THRESHOLD = 10
const FOX_STARVATION_THRESHOLD = 20
const FOX_HUNGER_LIMIT = 15

export class Ecosystem {
  private grid: Cell[][] = []
  private animals: Animal[] = []
  private turnCount = 0
  private config: EcosystemConfig
  private history: EcosystemStats[] = []
  private nextAnimalId = 1
  private foxHungerCounter: Map<number, number> = new Map()

  constructor(config: Partial<EcosystemConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.initializeGrid()
  }

  private initializeGrid(): void {
    this.grid = []
    this.animals = []
    this.history = []
    this.turnCount = 0
    this.nextAnimalId = 1
    this.foxHungerCounter.clear()

    for (let y = 0; y < GRID_SIZE; y++) {
      this.grid[y] = []
      for (let x = 0; x < GRID_SIZE; x++) {
        this.grid[y][x] = {
          x,
          y,
          grass: null,
          animal: null,
          forbidden: false
        }
      }
    }

    const grassCells = Math.floor((GRID_SIZE * GRID_SIZE * this.config.grassDensity) / 100)
    let grassPlaced = 0
    while (grassPlaced < grassCells) {
      const x = Math.floor(Math.random() * GRID_SIZE)
      const y = Math.floor(Math.random() * GRID_SIZE)
      if (!this.grid[y][x].grass && !this.grid[y][x].forbidden) {
        this.grid[y][x].grass = { type: 'grass', regrowTimer: 0 }
        grassPlaced++
      }
    }

    this.placeAnimals('rabbit', this.config.rabbitCount)
    this.placeAnimals('fox', this.config.foxCount)
    this.recordStats()
  }

  private placeAnimals(type: 'rabbit' | 'fox', count: number): void {
    let placed = 0
    let attempts = 0
    const maxAttempts = count * 100

    while (placed < count && attempts < maxAttempts) {
      const x = Math.floor(Math.random() * GRID_SIZE)
      const y = Math.floor(Math.random() * GRID_SIZE)
      attempts++

      if (this.grid[y][x].forbidden) continue
      if (this.grid[y][x].animal) continue

      const animal: Animal = {
        type,
        energy: type === 'rabbit' ? 80 : 100,
        x,
        y,
        prevX: x,
        prevY: y,
        id: this.nextAnimalId++
      }

      this.grid[y][x].animal = animal
      this.animals.push(animal)
      if (type === 'fox') {
        this.foxHungerCounter.set(animal.id, 0)
      }
      placed++
    }
  }

  public updateConfig(config: Partial<EcosystemConfig>): void {
    this.config = { ...this.config, ...config }
  }

  public reset(): void {
    this.initializeGrid()
  }

  public step(): void {
    this.turnCount++
    
    this.animals.forEach(a => {
      a.prevX = a.x
      a.prevY = a.y
    })

    this.growGrass()
    this.rabbitActions()
    this.foxActions()
    this.moveAllAnimals()

    this.recordStats()
  }

  private growGrass(): void {
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const cell = this.grid[y][x]
        if (cell.forbidden) continue

        if (!cell.grass) {
          continue
        }

        if (cell.grass.regrowTimer > 0) {
          cell.grass.regrowTimer--
        }
      }
    }
  }

  private rabbitActions(): void {
    const rabbits = this.animals.filter(a => a.type === 'rabbit')

    for (const rabbit of rabbits) {
      if (rabbit.energy <= 0) continue

      const cell = this.grid[rabbit.y][rabbit.x]
      
      if (cell.grass && cell.grass.regrowTimer === 0) {
        rabbit.energy += RABBIT_ENERGY_FROM_GRASS
        const regrowTime = this.config.grassRegrowTime + Math.floor(Math.random() * 3)
        cell.grass.regrowTimer = Math.max(1, regrowTime)
      }

      if (rabbit.energy >= this.config.rabbitBreedThreshold) {
        this.tryBreed(rabbit)
      }

      if (rabbit.energy < RABBIT_STARVATION_THRESHOLD) {
        this.removeAnimal(rabbit)
      }
    }
  }

  private foxActions(): void {
    const foxes = this.animals.filter(a => a.type === 'fox')

    for (const fox of foxes) {
      if (fox.energy <= 0) continue

      const neighbors = this.getNeighbors(fox.x, fox.y)
      let ate = false

      for (const neighbor of neighbors) {
        const cell = this.grid[neighbor.y][neighbor.x]
        if (cell.animal && cell.animal.type === 'rabbit') {
          this.removeAnimal(cell.animal)
          fox.energy += FOX_ENERGY_FROM_RABBIT
          this.foxHungerCounter.set(fox.id, 0)
          ate = true
          break
        }
      }

      if (!ate) {
        const hunger = (this.foxHungerCounter.get(fox.id) || 0) + 1
        this.foxHungerCounter.set(fox.id, hunger)
        
        if (hunger >= FOX_HUNGER_LIMIT) {
          this.removeAnimal(fox)
          continue
        }
      }

      if (fox.energy >= FOX_BREED_THRESHOLD) {
        this.tryBreed(fox)
      }

      if (fox.energy < FOX_STARVATION_THRESHOLD) {
        this.removeAnimal(fox)
      }
    }
  }

  private tryBreed(animal: Animal): void {
    const neighbors = this.getNeighbors(animal.x, animal.y)
    
    for (const neighbor of neighbors) {
      const cell = this.grid[neighbor.y][neighbor.x]
      if (!cell.animal) continue
      if (cell.animal.type !== animal.type) continue
      if (cell.animal.id === animal.id) continue
      if (cell.animal.energy < this.config.rabbitBreedThreshold) continue

      const emptyNeighbors = this.getEmptyNeighbors(animal.x, animal.y)
      if (emptyNeighbors.length === 0) continue

      const birthPlace = emptyNeighbors[Math.floor(Math.random() * emptyNeighbors.length)]
      
      const newAnimal: Animal = {
        type: animal.type,
        energy: animal.type === 'rabbit' ? 50 : 70,
        x: birthPlace.x,
        y: birthPlace.y,
        prevX: birthPlace.x,
        prevY: birthPlace.y,
        id: this.nextAnimalId++
      }

      this.grid[birthPlace.y][birthPlace.x].animal = newAnimal
      this.animals.push(newAnimal)
      
      if (animal.type === 'fox') {
        this.foxHungerCounter.set(newAnimal.id, 0)
      }

      animal.energy = Math.floor(animal.energy * 0.5)
      cell.animal.energy = Math.floor(cell.animal.energy * 0.5)
      break
    }
  }

  private moveAllAnimals(): void {
    const shuffled = [...this.animals].sort(() => Math.random() - 0.5)

    for (const animal of shuffled) {
      if (animal.energy <= 0) continue

      const validMoves = this.getValidMoves(animal.x, animal.y)
      
      if (validMoves.length === 0) {
        if (animal.type === 'rabbit') {
          animal.energy -= RABBIT_MOVE_ENERGY_COST
        } else {
          animal.energy -= FOX_MOVE_ENERGY_COST
        }
        continue
      }

      let target: Position | null = null

      if (animal.type === 'rabbit') {
        const grassNeighbor = validMoves.find(pos => {
          const cell = this.grid[pos.y][pos.x]
          return cell.grass && cell.grass.regrowTimer === 0 && !cell.animal
        })
        if (grassNeighbor) {
          target = grassNeighbor
        } else {
          const foxPositions = this.animals
            .filter(a => a.type === 'fox')
            .map(a => ({ x: a.x, y: a.y }))
          
          let bestMove = validMoves[0]
          let maxMinDistance = -1

          for (const move of validMoves) {
            if (this.grid[move.y][move.x].animal) continue
            let minDistance = Infinity
            for (const fox of foxPositions) {
              const dist = Math.abs(move.x - fox.x) + Math.abs(move.y - fox.y)
              minDistance = Math.min(minDistance, dist)
            }
            if (minDistance > maxMinDistance) {
              maxMinDistance = minDistance
              bestMove = move
            }
          }
          target = bestMove
        }
      } else {
        const rabbitPositions = this.animals
          .filter(a => a.type === 'rabbit')
          .map(a => ({ x: a.x, y: a.y }))

        if (rabbitPositions.length > 0) {
          let bestMove = validMoves[0]
          let minMaxDistance = Infinity

          for (const move of validMoves) {
            if (this.grid[move.y][move.x].animal && this.grid[move.y][move.x].animal?.type !== 'rabbit') continue
            let minDistance = Infinity
            for (const rabbit of rabbitPositions) {
              const dist = Math.abs(move.x - rabbit.x) + Math.abs(move.y - rabbit.y)
              minDistance = Math.min(minDistance, dist)
            }
            if (minDistance < minMaxDistance) {
              minMaxDistance = minDistance
              bestMove = move
            }
          }
          target = bestMove
        } else {
          const available = validMoves.filter(pos => !this.grid[pos.y][pos.x].animal)
          if (available.length > 0) {
            target = available[Math.floor(Math.random() * available.length)]
          }
        }
      }

      if (target && !this.grid[target.y][target.x].animal) {
        this.grid[animal.y][animal.x].animal = null
        animal.x = target.x
        animal.y = target.y
        this.grid[target.y][target.x].animal = animal
      }

      if (animal.type === 'rabbit') {
        animal.energy -= RABBIT_MOVE_ENERGY_COST
      } else {
        animal.energy -= FOX_MOVE_ENERGY_COST
      }

      if (animal.energy <= 0) {
        this.removeAnimal(animal)
      }
    }
  }

  private getNeighbors(x: number, y: number): Position[] {
    const neighbors: Position[] = []
    const directions = [
      { dx: -1, dy: 0 }, { dx: 1, dy: 0 },
      { dx: 0, dy: -1 }, { dx: 0, dy: 1 },
      { dx: -1, dy: -1 }, { dx: 1, dy: -1 },
      { dx: -1, dy: 1 }, { dx: 1, dy: 1 }
    ]

    for (const dir of directions) {
      const nx = x + dir.dx
      const ny = y + dir.dy
      if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
        if (!this.grid[ny][nx].forbidden) {
          neighbors.push({ x: nx, y: ny })
        }
      }
    }

    return neighbors
  }

  private getEmptyNeighbors(x: number, y: number): Position[] {
    return this.getNeighbors(x, y).filter(pos => 
      !this.grid[pos.y][pos.x].animal && 
      !this.grid[pos.y][pos.x].forbidden
    )
  }

  private getValidMoves(x: number, y: number): Position[] {
    const moves: Position[] = []
    const directions = [
      { dx: -1, dy: 0 }, { dx: 1, dy: 0 },
      { dx: 0, dy: -1 }, { dx: 0, dy: 1 }
    ]

    for (const dir of directions) {
      const nx = x + dir.dx
      const ny = y + dir.dy
      if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
        if (!this.grid[ny][nx].forbidden) {
          moves.push({ x: nx, y: ny })
        }
      }
    }

    return moves
  }

  private removeAnimal(animal: Animal): void {
    this.grid[animal.y][animal.x].animal = null
    const index = this.animals.findIndex(a => a.id === animal.id)
    if (index !== -1) {
      this.animals.splice(index, 1)
    }
    this.foxHungerCounter.delete(animal.id)
  }

  private recordStats(): void {
    const stats = this.getStats()
    this.history.push(stats)
    if (this.history.length > MAX_HISTORY) {
      this.history.shift()
    }
  }

  public getStats(): EcosystemStats {
    let grassCount = 0
    let rabbitCount = 0
    let foxCount = 0
    let totalCells = 0

    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        if (this.grid[y][x].forbidden) continue
        totalCells++
        const grass = this.grid[y][x].grass
        if (grass && grass.regrowTimer === 0) {
          grassCount++
        }
      }
    }

    for (const animal of this.animals) {
      if (animal.type === 'rabbit') rabbitCount++
      else if (animal.type === 'fox') foxCount++
    }

    return {
      grassCount,
      rabbitCount,
      foxCount,
      grassCoverage: totalCells > 0 ? (grassCount / totalCells) * 100 : 0,
      turn: this.turnCount
    }
  }

  public getHistory(): EcosystemStats[] {
    return [...this.history]
  }

  public getGrid(): Cell[][] {
    return this.grid
  }

  public getCell(x: number, y: number): Cell | null {
    if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return null
    return this.grid[y][x]
  }

  public toggleForbidden(x: number, y: number): boolean {
    if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return false
    const cell = this.grid[y][x]
    cell.forbidden = !cell.forbidden
    
    if (cell.forbidden && cell.animal) {
      this.removeAnimal(cell.animal)
    }
    
    return cell.forbidden
  }

  public getTurn(): number {
    return this.turnCount
  }

  public getConfig(): EcosystemConfig {
    return { ...this.config }
  }
}
