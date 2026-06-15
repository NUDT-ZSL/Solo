import {
  Puzzle,
  PuzzleType,
  MechanicalPuzzleData,
  PasswordPuzzleData,
  MemoryPuzzleData,
  MemoryCard,
  GameEvent,
} from './types'
import { SEED } from './constants'
import { SeededRandom } from './utils/random'

type Listener = (event: GameEvent) => void

export class PuzzleManager {
  private puzzles: Map<string, Puzzle> = new Map()
  private listeners: Set<Listener> = new Set()
  private rng: SeededRandom

  constructor() {
    this.rng = new SeededRandom(SEED)
  }

  generatePuzzles(roomIds: string[]): void {
    this.puzzles.clear()

    const shuffledRooms = this.rng.shuffle([...roomIds])
    let puzzleIndex = 0

    const types: PuzzleType[] = ['mechanical', 'mechanical', 'password', 'password', 'memory', 'memory']
    const shuffledTypes = this.rng.shuffle([...types])

    for (const type of shuffledTypes) {
      if (puzzleIndex >= shuffledRooms.length) break
      const roomId = shuffledRooms[puzzleIndex]
      const puzzle = this.createPuzzle(type, roomId, puzzleIndex)
      this.puzzles.set(puzzle.id, puzzle)
      puzzleIndex++
    }
  }

  private createPuzzle(type: PuzzleType, roomId: string, index: number): Puzzle {
    const id = `puzzle_${type}_${index}`

    switch (type) {
      case 'mechanical':
        return this.createMechanicalPuzzle(id, roomId)
      case 'password':
        return this.createPasswordPuzzle(id, roomId)
      case 'memory':
        return this.createMemoryPuzzle(id, roomId)
      default:
        return this.createMechanicalPuzzle(id, roomId)
    }
  }

  private createMechanicalPuzzle(id: string, roomId: string): Puzzle {
    const size = 3
    const targetPattern: number[][] = []
    for (let i = 0; i < size; i++) {
      const row: number[] = []
      for (let j = 0; j < size; j++) {
        row.push(this.rng.nextInt(0, 1))
      }
      targetPattern.push(row)
    }

    const currentPattern = targetPattern.map((row) => [...row])
    const shuffleTimes = this.rng.nextInt(3, 6)
    for (let i = 0; i < shuffleTimes; i++) {
      const r = this.rng.nextInt(0, size - 1)
      const c = this.rng.nextInt(0, size - 1)
      currentPattern[r][c] = currentPattern[r][c] === 1 ? 0 : 1
    }

    const grid = currentPattern.map((row) => [...row])

    return {
      id,
      type: 'mechanical',
      roomId,
      solved: false,
      data: {
        grid,
        targetPattern,
        currentPattern,
      } as MechanicalPuzzleData,
    }
  }

  private createPasswordPuzzle(id: string, roomId: string): Puzzle {
    const password = this.rng.nextInt(1000, 9999).toString()
    const hints = [
      `第一位是${password[0]}`,
      `最后一位是${password[3]}`,
      `四位数字之和为${password.split('').reduce((a, b) => a + parseInt(b), 0)}`,
    ]
    const hint = this.rng.pick(hints)

    return {
      id,
      type: 'password',
      roomId,
      solved: false,
      data: {
        password,
        hint,
        currentInput: '',
      } as PasswordPuzzleData,
    }
  }

  private createMemoryPuzzle(id: string, roomId: string): Puzzle {
    const totalPairs = 3
    const values: number[] = []
    for (let i = 1; i <= totalPairs; i++) {
      values.push(i, i)
    }
    const shuffled = this.rng.shuffle(values)

    const cards: MemoryCard[] = shuffled.map((value, index) => ({
      id: index,
      value,
      flipped: false,
      matched: false,
    }))

    return {
      id,
      type: 'memory',
      roomId,
      solved: false,
      data: {
        cards,
        flippedIndices: [],
        matchedPairs: 0,
        totalPairs,
      } as MemoryPuzzleData,
    }
  }

  getPuzzle(id: string): Puzzle | undefined {
    return this.puzzles.get(id)
  }

  getPuzzleByRoom(roomId: string): Puzzle | undefined {
    for (const puzzle of this.puzzles.values()) {
      if (puzzle.roomId === roomId && !puzzle.solved) {
        return puzzle
      }
    }
    return undefined
  }

  getAllPuzzles(): Puzzle[] {
    return Array.from(this.puzzles.values())
  }

  solvePuzzle(puzzleId: string): boolean {
    const puzzle = this.puzzles.get(puzzleId)
    if (!puzzle || puzzle.solved) return false

    puzzle.solved = true
    this.notifyListeners({ type: 'PUZZLE_SOLVED', puzzleId })
    return true
  }

