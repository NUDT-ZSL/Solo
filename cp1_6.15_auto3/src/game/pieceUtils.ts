export interface PuzzlePiece {
  id: number
  row: number
  col: number
  correctRow: number
  correctCol: number
  patternData: string
  isPlaced: boolean
}

export interface Player {
  id: string
  name: string
  avatarData: string
  color: string
  cursorX: number
  cursorY: number
}

export interface OperationLog {
  id: string
  playerId: string
  pieceId: number
  fromRow: number
  fromCol: number
  toRow: number
  toCol: number
  timestamp: number
  success: boolean
}

const NEON_COLORS = ['#c084fc', '#06b6d4', '#f472b6', '#a78bfa', '#22d3ee', '#fb7185']

export function generatePuzzlePieces(size: number): PuzzlePiece[] {
  const pieces: PuzzlePiece[] = []
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  const pieceSize = 100

  canvas.width = size * pieceSize
  canvas.height = size * pieceSize

  drawFullPattern(ctx, size * pieceSize, size * pieceSize)

  const positions: { row: number; col: number }[] = []
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      positions.push({ row: r, col: c })
    }
  }

  const shuffledPositions = [...positions]
  for (let i = shuffledPositions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffledPositions[i], shuffledPositions[j]] = [shuffledPositions[j], shuffledPositions[i]]
  }

  for (let i = 0; i < size * size; i++) {
    const correctRow = Math.floor(i / size)
    const correctCol = i % size
    const { row, col } = shuffledPositions[i]

    const pieceCanvas = document.createElement('canvas')
    pieceCanvas.width = pieceSize
    pieceCanvas.height = pieceSize
    const pieceCtx = pieceCanvas.getContext('2d')!
    pieceCtx.drawImage(
      canvas,
      correctCol * pieceSize,
      correctRow * pieceSize,
      pieceSize,
      pieceSize,
      0,
      0,
      pieceSize,
      pieceSize
    )

    pieces.push({
      id: i,
      row,
      col,
      correctRow,
      correctCol,
      patternData: pieceCanvas.toDataURL(),
      isPlaced: false
    })
  }

  return pieces
}

function drawFullPattern(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const gradient = ctx.createLinearGradient(0, 0, width, height)
  gradient.addColorStop(0, '#0f172a')
  gradient.addColorStop(0.5, '#1e1b4b')
  gradient.addColorStop(1, '#0f172a')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)

  const shapeCount = 40
  for (let i = 0; i < shapeCount; i++) {
    const x = Math.random() * width
    const y = Math.random() * height
    const size = 20 + Math.random() * 60
    const color = NEON_COLORS[Math.floor(Math.random() * NEON_COLORS.length)]
    const shapeType = Math.floor(Math.random() * 4)

    ctx.save()
    ctx.shadowColor = color
    ctx.shadowBlur = 15
    ctx.fillStyle = color + Math.floor(Math.random() * 100 + 100).toString(16)
    ctx.strokeStyle = color
    ctx.lineWidth = 2

    switch (shapeType) {
      case 0:
        ctx.beginPath()
        ctx.arc(x, y, size / 2, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
        break
      case 1:
        ctx.fillRect(x - size / 2, y - size / 2, size, size)
        ctx.strokeRect(x - size / 2, y - size / 2, size, size)
        break
      case 2:
        ctx.beginPath()
        ctx.moveTo(x, y - size / 2)
        ctx.lineTo(x + size / 2, y + size / 2)
        ctx.lineTo(x - size / 2, y + size / 2)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
        break
      case 3:
        ctx.beginPath()
        for (let j = 0; j < 6; j++) {
          const angle = (j * Math.PI) / 3
          const px = x + (size / 2) * Math.cos(angle)
          const py = y + (size / 2) * Math.sin(angle)
          if (j === 0) ctx.moveTo(px, py)
          else ctx.lineTo(px, py)
        }
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
        break
    }
    ctx.restore()
  }

  ctx.save()
  ctx.globalAlpha = 0.3
  ctx.strokeStyle = '#c084fc'
  ctx.lineWidth = 1
  for (let i = 0; i < width; i += 30) {
    ctx.beginPath()
    ctx.moveTo(i, 0)
    ctx.lineTo(i, height)
    ctx.stroke()
  }
  for (let i = 0; i < height; i += 30) {
    ctx.beginPath()
    ctx.moveTo(0, i)
    ctx.lineTo(width, i)
    ctx.stroke()
  }
  ctx.restore()
}

export function generateAvatar(name: string): string {
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 64
  const ctx = canvas.getContext('2d')!

  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }

  const bgColor = NEON_COLORS[Math.abs(hash) % NEON_COLORS.length]

  ctx.fillStyle = '#0f172a'
  ctx.fillRect(0, 0, 64, 64)

  ctx.save()
  ctx.shadowColor = bgColor
  ctx.shadowBlur = 10
  ctx.fillStyle = bgColor
  ctx.beginPath()
  ctx.arc(32, 32, 24, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 24px Arial'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(name.charAt(0).toUpperCase(), 32, 32)

  return canvas.toDataURL()
}

export function playSuccessSound() {
  const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
  const oscillator = audioContext.createOscillator()
  const gainNode = audioContext.createGain()

  oscillator.connect(gainNode)
  gainNode.connect(audioContext.destination)

  oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime)
  oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1)
  oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2)

  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
  gainNode.gain.setValueAtTime(0.01, audioContext.currentTime + 0.3)

  oscillator.start(audioContext.currentTime)
  oscillator.stop(audioContext.currentTime + 0.3)
}

export function playErrorSound() {
  const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
  const oscillator = audioContext.createOscillator()
  const gainNode = audioContext.createGain()

  oscillator.connect(gainNode)
  gainNode.connect(audioContext.destination)

  oscillator.frequency.setValueAtTime(200, audioContext.currentTime)
  oscillator.frequency.setValueAtTime(150, audioContext.currentTime + 0.1)

  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
  gainNode.gain.setValueAtTime(0.01, audioContext.currentTime + 0.2)

  oscillator.type = 'sawtooth'
  oscillator.start(audioContext.currentTime)
  oscillator.stop(audioContext.currentTime + 0.2)
}

export function checkPiecePlacement(piece: PuzzlePiece): boolean {
  return piece.row === piece.correctRow && piece.col === piece.correctCol
}

export function calculateProgress(pieces: PuzzlePiece[]): number {
  const placed = pieces.filter(p => p.isPlaced).length
  return (placed / pieces.length) * 100
}

export function generateOperationId(): string {
  return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}
