import { GRID_SIZE, CreatureType } from './types'
import type { CellState, Animal } from './types'

interface Star {
  x: number
  y: number
  size: number
  brightness: number
  twinkleSpeed: number
  phase: number
}

interface RenderState {
  animationProgress: number
  lastStepTime: number
  isAnimating: boolean
}

const ANIMATION_DURATION = 200

export class Renderer {
  private gameCanvas: HTMLCanvasElement
  private gameCtx: CanvasRenderingContext2D
  private starsCanvas: HTMLCanvasElement
  private starsCtx: CanvasRenderingContext2D
  private cellSize = 0
  private offsetX = 0
  private offsetY = 0
  private stars: Star[] = []
  private animationFrameId: number | null = null
  private state: RenderState = {
    animationProgress: 1,
    lastStepTime: 0,
    isAnimating: false
  }
  private hoverCell: { x: number; y: number } | null = null
  private currentGrid: CellState[][] = []

  constructor(gameCanvas: HTMLCanvasElement, starsCanvas: HTMLCanvasElement) {
    this.gameCanvas = gameCanvas
    this.gameCtx = gameCanvas.getContext('2d')!
    this.starsCanvas = starsCanvas
    this.starsCtx = starsCanvas.getContext('2d')!
    
    this.initStars()
    this.resize()
    window.addEventListener('resize', () => this.resize())
    this.startAnimationLoop()
  }

  private initStars(): void {
    const starCount = 150
    for (let i = 0; i < starCount; i++) {
      this.stars.push({
        x: Math.random(),
        y: Math.random(),
        size: Math.random() * 2 + 0.5,
        brightness: Math.random(),
        twinkleSpeed: Math.random() * 0.02 + 0.005,
        phase: Math.random() * Math.PI * 2
      })
    }
  }

  private startAnimationLoop(): void {
    const loop = () => {
      if (this.currentGrid.length > 0) {
        this.updateAnimationProgress()
        this.renderFrame()
      }
      this.animationFrameId = requestAnimationFrame(loop)
    }
    this.animationFrameId = requestAnimationFrame(loop)
  }

  private updateAnimationProgress(): void {
    if (!this.state.isAnimating) return

    const now = performance.now()
    const elapsed = now - this.state.lastStepTime
    const rawProgress = elapsed / ANIMATION_DURATION
    this.state.animationProgress = Math.max(0, Math.min(1, rawProgress))

    if (this.state.animationProgress >= 1) {
      this.state.isAnimating = false
    }
  }

  public resize(): void {
    const wrapper = this.gameCanvas.parentElement
    if (!wrapper) return

    const rect = wrapper.getBoundingClientRect()
    const maxSize = Math.min(rect.width, rect.height) - 40
    const size = Math.max(400, Math.min(maxSize, 800))
    
    this.cellSize = Math.floor(size / GRID_SIZE)
    const actualSize = this.cellSize * GRID_SIZE
    
    this.offsetX = (rect.width - actualSize) / 2
    this.offsetY = (rect.height - actualSize) / 2

    this.gameCanvas.width = actualSize
    this.gameCanvas.height = actualSize

    this.starsCanvas.width = window.innerWidth
    this.starsCanvas.height = window.innerHeight
  }

  public onStep(): void {
    this.state.animationProgress = 0
    this.state.lastStepTime = performance.now()
    this.state.isAnimating = true
  }

  public setHoverCell(x: number | null, y: number | null): void {
    if (x === null || y === null) {
      this.hoverCell = null
    } else {
      this.hoverCell = { x, y }
    }
  }

