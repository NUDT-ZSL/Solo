export interface BrushPoint {
  x: number
  y: number
  size: number
  alpha: number
  color: string
}

export interface BrushStroke {
  points: BrushPoint[]
}

const MIN_SIZE = 3
const MAX_SIZE = 12
const MIN_ALPHA = 0.4
const MAX_ALPHA = 0.9
const SPEED_SLOW = 0.08
const SPEED_FAST = 0.5
const SAMPLE_DIST = 2

export class Brush {
  private canvas: HTMLCanvasElement
  strokes: BrushStroke[] = []
  private currentStroke: BrushStroke | null = null
  isPressed: boolean = false
  private lastX: number = 0
  private lastY: number = 0
  private lastTime: number = 0
  private smoothedSize: number = MAX_SIZE
  private smoothedAlpha: number = MAX_ALPHA
  private hoverX: number = -1000
  private hoverY: number = -1000
  onHover?: (x: number, y: number) => void

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.bindEvents()
  }

  private bindEvents() {
    const getPos = (e: MouseEvent | TouchEvent) => {
      const rect = this.canvas.getBoundingClientRect()
      let cx: number, cy: number
      if ('touches' in e) {
        const t = e.touches[0] || e.changedTouches[0]
        cx = t.clientX
        cy = t.clientY
      } else {
        cx = e.clientX
        cy = e.clientY
      }
      return {
        x: (cx - rect.left) * (this.canvas.width / rect.width),
        y: (cy - rect.top) * (this.canvas.height / rect.height)
      }
    }

    this.canvas.addEventListener('mousedown', (e) => {
      const p = getPos(e)
      this.pressStart(p.x, p.y)
    })
    this.canvas.addEventListener('mousemove', (e) => {
      const p = getPos(e)
      this.hoverX = p.x
      this.hoverY = p.y
      if (this.onHover) this.onHover(p.x, p.y)
      if (this.isPressed) this.pressMove(p.x, p.y)
    })
    this.canvas.addEventListener('mouseup', () => this.pressEnd())
    this.canvas.addEventListener('mouseleave', () => {
      this.hoverX = -1000
      this.hoverY = -1000
      if (this.isPressed) this.pressEnd()
    })

    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault()
      const p = getPos(e)
      this.pressStart(p.x, p.y)
    }, { passive: false })
    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault()
      const p = getPos(e)
      this.hoverX = p.x
      this.hoverY = p.y
      if (this.onHover) this.onHover(p.x, p.y)
      if (this.isPressed) this.pressMove(p.x, p.y)
    }, { passive: false })
    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault()
      this.pressEnd()
    }, { passive: false })
  }

  private pressStart(x: number, y: number) {
    this.isPressed = true
    this.lastX = x
    this.lastY = y
    this.lastTime = performance.now()
    this.smoothedSize = MAX_SIZE
    this.smoothedAlpha = MAX_ALPHA
    this.currentStroke = { points: [] }
    this.addPoint(x, y, MAX_SIZE, MAX_ALPHA)
  }

  private pressMove(x: number, y: number) {
    if (!this.isPressed || !this.currentStroke) return
    const now = performance.now()
    const dx = x - this.lastX
    const dy = y - this.lastY
    const dist = Math.sqrt(dx * dx + dy * dy)
    const dt = (now - this.lastTime) / 1000
    if (dt <= 0) return

    const speed = dist / dt / 1000
    const t = Math.min(1, Math.max(0, (speed - SPEED_SLOW) / (SPEED_FAST - SPEED_SLOW)))
    const targetSize = MAX_SIZE - t * (MAX_SIZE - MIN_SIZE)
    const targetAlpha = MAX_ALPHA - t * (MAX_ALPHA - MIN_ALPHA)

    this.smoothedSize = this.smoothedSize * 0.6 + targetSize * 0.4
    this.smoothedAlpha = this.smoothedAlpha * 0.6 + targetAlpha * 0.4

    if (dist >= SAMPLE_DIST) {
      const steps = Math.ceil(dist / SAMPLE_DIST)
      for (let i = 1; i <= steps; i++) {
        const ix = this.lastX + (dx * i) / steps
        const iy = this.lastY + (dy * i) / steps
        this.addPoint(ix, iy, this.smoothedSize, this.smoothedAlpha)
      }
      this.lastX = x
      this.lastY = y
      this.lastTime = now
    }
  }

  private pressEnd() {
    if (this.isPressed && this.currentStroke && this.currentStroke.points.length > 0) {
      this.strokes.push(this.currentStroke)
    }
    this.isPressed = false
    this.currentStroke = null
  }

  private addPoint(x: number, y: number, size: number, alpha: number) {
    if (!this.currentStroke) return
    const color = this.getGradientColor(alpha)
    this.currentStroke.points.push({ x, y, size, alpha, color })
  }

  private getGradientColor(alpha: number): string {
    const r = Math.floor(20 + (30 - 20) * (1 - alpha))
    const g = Math.floor(20 + (60 - 20) * (1 - alpha))
    const b = Math.floor(25 + (90 - 25) * (1 - alpha))
    return `rgba(${r},${g},${b},${alpha})`
  }

  getCurrentStroke(): BrushStroke | null {
    return this.currentStroke
  }

  getHoverPos(): { x: number; y: number } {
    return { x: this.hoverX, y: this.hoverY }
  }

  getPenColor(t: number): string {
    const r = Math.floor(20 + 10 * t)
    const g = Math.floor(20 + 40 * t)
    const b = Math.floor(25 + 65 * t)
    return `rgb(${r},${g},${b})`
  }
}
