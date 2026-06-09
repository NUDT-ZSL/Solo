export interface PaintBall {
  id: number
  x: number
  y: number
  radius: number
  color: string
  isDragging: boolean
  baseRadius: number
  dragOffsetX: number
  dragOffsetY: number
}

interface TrailPoint {
  x: number
  y: number
  radius: number
  color: string
  opacity: number
  birthTime: number
}

interface TextureParticle {
  x: number
  y: number
  size: number
  color: string
  baseBrightness: number
  phase: number
  cycle: number
}

export const COLOR_PALETTE = [
  '#FF3366',
  '#FF9933',
  '#FFD700',
  '#33CC66',
  '#3399FF',
  '#9933FF',
]

const TRAIL_DURATION = 300
const FEATHER_BLUR = 8
const CANVAS_SIZE = 800

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '')
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  }
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

function lerpColor(c1: string, c2: string, t: number): string {
  const a = hexToRgb(c1)
  const b = hexToRgb(c2)
  return rgbToHex(
    a.r + (b.r - a.r) * t,
    a.g + (b.g - a.g) * t,
    a.b + (b.b - a.b) * t,
  )
}

function adjustBrightness(color: string, factor: number): string {
  const c = hexToRgb(color)
  return rgbToHex(c.r * factor, c.g * factor, c.b * factor)
}

export class CanvasRenderer {
  private canvas: HTMLCanvasElement | null = null
  private ctx: CanvasRenderingContext2D | null = null
  private offscreenCanvas: HTMLCanvasElement | null = null
  private offscreenCtx: CanvasRenderingContext2D | null = null
  private exportCanvas: HTMLCanvasElement | null = null
  private exportCtx: CanvasRenderingContext2D | null = null

  private balls: PaintBall[] = []
  private trails: TrailPoint[] = []
  private particles: TextureParticle[] = []
  private nextId = 1

  private brightness = 1.0
  private diffusionSpeed = 5
  private textureDensity = 30

  private animationId: number | null = null
  private lastTime = 0
  private draggedBallId: number | null = null
  private scaleFactor = 1

  onBallsChange?: (balls: PaintBall[]) => void

  constructor() {
    this.offscreenCanvas = document.createElement('canvas')
    this.offscreenCtx = this.offscreenCanvas.getContext('2d')
    this.exportCanvas = document.createElement('canvas')
    this.exportCanvas.width = CANVAS_SIZE
    this.exportCanvas.height = CANVAS_SIZE
    this.exportCtx = this.exportCanvas.getContext('2d')
  }

