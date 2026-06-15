export interface LevelData {
  grid: number[][]
  startCol: number
  startRow: number
  exitCol: number
  exitRow: number
  cols: number
  rows: number
}

export const LEVELS: LevelData[] = [
  {
    cols: 8, rows: 6,
    startCol: 1, startRow: 4,
    exitCol: 6, exitRow: 1,
    grid: [
      [1,1,1,1,1,1,1,1],
      [1,0,0,0,0,0,2,1],
      [1,0,1,1,1,1,0,1],
      [1,0,0,0,0,0,0,1],
      [1,0,1,1,1,0,0,1],
      [1,1,1,1,1,1,1,1],
    ],
  },
  {
    cols: 10, rows: 8,
    startCol: 1, startRow: 6,
    exitCol: 8, exitRow: 1,
    grid: [
      [1,1,1,1,1,1,1,1,1,1],
      [1,0,0,0,1,0,0,0,2,1],
      [1,0,1,0,1,0,1,1,0,1],
      [1,0,1,0,0,0,0,1,0,1],
      [1,0,1,1,1,1,0,1,0,1],
      [1,0,0,0,0,0,0,1,0,1],
      [1,0,1,1,1,1,1,1,0,1],
      [1,1,1,1,1,1,1,1,1,1],
    ],
  },
  {
    cols: 12, rows: 10,
    startCol: 1, startRow: 8,
    exitCol: 10, exitRow: 1,
    grid: [
      [1,1,1,1,1,1,1,1,1,1,1,1],
      [1,0,0,0,1,0,0,0,0,0,2,1],
      [1,0,1,0,1,0,1,1,1,1,0,1],
      [1,0,1,0,0,0,0,0,0,1,0,1],
      [1,0,1,1,1,1,1,1,0,1,0,1],
      [1,0,0,0,0,0,0,0,0,1,0,1],
      [1,1,1,1,1,0,1,1,1,1,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,1,1,1,1,1,1,1,1,0,1],
      [1,1,1,1,1,1,1,1,1,1,1,1],
    ],
  },
  {
    cols: 14, rows: 10,
    startCol: 1, startRow: 8,
    exitCol: 12, exitRow: 1,
    grid: [
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,0,0,0,1,0,0,0,1,0,0,0,2,1],
      [1,0,1,0,1,0,1,0,1,0,1,1,0,1],
      [1,0,1,0,0,0,1,0,0,0,0,1,0,1],
      [1,0,1,1,1,0,1,1,1,1,0,1,0,1],
      [1,0,0,0,0,0,0,0,0,1,0,0,0,1],
      [1,1,1,0,1,1,1,1,0,1,1,1,0,1],
      [1,0,0,0,1,0,0,0,0,0,0,0,0,1],
      [1,0,1,1,1,0,1,1,1,1,1,1,0,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    ],
  },
  {
    cols: 16, rows: 12,
    startCol: 1, startRow: 10,
    exitCol: 14, exitRow: 1,
    grid: [
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,0,0,0,1,0,0,0,1,0,0,0,0,0,2,1],
      [1,0,1,0,1,0,1,0,0,0,1,1,0,1,0,1],
      [1,0,1,0,0,0,1,1,1,0,0,1,0,1,0,1],
      [1,0,1,1,1,0,0,0,1,1,0,1,0,1,0,1],
      [1,0,0,0,0,0,1,0,0,1,0,0,0,1,0,1],
      [1,1,1,1,1,0,1,1,0,1,1,1,0,1,0,1],
      [1,0,0,0,0,0,0,1,0,0,0,1,0,0,0,1],
      [1,0,1,1,1,1,0,1,1,1,0,1,1,1,0,1],
      [1,0,1,0,0,0,0,0,0,1,0,0,0,0,0,1],
      [1,0,1,0,1,1,1,1,0,1,1,1,1,1,0,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    ],
  },
]

const WALL = 1
const EXIT = 2

export interface CollisionResult {
  hit: boolean
  nx: number
  ny: number
}