  public screenToGrid(screenX: number, screenY: number): { x: number; y: number } | null {
    const rect = this.gameCanvas.getBoundingClientRect()
    const x = Math.floor((screenX - rect.left - this.offsetX) / this.cellSize)
    const y = Math.floor((screenY - rect.top - this.offsetY) / this.cellSize)
    
    if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
      return { x, y }
    }
    return null
  }

  public gridToScreen(gridX: number, gridY: number): { x: number; y: number } {
    return {
      x: this.offsetX + gridX * this.cellSize + this.cellSize / 2,
      y: this.offsetY + gridY * this.cellSize + this.cellSize / 2
    }
  }

  public render(grid: CellState[][]): void {
    this.currentGrid = grid
  }

  private renderFrame(): void {
    const now = performance.now()
    this.renderStars(now)
    this.renderGame(this.currentGrid)
  }

  private renderStars(time: number): void {
    const ctx = this.starsCtx
    ctx.clearRect(0, 0, this.starsCanvas.width, this.starsCanvas.height)

    for (const star of this.stars) {
      const x = star.x * this.starsCanvas.width
      const y = star.y * this.starsCanvas.height
      const twinkle = Math.sin(time * star.twinkleSpeed + star.phase) * 0.5 + 0.5
      const alpha = star.brightness * twinkle * 0.8 + 0.2

      ctx.beginPath()
      ctx.arc(x, y, star.size, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`
      ctx.fill()

      if (star.size > 1.5) {
        ctx.beginPath()
        ctx.arc(x, y, star.size * 2, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(200, 220, 255, ${alpha * 0.15})`
        ctx.fill()
      }
    }
  }

  private renderGame(grid: CellState[][]): void {
    const ctx = this.gameCtx
    const size = this.cellSize * GRID_SIZE

    ctx.clearRect(0, 0, this.gameCanvas.width, this.gameCanvas.height)

    ctx.save()
    ctx.translate(this.offsetX, this.offsetY)

    this.renderGrid(ctx, size)

    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const cell = grid[y][x]
        this.renderCell(ctx, cell)
      }
    }

    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const cell = grid[y][x]
        if (cell.animal) {
          this.renderAnimal(ctx, cell.animal)
        }
      }
    }

    if (this.hoverCell) {
      this.renderHover(ctx, this.hoverCell.x, this.hoverCell.y)
    }

    ctx.restore()
  }

  private renderGrid(ctx: CanvasRenderingContext2D, size: number): void {
    ctx.strokeStyle = 'rgba(60, 100, 80, 0.15)'
    ctx.lineWidth = 1

    for (let i = 0; i <= GRID_SIZE; i++) {
      const pos = i * this.cellSize
      
      ctx.beginPath()
      ctx.moveTo(pos, 0)
      ctx.lineTo(pos, size)
      ctx.stroke()

      ctx.beginPath()
      ctx.moveTo(0, pos)
      ctx.lineTo(size, pos)
      ctx.stroke()
    }

    ctx.strokeStyle = 'rgba(100, 150, 120, 0.4)'
    ctx.lineWidth = 2
    ctx.strokeRect(0, 0, size, size)
  }

  private renderCell(ctx: CanvasRenderingContext2D, cell: CellState): void {
    const px = cell.x * this.cellSize
    const py = cell.y * this.cellSize

    if (cell.forbidden) {
      ctx.fillStyle = 'rgba(80, 30, 30, 0.4)'
      ctx.fillRect(px, py, this.cellSize, this.cellSize)

      const centerX = px + this.cellSize / 2
      const centerY = py + this.cellSize / 2
      const xSize = this.cellSize * 0.35
      const lineWidth = Math.max(2, this.cellSize * 0.12)

      ctx.strokeStyle = 'rgba(220, 70, 70, 0.95)'
      ctx.lineWidth = lineWidth
      ctx.lineCap = 'round'

      ctx.beginPath()
      ctx.moveTo(centerX - xSize, centerY - xSize)
      ctx.lineTo(centerX + xSize, centerY + xSize)
      ctx.stroke()

      ctx.beginPath()
      ctx.moveTo(centerX + xSize, centerY - xSize)
      ctx.lineTo(centerX - xSize, centerY + xSize)
      ctx.stroke()

      ctx.strokeStyle = 'rgba(255, 100, 100, 0.6)'
      ctx.lineWidth = 2
      ctx.strokeRect(px + 1, py + 1, this.cellSize - 2, this.cellSize - 2)
      return
    }

    if (cell.grass) {
      if (cell.grass.remainingTurns === 0) {
        const centerX = px + this.cellSize / 2
        const centerY = py + this.cellSize / 2
        const radius = this.cellSize * 0.3

        const gradient = ctx.createRadialGradient(
          centerX, centerY, 0,
          centerX, centerY, radius
        )
        gradient.addColorStop(0, '#7ed9a8')
        gradient.addColorStop(0.7, '#4a9e7a')
        gradient.addColorStop(1, 'rgba(74, 158, 122, 0.3)')

        ctx.beginPath()
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
        ctx.fillStyle = gradient
        ctx.fill()

        ctx.beginPath()
        ctx.arc(centerX - radius * 0.2, centerY - radius * 0.2, radius * 0.15, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(200, 255, 220, 0.6)'
        ctx.fill()
      } else {
        const centerX = px + this.cellSize / 2
        const centerY = py + this.cellSize / 2
        const radius = this.cellSize * 0.15

        ctx.beginPath()
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(74, 158, 122, 0.25)'
        ctx.fill()

        ctx.fillStyle = 'rgba(150, 200, 170, 0.9)'
        ctx.font = `bold ${this.cellSize * 0.35}px Consolas, monospace`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(cell.grass.remainingTurns.toString(), centerX, centerY)
      }
    }
  }

  private renderAnimal(ctx: CanvasRenderingContext2D, animal: Animal): void {
    const t = this.easeOutQuad(this.state.animationProgress)
    
    const fromX = animal.prevX * this.cellSize + this.cellSize / 2
    const fromY = animal.prevY * this.cellSize + this.cellSize / 2
    const toX = animal.x * this.cellSize + this.cellSize / 2
    const toY = animal.y * this.cellSize + this.cellSize / 2

    const x = fromX + (toX - fromX) * t
    const y = fromY + (toY - fromY) * t

    const radius = this.cellSize * 0.35

    if (animal.type === CreatureType.Rabbit) {
      const bodyGradient = ctx.createRadialGradient(
        x - radius * 0.3, y - radius * 0.3, 0,
        x, y, radius
      )
      bodyGradient.addColorStop(0, '#f5f7fa')
      bodyGradient.addColorStop(0.5, '#d0d4dc')
      bodyGradient.addColorStop(1, '#a8b0bc')

      ctx.beginPath()
      ctx.arc(x, y, radius, 0, Math.PI * 2)
      ctx.fillStyle = bodyGradient
      ctx.fill()

      ctx.beginPath()
      ctx.arc(x - radius * 0.25, y - radius * 0.25, radius * 0.25, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
      ctx.fill()

      ctx.fillStyle = '#2a2a3a'
      ctx.beginPath()
      ctx.arc(x - radius * 0.15, y + radius * 0.1, radius * 0.08, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(x + radius * 0.15, y + radius * 0.1, radius * 0.08, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = '#ff9999'
      ctx.beginPath()
      ctx.arc(x, y + radius * 0.35, radius * 0.08, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = '#e8eaf0'
      ctx.beginPath()
      ctx.ellipse(x - radius * 0.3, y - radius * 0.6, radius * 0.12, radius * 0.3, -0.2, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.ellipse(x + radius * 0.3, y - radius * 0.6, radius * 0.12, radius * 0.3, 0.2, 0, Math.PI * 2)
      ctx.fill()
    } else {
      const bodyGradient = ctx.createRadialGradient(
        x - radius * 0.3, y - radius * 0.3, 0,
        x, y, radius
      )
      bodyGradient.addColorStop(0, '#ffb07a')
      bodyGradient.addColorStop(0.6, '#ff8c42')
      bodyGradient.addColorStop(1, '#cc6a20')

      ctx.beginPath()
      ctx.arc(x, y, radius + 2, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(139, 30, 30, 0.8)'
      ctx.lineWidth = 3
      ctx.stroke()

      ctx.beginPath()
      ctx.arc(x, y, radius, 0, Math.PI * 2)
      ctx.fillStyle = bodyGradient
      ctx.fill()

      ctx.beginPath()
      ctx.arc(x - radius * 0.2, y - radius * 0.2, radius * 0.2, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(255, 220, 180, 0.7)'
      ctx.fill()

      ctx.fillStyle = '#ffff88'
      ctx.beginPath()
      ctx.arc(x - radius * 0.2, y + radius * 0.05, radius * 0.1, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(x + radius * 0.2, y + radius * 0.05, radius * 0.1, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = '#1a1a1a'
      ctx.beginPath()
      ctx.arc(x - radius * 0.2, y + radius * 0.05, radius * 0.05, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(x + radius * 0.2, y + radius * 0.05, radius * 0.05, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = '#2a1a1a'
      ctx.beginPath()
      ctx.moveTo(x - radius * 0.5, y - radius * 0.3)
      ctx.lineTo(x - radius * 0.15, y - radius * 0.8)
      ctx.lineTo(x - radius * 0.1, y - radius * 0.3)
      ctx.closePath()
      ctx.fill()

      ctx.beginPath()
      ctx.moveTo(x + radius * 0.5, y - radius * 0.3)
      ctx.lineTo(x + radius * 0.15, y - radius * 0.8)
      ctx.lineTo(x + radius * 0.1, y - radius * 0.3)
      ctx.closePath()
      ctx.fill()

      ctx.fillStyle = '#332222'
      ctx.beginPath()
      ctx.ellipse(x, y + radius * 0.4, radius * 0.15, radius * 0.1, 0, 0, Math.PI * 2)
      ctx.fill()
    }

    const energyRatio = Math.max(0, Math.min(1, animal.energy / 150))
    const barWidth = this.cellSize * 0.6
    const barHeight = 4
    const barX = x - barWidth / 2
    const barY = y + radius + 6

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
    ctx.fillRect(barX, barY, barWidth, barHeight)

    const energyColor = energyRatio > 0.5 ? '#5bb98c' : energyRatio > 0.25 ? '#ffd166' : '#ef476f'
    ctx.fillStyle = energyColor
    ctx.fillRect(barX, barY, barWidth * energyRatio, barHeight)

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)'
    ctx.lineWidth = 1
    ctx.strokeRect(barX, barY, barWidth, barHeight)
  }

  private renderHover(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const px = x * this.cellSize
    const py = y * this.cellSize

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)'
    ctx.lineWidth = 2
    ctx.strokeRect(px + 1, py + 1, this.cellSize - 2, this.cellSize - 2)

    ctx.fillStyle = 'rgba(142, 202, 230, 0.2)'
    ctx.fillRect(px + 2, py + 2, this.cellSize - 4, this.cellSize - 4)
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value))
  }

  private easeOutQuad(t: number): number {
    const clamped = this.clamp(t, 0, 1)
    return 1 - (1 - clamped) * (1 - clamped)
  }

  public getCellSize(): number {
    return this.cellSize
  }

  public destroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
    window.removeEventListener('resize', () => this.resize())
  }
}