  bindCanvas(canvas: HTMLCanvasElement, displaySize: number = CANVAS_SIZE) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.scaleFactor = displaySize / CANVAS_SIZE
    canvas.width = displaySize
    canvas.height = displaySize
    if (this.offscreenCanvas) {
      this.offscreenCanvas.width = displaySize
      this.offscreenCanvas.height = displaySize
    }
    this.lastTime = performance.now()
    this.startLoop()
  }

  updateDisplaySize(displaySize: number) {
    if (!this.canvas) return
    this.scaleFactor = displaySize / CANVAS_SIZE
    this.canvas.width = displaySize
    this.canvas.height = displaySize
    if (this.offscreenCanvas) {
      this.offscreenCanvas.width = displaySize
      this.offscreenCanvas.height = displaySize
    }
  }

  setBrightness(v: number) {
    this.brightness = v
  }

  setDiffusionSpeed(v: number) {
    this.diffusionSpeed = v
  }

  setTextureDensity(v: number) {
    this.textureDensity = v
  }

  createBall(x: number, y: number): PaintBall {
    const color = COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)]
    const ball: PaintBall = {
      id: this.nextId++,
      x: x / this.scaleFactor,
      y: y / this.scaleFactor,
      radius: 20,
      baseRadius: 20,
      color,
      isDragging: false,
      dragOffsetX: 0,
      dragOffsetY: 0,
    }
    this.balls.push(ball)
    this.spawnParticlesForBall(ball)
    this.notifyChange()
    return ball
  }

  private spawnParticlesForBall(ball: PaintBall) {
    const count = Math.floor(this.textureDensity / 5) + 1
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const dist = Math.random() * ball.radius
      this.particles.push({
        x: ball.x + Math.cos(angle) * dist,
        y: ball.y + Math.sin(angle) * dist,
        size: 2 + Math.random() * 4,
        color: ball.color,
        baseBrightness: 0.5 + Math.random() * 1.0,
        phase: Math.random() * Math.PI * 2,
        cycle: 0.5 + Math.random() * 1.0,
      })
    }
  }

  clear() {
    this.balls = []
    this.trails = []
    this.particles = []
    this.notifyChange()
  }

  handleMouseDown(x: number, y: number): boolean {
    const cx = x / this.scaleFactor
    const cy = y / this.scaleFactor

    for (let i = this.balls.length - 1; i >= 0; i--) {
      const b = this.balls[i]
      const dx = cx - b.x
      const dy = cy - b.y
      if (dx * dx + dy * dy <= (b.radius + 5) * (b.radius + 5)) {
        b.isDragging = true
        b.dragOffsetX = dx
        b.dragOffsetY = dy
        this.draggedBallId = b.id
        return true
      }
    }
    return false
  }

  handleMouseMove(x: number, y: number) {
    if (this.draggedBallId === null) return
    const cx = x / this.scaleFactor
    const cy = y / this.scaleFactor
    const ball = this.balls.find((b) => b.id === this.draggedBallId)
    if (!ball) return

    ball.x = cx - ball.dragOffsetX
    ball.y = cy - ball.dragOffsetY

    this.trails.push({
      x: ball.x,
      y: ball.y,
      radius: ball.radius,
      color: ball.color,
      opacity: 0.6,
      birthTime: performance.now(),
    })
  }

  handleMouseUp() {
    if (this.draggedBallId !== null) {
      const ball = this.balls.find((b) => b.id === this.draggedBallId)
      if (ball) {
        ball.isDragging = false
      }
    }
    this.draggedBallId = null
  }

  exportImage(): string {
    if (!this.exportCtx) return ''
    const ctx = this.exportCtx

    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

    ctx.save()
    ctx.beginPath()
    ctx.arc(CANVAS_SIZE / 2, CANVAS_SIZE / 2, CANVAS_SIZE / 2, 0, Math.PI * 2)
    ctx.clip()

    ctx.filter = `blur(${FEATHER_BLUR}px) brightness(${this.brightness})`
    this.drawGlowLayer(ctx, 1)
    ctx.filter = `brightness(${this.brightness})`
    this.drawBlendRegions(ctx, 1)
    this.drawBalls(ctx, 1)
    ctx.filter = 'none'
    this.drawParticlesForExport(ctx)

    ctx.restore()

    return this.exportCanvas!.toDataURL('image/png')
  }

  private drawBalls(ctx: CanvasRenderingContext2D, sf: number) {
    for (const b of this.balls) {
      const g = ctx.createRadialGradient(
        b.x * sf,
        b.y * sf,
        0,
        b.x * sf,
        b.y * sf,
        b.radius * sf,
      )
      g.addColorStop(0, b.color + 'FF')
      g.addColorStop(0.6, b.color + 'CC')
      g.addColorStop(1, b.color + '00')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(b.x * sf, b.y * sf, b.radius * sf, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  private drawGlowLayer(ctx: CanvasRenderingContext2D, sf: number) {
    for (const b of this.balls) {
      const glowR = b.radius * 1.8 * sf
      const g = ctx.createRadialGradient(
        b.x * sf,
        b.y * sf,
        0,
        b.x * sf,
        b.y * sf,
        glowR,
      )
      g.addColorStop(0, b.color + '55')
      g.addColorStop(0.5, b.color + '22')
      g.addColorStop(1, b.color + '00')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(b.x * sf, b.y * sf, glowR, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  private drawBlendRegions(ctx: CanvasRenderingContext2D, sf: number) {
    const processed = new Set<string>()
    for (let i = 0; i < this.balls.length; i++) {
      for (let j = i + 1; j < this.balls.length; j++) {
        const key = `${i}-${j}`
        if (processed.has(key)) continue
        const a = this.balls[i]
        const b = this.balls[j]
        const dx = b.x - a.x
        const dy = b.y - a.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        const minDist = a.radius + b.radius
        if (dist < minDist) {
          processed.add(key)
          const steps = 10
          for (let s = 0; s < steps - 1; s++) {
            const t1 = s / (steps - 1)
            const t2 = (s + 1) / (steps - 1)
            const midT = (t1 + t2) / 2
            const midX = a.x + dx * midT
            const midY = a.y + dy * midT
            const midR = (a.radius + (b.radius - a.radius) * midT) * 1.05
            const midColor = lerpColor(a.color, b.color, midT)

            const grad = ctx.createRadialGradient(
              midX * sf,
              midY * sf,
              0,
              midX * sf,
              midY * sf,
              midR * sf,
            )
            grad.addColorStop(0, midColor + 'DD')
            grad.addColorStop(0.6, midColor + '88')
            grad.addColorStop(1, midColor + '00')
            ctx.fillStyle = grad
            ctx.beginPath()
            ctx.arc(midX * sf, midY * sf, midR * sf, 0, Math.PI * 2)
            ctx.fill()
          }
        }
      }
    }
  }

  private drawTrails(ctx: CanvasRenderingContext2D, sf: number, now: number) {
    this.trails = this.trails.filter((t) => {
      const age = now - t.birthTime
      if (age > TRAIL_DURATION) return false
      const alpha = (1 - age / TRAIL_DURATION) * 0.6
      const g = ctx.createRadialGradient(
        t.x * sf,
        t.y * sf,
        0,
        t.x * sf,
        t.y * sf,
        t.radius * sf,
      )
      g.addColorStop(0, t.color + Math.floor(alpha * 255).toString(16).padStart(2, '0'))
      g.addColorStop(1, t.color + '00')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(t.x * sf, t.y * sf, t.radius * sf, 0, Math.PI * 2)
      ctx.fill()
      return true
    })
  }

  private drawParticles(ctx: CanvasRenderingContext2D, sf: number, now: number) {
    if (this.textureDensity === 0) return
    const maxParticles = Math.floor(this.textureDensity * this.balls.length * 1.5)
    while (this.particles.length > maxParticles && this.balls.length > 0) {
      this.particles.splice(Math.floor(Math.random() * this.particles.length), 1)
    }
    if (this.particles.length < maxParticles && this.balls.length > 0) {
      const needAdd = Math.min(maxParticles - this.particles.length, 3)
      for (let k = 0; k < needAdd; k++) {
        const ball = this.balls[Math.floor(Math.random() * this.balls.length)]
        const angle = Math.random() * Math.PI * 2
        const dist = Math.random() * ball.radius * 1.2
        this.particles.push({
          x: ball.x + Math.cos(angle) * dist,
          y: ball.y + Math.sin(angle) * dist,
          size: 2 + Math.random() * 4,
          color: ball.color,
          baseBrightness: 0.5 + Math.random() * 1.0,
          phase: Math.random() * Math.PI * 2,
          cycle: 0.5 + Math.random() * 1.0,
        })
      }
    }

    for (const p of this.particles) {
      const t = (now / 1000) / p.cycle * Math.PI * 2 + p.phase
      const breath = 0.5 + 0.5 * Math.sin(t)
      const alpha = 0.3 + 0.7 * breath
      const bright = p.baseBrightness * (0.8 + 0.4 * breath)
      const col = adjustBrightness(p.color, bright)
      ctx.fillStyle = col + Math.floor(alpha * 255).toString(16).padStart(2, '0')
      ctx.beginPath()
      ctx.arc(p.x * sf, p.y * sf, p.size * sf * (0.7 + 0.5 * breath), 0, Math.PI * 2)
      ctx.fill()
    }
  }

  private drawParticlesForExport(ctx: CanvasRenderingContext2D) {
    if (this.textureDensity === 0) return
    const now = performance.now()
    this.drawParticles(ctx, 1, now)
  }

  private update(dt: number) {
    const diffusionFactor = this.diffusionSpeed / 1000

    for (const b of this.balls) {
      if (!b.isDragging) {
        const maxRadius = Math.max(b.baseRadius * 4, 80)
        if (b.radius < maxRadius) {
          b.radius += diffusionFactor * dt * (1 + (b.baseRadius / b.radius) * 0.3)
          if (b.radius > maxRadius) b.radius = maxRadius
        }
      }
    }

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i]
      for (const b of this.balls) {
        const dx = p.x - b.x
        const dy = p.y - b.y
        const d2 = dx * dx + dy * dy
        const maxD = b.radius * 1.5
        if (d2 < maxD * maxD) {
          p.color = b.color
          break
        }
      }
    }
  }

  private render = (now: number) => {
    if (!this.ctx || !this.canvas || !this.offscreenCtx || !this.offscreenCanvas) {
      this.animationId = requestAnimationFrame(this.render)
      return
    }

    const dt = Math.min(now - this.lastTime, 50)
    this.lastTime = now

    this.update(dt)

    const mainCtx = this.ctx
    const offCtx = this.offscreenCtx
    const sf = this.scaleFactor
    const w = this.canvas.width
    const h = this.canvas.height

    mainCtx.fillStyle = '#000000'
    mainCtx.fillRect(0, 0, w, h)

    mainCtx.save()
    mainCtx.beginPath()
    mainCtx.arc(w / 2, h / 2, w / 2, 0, Math.PI * 2)
    mainCtx.clip()

    offCtx.clearRect(0, 0, w, h)

    offCtx.filter = `blur(${FEATHER_BLUR}px)`
    this.drawGlowLayer(offCtx, sf)
    this.drawBlendRegions(offCtx, sf)
    this.drawBalls(offCtx, sf)
    offCtx.filter = 'none'

    this.drawTrails(offCtx, sf, now)

    mainCtx.filter = `brightness(${this.brightness})`
    mainCtx.drawImage(this.offscreenCanvas, 0, 0)
    mainCtx.filter = 'none'

    this.drawParticles(mainCtx, sf, now)

    mainCtx.restore()

    this.animationId = requestAnimationFrame(this.render)
  }

  private startLoop() {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId)
    }
    this.lastTime = performance.now()
    this.animationId = requestAnimationFrame(this.render)
  }

  stop() {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
  }

  getBalls(): PaintBall[] {
    return this.balls
  }

  private notifyChange() {
    if (this.onBallsChange) {
      this.onBallsChange(this.balls.map((b) => ({ ...b })))
    }
  }
}