export class MazeRenderer {
  private ctx: CanvasRenderingContext2D
  private cellSize: number
  private offsetX: number
  private offsetY: number
  private levelData: LevelData | null = null
  private exitPulsePhase = 0
  private pathTrail: Array<{ x: number; y: number; alpha: number }> = []

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx
    this.cellSize = 0
    this.offsetX = 0
    this.offsetY = 0
  }

  loadLevel(data: LevelData, canvasW: number, canvasH: number) {
    this.levelData = data
    this.pathTrail = []
    const maxCellW = Math.floor((canvasW - 40) / data.cols)
    const maxCellH = Math.floor((canvasH - 40) / data.rows)
    this.cellSize = Math.min(maxCellW, maxCellH, 50)
    const mazeW = data.cols * this.cellSize
    const mazeH = data.rows * this.cellSize
    this.offsetX = Math.floor((canvasW - mazeW) / 2)
    this.offsetY = Math.floor((canvasH - mazeH) / 2)
  }

  getCellSize() { return this.cellSize }
  getOffsetX() { return this.offsetX }
  getOffsetY() { return this.offsetY }

  getStartPosition() {
    if (!this.levelData) return { x: 0, y: 0 }
    return {
      x: this.offsetX + this.levelData.startCol * this.cellSize + this.cellSize / 2,
      y: this.offsetY + this.levelData.startRow * this.cellSize + this.cellSize / 2,
    }
  }

  getExitPosition() {
    if (!this.levelData) return { x: 0, y: 0 }
    return {
      x: this.offsetX + this.levelData.exitCol * this.cellSize + this.cellSize / 2,
      y: this.offsetY + this.levelData.exitRow * this.cellSize + this.cellSize / 2,
    }
  }

  addTrailPoint(x: number, y: number) {
    if (this.pathTrail.length > 200) this.pathTrail.shift()
    this.pathTrail.push({ x, y, alpha: 1.0 })
  }

  update(dt: number) {
    this.exitPulsePhase += dt * 3
    for (let i = this.pathTrail.length - 1; i >= 0; i--) {
      this.pathTrail[i].alpha -= dt * 0.3
      if (this.pathTrail[i].alpha <= 0) this.pathTrail.splice(i, 1)
    }
  }

  render() {
    if (!this.levelData) return
    this.renderPath()
    this.renderWalls()
    this.renderExit()
  }

  private renderWalls() {
    if (!this.levelData) return
    const ctx = this.ctx
    const { grid, cols, rows } = this.levelData
    const cs = this.cellSize

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (grid[r][c] === WALL) {
          const x = this.offsetX + c * cs
          const y = this.offsetY + r * cs

          ctx.fillStyle = '#0d0d1a'
          ctx.fillRect(x, y, cs, cs)

          ctx.strokeStyle = 'rgba(0, 212, 255, 0.25)'
          ctx.lineWidth = 1
          ctx.strokeRect(x + 0.5, y + 0.5, cs - 1, cs - 1)

          ctx.save()
          ctx.shadowColor = 'rgba(0, 212, 255, 0.4)'
          ctx.shadowBlur = 6
          ctx.strokeStyle = 'rgba(0, 212, 255, 0.15)'
          ctx.lineWidth = 0.5
          ctx.strokeRect(x, y, cs, cs)
          ctx.restore()
        }
      }
    }
  }

  private renderExit() {
    if (!this.levelData) return
    const ctx = this.ctx
    const cs = this.cellSize
    const x = this.offsetX + this.levelData.exitCol * cs
    const y = this.offsetY + this.levelData.exitRow * cs
    const pulse = 0.5 + 0.5 * Math.sin(this.exitPulsePhase)

    ctx.save()
    ctx.shadowColor = 'rgba(0, 255, 100, 0.8)'
    ctx.shadowBlur = 12 + pulse * 8
    ctx.fillStyle = `rgba(0, 255, 100, ${0.3 + pulse * 0.4})`
    ctx.fillRect(x + 2, y + 2, cs - 4, cs - 4)
    ctx.restore()

    ctx.strokeStyle = `rgba(0, 255, 100, ${0.6 + pulse * 0.4})`
    ctx.lineWidth = 2
    ctx.strokeRect(x + 2, y + 2, cs - 4, cs - 4)
  }

  private renderPath() {
    const ctx = this.ctx
    if (this.pathTrail.length < 2) return
    for (let i = 1; i < this.pathTrail.length; i++) {
      const p0 = this.pathTrail[i - 1]
      const p1 = this.pathTrail[i]
      ctx.beginPath()
      ctx.moveTo(p0.x, p0.y)
      ctx.lineTo(p1.x, p1.y)
      ctx.strokeStyle = `rgba(0, 212, 255, ${p1.alpha * 0.3})`
      ctx.lineWidth = 2
      ctx.stroke()
    }
  }

  checkCollision(ballX: number, ballY: number, ballR: number): CollisionResult {
    if (!this.levelData) return { hit: false, nx: 0, ny: 0 }
    const { grid } = this.levelData

    const minCol = Math.max(0, Math.floor((ballX - ballR - this.offsetX) / this.cellSize))
    const maxCol = Math.min(this.levelData.cols - 1, Math.floor((ballX + ballR - this.offsetX) / this.cellSize))
    const minRow = Math.max(0, Math.floor((ballY - ballR - this.offsetY) / this.cellSize))
    const maxRow = Math.min(this.levelData.rows - 1, Math.floor((ballY + ballR - this.offsetY) / this.cellSize))

    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        if (grid[r][c] !== WALL) continue

        const wx = this.offsetX + c * this.cellSize
        const wy = this.offsetY + r * this.cellSize
        const closestX = Math.max(wx, Math.min(ballX, wx + this.cellSize))
        const closestY = Math.max(wy, Math.min(ballY, wy + this.cellSize))
        const dx = ballX - closestX
        const dy = ballY - closestY
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist < ballR && dist > 0.001) {
          return { hit: true, nx: dx / dist, ny: dy / dist }
        }
        if (dist < 0.001 && ballR > 0) {
          const cx = wx + this.cellSize / 2
          const cy = wy + this.cellSize / 2
          const ddx = ballX - cx
          const ddy = ballY - cy
          const dd = Math.sqrt(ddx * ddx + ddy * ddy)
          if (dd < 0.001) return { hit: true, nx: 0, ny: -1 }
          return { hit: true, nx: ddx / dd, ny: ddy / dd }
        }
      }
    }
    return { hit: false, nx: 0, ny: 0 }
  }

  isAtExit(ballX: number, ballY: number, ballR: number): boolean {
    if (!this.levelData) return false
    const ex = this.offsetX + this.levelData.exitCol * this.cellSize + this.cellSize / 2
    const ey = this.offsetY + this.levelData.exitRow * this.cellSize + this.cellSize / 2
    const dx = ballX - ex
    const dy = ballY - ey
    return Math.sqrt(dx * dx + dy * dy) < ballR + this.cellSize * 0.3
  }
}