  flipMemoryCard(puzzleId: string, cardIndex: number): { matched: boolean; allMatched: boolean; shouldFlipBack: boolean } {
    const puzzle = this.puzzles.get(puzzleId)
    if (!puzzle || puzzle.type !== 'memory' || puzzle.solved) {
      return { matched: false, allMatched: false, shouldFlipBack: false }
    }

    const data = puzzle.data as MemoryPuzzleData
    const card = data.cards[cardIndex]

    if (card.flipped || card.matched || data.flippedIndices.length >= 2) {
      return { matched: false, allMatched: false, shouldFlipBack: false }
    }

    card.flipped = true
    data.flippedIndices.push(cardIndex)

    if (data.flippedIndices.length === 2) {
      const [first, second] = data.flippedIndices
      const firstCard = data.cards[first]
      const secondCard = data.cards[second]

      if (firstCard.value === secondCard.value) {
        firstCard.matched = true
        secondCard.matched = true
        data.matchedPairs++
        data.flippedIndices = []

        const allMatched = data.matchedPairs >= data.totalPairs
        if (allMatched) {
          this.solvePuzzle(puzzleId)
        }
        return { matched: true, allMatched, shouldFlipBack: false }
      } else {
        return { matched: false, allMatched: false, shouldFlipBack: true }
      }
    }

    return { matched: false, allMatched: false, shouldFlipBack: false }
  }

  flipBackMemoryCards(puzzleId: string): void {
    const puzzle = this.puzzles.get(puzzleId)
    if (!puzzle || puzzle.type !== 'memory') return

    const data = puzzle.data as MemoryPuzzleData
    for (const index of data.flippedIndices) {
      data.cards[index].flipped = false
    }
    data.flippedIndices = []
  }

  toggleMechanicalTile(puzzleId: string, row: number, col: number): boolean {
    const puzzle = this.puzzles.get(puzzleId)
    if (!puzzle || puzzle.type !== 'mechanical' || puzzle.solved) {
      return false
    }

    const data = puzzle.data as MechanicalPuzzleData
    data.currentPattern[row][col] = data.currentPattern[row][col] === 1 ? 0 : 1

    const solved = this.checkMechanicalSolved(data)
    if (solved) {
      this.solvePuzzle(puzzleId)
    }
    return solved
  }

  private checkMechanicalSolved(data: MechanicalPuzzleData): boolean {
    for (let i = 0; i < data.currentPattern.length; i++) {
      for (let j = 0; j < data.currentPattern[i].length; j++) {
        if (data.currentPattern[i][j] !== data.targetPattern[i][j]) {
          return false
        }
      }
    }
    return true
  }

  inputPasswordDigit(puzzleId: string, digit: string): { complete: boolean; correct: boolean } {
    const puzzle = this.puzzles.get(puzzleId)
    if (!puzzle || puzzle.type !== 'password' || puzzle.solved) {
      return { complete: false, correct: false }
    }

    const data = puzzle.data as PasswordPuzzleData
    if (data.currentInput.length >= 4) {
      return { complete: true, correct: false }
    }

    data.currentInput += digit

    if (data.currentInput.length === 4) {
      const correct = data.currentInput === data.password
      if (correct) {
        this.solvePuzzle(puzzleId)
      }
      return { complete: true, correct }
    }

    return { complete: false, correct: false }
  }

  clearPassword(puzzleId: string): void {
    const puzzle = this.puzzles.get(puzzleId)
    if (!puzzle || puzzle.type !== 'password') return

    const data = puzzle.data as PasswordPuzzleData
    data.currentInput = ''
  }

  resetPuzzle(puzzleId: string): void {
    const puzzle = this.puzzles.get(puzzleId)
    if (!puzzle) return

    if (puzzle.type === 'mechanical') {
      const data = puzzle.data as MechanicalPuzzleData
      data.currentPattern = data.grid.map((row) => [...row])
    } else if (puzzle.type === 'password') {
      const data = puzzle.data as PasswordPuzzleData
      data.currentInput = ''
    } else if (puzzle.type === 'memory') {
      const data = puzzle.data as MemoryPuzzleData
      data.cards.forEach((card) => {
        card.flipped = false
        card.matched = false
      })
      data.flippedIndices = []
      data.matchedPairs = 0
    }

    puzzle.solved = false
  }

  addListener(listener: Listener): void {
    this.listeners.add(listener)
  }

  removeListener(listener: Listener): void {
    this.listeners.delete(listener)
  }

  private notifyListeners(event: GameEvent): void {
    this.listeners.forEach((listener) => listener(event))
  }
}
