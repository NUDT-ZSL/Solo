export interface PuzzlePiece {
  id: number
  originalRow: number
  originalCol: number
  currentRow: number
  currentCol: number
  color: string
  isCorrect: boolean
  ownerId: string | null
}

export interface PuzzleBoard {
  rows: number
  cols: number
  pieces: PuzzlePiece[]
  isComplete: boolean
  startTime: number | null
  endTime: number | null
}

const COLOR_START = { r: 46, g: 64, b: 83 }
const COLOR_END = { r: 93, g: 109, b: 126 }

function lerpColor(t: number): string {
  const r = Math.round(COLOR_START.r + (COLOR_END.r - COLOR_START.r) * t)
  const g = Math.round(COLOR_START.g + (COLOR_END.g - COLOR_START.g) * t)
  const b = Math.round(COLOR_START.b + (COLOR_END.b - COLOR_START.b) * t)
  return `rgb(${r}, ${g}, ${b})`
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

export function createPuzzleBoard(rows: number = 8, cols: number = 8): PuzzleBoard {
  const pieces: PuzzlePiece[] = []
  const total = rows * cols

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const id = row * cols + col
      const t = id / (total - 1)
      pieces.push({
        id,
        originalRow: row,
        originalCol: col,
        currentRow: row,
        currentCol: col,
        color: lerpColor(t),
        isCorrect: true,
        ownerId: null,
      })
    }
  }

  const shuffled = shufflePieces(pieces, rows, cols)

  return {
    rows,
    cols,
    pieces: shuffled,
    isComplete: false,
    startTime: null,
    endTime: null,
  }
}

export function assignUserRegions(board: PuzzleBoard, userIds: string[]): PuzzleBoard {
  const total = board.rows * board.cols
  const regionSize = Math.ceil(total / userIds.length)
  const newPieces = board.pieces.map((piece, index) => {
    const regionIndex = Math.floor(index / regionSize)
    const ownerId = userIds[regionIndex] || null
    return { ...piece, ownerId }
  })
  return { ...board, pieces: newPieces }
}

function shufflePieces(pieces: PuzzlePiece[], rows: number, cols: number): PuzzlePiece[] {
  const shuffled = shuffleArray([...pieces])
  return shuffled.map((piece, index) => ({
    ...piece,
    currentRow: Math.floor(index / cols),
    currentCol: index % cols,
    isCorrect: false,
  }))
}

export function getPieceAt(board: PuzzleBoard, row: number, col: number): PuzzlePiece | undefined {
  return board.pieces.find(
    (p) => p.currentRow === row && p.currentCol === col
  )
}

export function areAdjacent(
  piece1: PuzzlePiece,
  piece2: PuzzlePiece
): boolean {
  const rowDiff = Math.abs(piece1.currentRow - piece2.currentRow)
  const colDiff = Math.abs(piece1.currentCol - piece2.currentCol)
  return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1)
}

export function validateSwap(
  board: PuzzleBoard,
  pieceId1: number,
  pieceId2: number,
  userId?: string
): boolean {
  const piece1 = board.pieces.find((p) => p.id === pieceId1)
  const piece2 = board.pieces.find((p) => p.id === pieceId2)

  if (!piece1 || !piece2) return false
  if (!areAdjacent(piece1, piece2)) return false

  if (userId !== undefined) {
    const ownsPiece1 = piece1.ownerId === userId || piece1.ownerId === null
    const ownsPiece2 = piece2.ownerId === userId || piece2.ownerId === null
    if (!ownsPiece1 && !ownsPiece2) return false
  }

  return true
}

export function swapPieces(
  board: PuzzleBoard,
  pieceId1: number,
  pieceId2: number,
  userId?: string
): PuzzleBoard {
  if (!validateSwap(board, pieceId1, pieceId2, userId)) {
    return board
  }

  const piece1 = board.pieces.find((p) => p.id === pieceId1)!
  const piece2 = board.pieces.find((p) => p.id === pieceId2)!

  const newRow1 = piece2.currentRow
  const newCol1 = piece2.currentCol
  const newRow2 = piece1.currentRow
  const newCol2 = piece1.currentCol

  const newPieces = board.pieces.map((p) => {
    if (p.id === pieceId1) {
      const updated = { ...p, currentRow: newRow1, currentCol: newCol1 }
      return { ...updated, isCorrect: isPieceCorrect(updated) }
    }
    if (p.id === pieceId2) {
      const updated = { ...p, currentRow: newRow2, currentCol: newCol2 }
      return { ...updated, isCorrect: isPieceCorrect(updated) }
    }
    return p
  })

  const isComplete = checkCompletion({ ...board, pieces: newPieces })

  return {
    ...board,
    pieces: newPieces,
    isComplete,
    endTime: isComplete ? Date.now() : board.endTime,
  }
}

function isPieceCorrect(piece: PuzzlePiece): boolean {
  return piece.originalRow === piece.currentRow && piece.originalCol === piece.currentCol
}

export function checkCompletion(board: PuzzleBoard): boolean {
  return board.pieces.every((p) => p.isCorrect)
}

export function getCorrectCount(board: PuzzleBoard): number {
  return board.pieces.filter((p) => p.isCorrect).length
}

export function getTotalPieces(board: PuzzleBoard): number {
  return board.rows * board.cols
}

export function getCompletionPercentage(board: PuzzleBoard): number {
  const total = getTotalPieces(board)
  if (total === 0) return 0
  return Math.round((getCorrectCount(board) / total) * 100)
}

export function startPuzzle(board: PuzzleBoard): PuzzleBoard {
  return {
    ...board,
    startTime: Date.now(),
  }
}

export function getElapsedTime(board: PuzzleBoard): number {
  if (!board.startTime) return 0
  const endTime = board.endTime || Date.now()
  return endTime - board.startTime
}

export function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}
