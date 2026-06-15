export interface StrokePoint {
  x: number
  y: number
  pressure: number
  timestamp: number
  opacity: number
  radius: number
}

export interface BrushStroke {
  points: StrokePoint[]
  inkDensity: number
  finished: boolean
}

export class Brush {
  private currentStroke: BrushStroke | null = null
  private strokes: BrushStroke[] = []
  private inkDensity = 0.6
  private baseWidth = 8
  private lastTime = 0
  private prevPoint: StrokePoint | null = null

  setInkDensity(value: number): void {
    this.inkDensity = value
  }

  getInkDensity(): number {
    return this.inkDensity
  }

  getStrokes(): BrushStroke[] {
    return this.strokes
  }

  startStroke(x: number, y: number, pressure: number): BrushStroke {
    const now = performance.now()
    const point: StrokePoint = {
      x,
      y,
      pressure: Math.max(0.15, pressure),
      timestamp: now,
      opacity: this.inkDensity,
      radius: this.baseWidth * (0.3 + 0.7 * Math.max(0.15, pressure)) * 0.5,
    }
    this.currentStroke = {
      points: [point],
      inkDensity: this.inkDensity,
      finished: false,
    }
    this.prevPoint = point
    this.lastTime = now
    return this.currentStroke
  }

  continueStroke(x: number, y: number, pressure: number): StrokePoint | null {
    if (!this.currentStroke || !this.prevPoint) return null

    const now = performance.now()
    const dt = now - this.lastTime
    if (dt < 4) return null

    const dx = x - this.prevPoint.x
    const dy = y - this.prevPoint.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist < 1.5) return null

    const speed = dist / Math.max(dt, 1)
    const dynamicPressure = Math.max(0.15, Math.min(1, pressure * (1 - speed * 0.08)))

    const opacity = this.inkDensity * dynamicPressure * 0.85
    const radius = this.baseWidth * (0.3 + 0.7 * dynamicPressure) * 0.5

    const point: StrokePoint = {
      x: x + (Math.random() - 0.5) * 1.2,
      y: y + (Math.random() - 0.5) * 1.2,
      pressure: dynamicPressure,
      timestamp: now,
      opacity: Math.min(1, opacity),
      radius,
    }

    this.currentStroke.points.push(point)
    this.prevPoint = point
    this.lastTime = now
    return point
  }

  endStroke(): BrushStroke | null {
    if (!this.currentStroke) return null
    this.currentStroke.finished = true
    const stroke = this.currentStroke
    this.strokes.push(stroke)
    this.currentStroke = null
    this.prevPoint = null
    return stroke
  }

  getCurrentStroke(): BrushStroke | null {
    return this.currentStroke
  }

  clearStrokes(): void {
    this.strokes = []
    this.currentStroke = null
    this.prevPoint = null
  }

  drawStroke(
    ctx: CanvasRenderingContext2D,
    stroke: BrushStroke,
    useOffscreen: boolean = false
  ): void {
    const points = stroke.points
    if (points.length < 2) {
      if (points.length === 1) {
        this.drawDot(ctx, points[0])
      }
      return
    }

    ctx.save()
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    for (let i = 1; i < points.length; i++) {
      const p0 = points[i - 1]
      const p1 = points[i]

      const midX = (p0.x + p1.x) / 2
      const midY = (p0.y + p1.y) / 2

      const lineOpacity = (p0.opacity + p1.opacity) / 2
      const lineWidth = (p0.radius + p1.radius)

      ctx.beginPath()
      ctx.strokeStyle = `rgba(26, 26, 26, ${lineOpacity})`
      ctx.lineWidth = lineWidth

      if (i === 1) {
        ctx.moveTo(p0.x, p0.y)
        ctx.quadraticCurveTo(p0.x, p0.y, midX, midY)
      } else {
        const pp = points[i - 2]
        const prevMidX = (pp.x + p0.x) / 2
        const prevMidY = (pp.y + p0.y) / 2
        ctx.moveTo(prevMidX, prevMidY)
        ctx.quadraticCurveTo(p0.x, p0.y, midX, midY)
      }
      ctx.stroke()

      this.drawEdgeJitter(ctx, p0, p1, lineOpacity)
    }

    ctx.restore()
  }

  private drawDot(ctx: CanvasRenderingContext2D, p: StrokePoint): void {
    ctx.save()
    const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 2)
    gradient.addColorStop(0, `rgba(26, 26, 26, ${p.opacity})`)
    gradient.addColorStop(0.5, `rgba(26, 26, 26, ${p.opacity * 0.5})`)
    gradient.addColorStop(1, `rgba(123, 143, 161, 0)`)
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.radius * 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  private drawEdgeJitter(
    ctx: CanvasRenderingContext2D,
    p0: StrokePoint,
    p1: StrokePoint,
    opacity: number
  ): void {
    const dx = p1.x - p0.x
    const dy = p1.y - p0.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist < 2) return

    const nx = -dy / dist
    const ny = dx / dist

    const jitterCount = Math.min(4, Math.floor(dist / 6))
    for (let j = 0; j < jitterCount; j++) {
      const t = (j + 0.5) / jitterCount
      const bx = p0.x + dx * t
      const by = p0.y + dy * t
      const offset = (Math.random() - 0.5) * (p0.radius + p1.radius) * 0.8
      const jx = bx + nx * offset + (Math.random() - 0.5) * 2
      const jy = by + ny * offset + (Math.random() - 0.5) * 2
      const jRadius = Math.random() * 1.5 + 0.5

      ctx.save()
      ctx.fillStyle = `rgba(26, 26, 26, ${opacity * 0.15 * Math.random()})`
      ctx.beginPath()
      ctx.arc(jx, jy, jRadius, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
  }
}
