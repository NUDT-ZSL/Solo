import { Piece, Position, GameState, PuzzleData, EffectEvent } from '../types'
import { eventBus } from '../eventBus'
import { puzzles, PIECE_SIZE, SNAP_THRESHOLD, SCORE_PER_PIECE, HINT_PENALTY } from '../data/puzzles'

export class GameEngine {
  private state: GameState
  private timerInterval: number | null = null
  private canvasWidth: number = 800
  private canvasHeight: number = 600

  constructor() {
    this.state = {
      score: 0,
      time: 0,
      isPlaying: false,
      isCompleted: false,
      currentPuzzleId: 1,
      pieces: []
    }
  }

  getPuzzles(): PuzzleData[] {
    return puzzles
  }

  setCanvasSize(width: number, height: number): void {
    this.canvasWidth = width
    this.canvasHeight = height
  }

  initGame(puzzleId: number): GameState {
    const puzzle = puzzles.find((p) => p.id === puzzleId) || puzzles[0]
    this.state.currentPuzzleId = puzzle.id
    this.state.score = 0
    this.state.time = 0
    this.state.isPlaying = true
    this.state.isCompleted = false
    this.state.pieces = this.generatePieces(puzzle)

    this.stopTimer()
    this.startTimer()

    eventBus.emit('scoreChanged', this.state.score)
    eventBus.emit('timeChanged', this.state.time)

    return { ...this.state }
  }

  private generatePieces(puzzle: PuzzleData): Piece[] {
    const pieces: Piece[] = []
    const totalPieces = puzzle.rows * puzzle.cols
    const offsetX = (this.canvasWidth - puzzle.cols * PIECE_SIZE) / 2
    const offsetY = (this.canvasHeight - puzzle.rows * PIECE_SIZE) / 2

    for (let i = 0; i < totalPieces; i++) {
      const row = Math.floor(i / puzzle.cols)
      const col = i % puzzle.cols

      const targetPosition: Position = {
        x: offsetX + col * PIECE_SIZE,
        y: offsetY + row * PIECE_SIZE
      }

      const currentPosition: Position = this.getRandomPosition()

      pieces.push({
        id: i,
        color: puzzle.colors[i],
        targetPosition,
        currentPosition,
        width: PIECE_SIZE,
        height: PIECE_SIZE,
        isPlaced: false
      })
    }

    return pieces
  }

  private getRandomPosition(): Position {
    const padding = 20
    return {
      x: padding + Math.random() * (this.canvasWidth - PIECE_SIZE - padding * 2),
      y: padding + Math.random() * (this.canvasHeight - PIECE_SIZE - padding * 2)
    }
  }

  checkPiece(position: Position, pieceId: number): boolean {
    const piece = this.state.pieces.find((p) => p.id === pieceId)
    if (!piece || piece.isPlaced) return false

    piece.currentPosition = { ...position }

    const dx = position.x - piece.targetPosition.x
    const dy = position.y - piece.targetPosition.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    if (distance < SNAP_THRESHOLD) {
      piece.currentPosition = { ...piece.targetPosition }
      piece.isPlaced = true

      this.state.score += SCORE_PER_PIECE
      eventBus.emit('piecePlaced', piece.id)
      eventBus.emit('scoreChanged', this.state.score)

      if (this.checkCompletion()) {
        this.handleCompletion()
      }

      return true
    }

    return false
  }

  getHint(): number | null {
    const unplacedPieces = this.state.pieces.filter((p) => !p.isPlaced)
    if (unplacedPieces.length === 0) return null

    const randomPiece = unplacedPieces[Math.floor(Math.random() * unplacedPieces.length)]

    this.state.score = Math.max(0, this.state.score - HINT_PENALTY)
    eventBus.emit('scoreChanged', this.state.score)
    eventBus.emit('hintUsed', randomPiece.id)

    return randomPiece.id
  }

  private checkCompletion(): boolean {
    return this.state.pieces.every((p) => p.isPlaced)
  }

  private handleCompletion(): void {
    this.state.isCompleted = true
    this.state.isPlaying = false
    this.stopTimer()

    eventBus.emit('gameCompleted', this.state.score)

    const centerX = this.canvasWidth / 2
    const centerY = this.canvasHeight / 2

    const effectEvent: EffectEvent = {
      type: 'completion',
      x: centerX,
      y: centerY,
      score: this.state.score
    }

    eventBus.emitEffect(effectEvent)
  }

  private startTimer(): void {
    this.timerInterval = window.setInterval(() => {
      if (this.state.isPlaying) {
        this.state.time++
        eventBus.emit('timeChanged', this.state.time)
      }
    }, 1000)
  }

  private stopTimer(): void {
    if (this.timerInterval !== null) {
      clearInterval(this.timerInterval)
      this.timerInterval = null
    }
  }

  getState(): GameState {
    return { ...this.state, pieces: [...this.state.pieces] }
  }

  getPieces(): Piece[] {
    return [...this.state.pieces]
  }

  updatePiecePosition(pieceId: number, position: Position): void {
    const piece = this.state.pieces.find((p) => p.id === pieceId)
    if (piece && !piece.isPlaced) {
      piece.currentPosition = { ...position }
    }
  }

  destroy(): void {
    this.stopTimer()
  }
}

export const gameEngine = new GameEngine()
