import type { Bottle } from './api'

export interface AnimatedBottle {
  id: string
  x: number
  y: number
  baseX: number
  baseY: number
  floatPhaseX: number
  floatPhaseY: number
  floatSpeedX: number
  floatSpeedY: number
  floatAmpX: number
  floatAmpY: number
  glowPhase: number
  glowSpeed: number
  color: string
  tag: string
  scale: number
  targetScale: number
  rotation: number
  rotationSpeed: number
  bottleData: Bottle
}

export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  color: string
  size: number
  gravity: number
}

const BOTTLE_WIDTH = 28
const BOTTLE_HEIGHT = 42
const HIT_PADDING = 8

export class AnimationEngine {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  bottles: AnimatedBottle[] = []
  particles: Particle[] = []
  time: number = 0
  animationId: number = 0
  running: boolean = false
  hoveredBottle: AnimatedBottle | null = null
  onBottleClick: ((bottle: AnimatedBottle) => void) | null = null
  onBottleHover: ((bottle: AnimatedBottle | null) => void) | null = null
  private mouseX: number = -1000
  private mouseY: number = -1000
  private dpr: number = 1

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect()
    this.canvas.width = rect.width * this.dpr
    this.canvas.height = rect.height * this.dpr
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    this.repositionBottles()
  }

  repositionBottles() {
    const w = this.canvas.getBoundingClientRect().width
    const h = this.canvas.getBoundingClientRect().height
    const margin = 60

    this.bottles.forEach((b) => {
      b.baseX = margin + Math.random() * (w - margin * 2)
      b.baseY = margin + Math.random() * (h - margin * 2)
    })
  }

  updateBottles(bottles: Bottle[]) {
    const w = this.canvas.getBoundingClientRect().width
    const h = this.canvas.getBoundingClientRect().height
    const margin = 60
    const existingMap = new Map(this.bottles.map(b => [b.id, b]))

    this.bottles = bottles.map((bottle) => {
      const existing = existingMap.get(bottle.id)
      if (existing) {
        existing.bottleData = bottle
        existing.color = bottle.color
        existing.tag = bottle.tag
        return existing
      }

      return {
        id: bottle.id,
        x: 0,
        y: 0,
        baseX: margin + Math.random() * (w - margin * 2),
        baseY: margin + Math.random() * (h - margin * 2),
        floatPhaseX: Math.random() * Math.PI * 2,
        floatPhaseY: Math.random() * Math.PI * 2,
        floatSpeedX: 0.3 + Math.random() * 0.5,
        floatSpeedY: 0.2 + Math.random() * 0.4,
        floatAmpX: 8 + Math.random() * 16,
        floatAmpY: 6 + Math.random() * 12,
        glowPhase: Math.random() * Math.PI * 2,
        glowSpeed: 1.5 + Math.random() * 1.0,
        color: bottle.color,
        tag: bottle.tag,
        scale: 1,
        targetScale: 1,
        rotation: (Math.random() - 0.5) * 0.15,
        rotationSpeed: (Math.random() - 0.5) * 0.002,
        bottleData: bottle,
      }
    })
  }

  spawnParticles(x: number, y: number, color: string, count: number = 25) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 1.5 + Math.random() * 4
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        life: 1.0,
        maxLife: 0.6 + Math.random() * 0.6,
        color,
        size: 2 + Math.random() * 4,
        gravity: 0.08 + Math.random() * 0.04,
      })
    }
  }

  getBottleAtPoint(mx: number, ny: number): AnimatedBottle | null {
    for (let i = this.bottles.length - 1; i >= 0; i--) {
      const b = this.bottles[i]
      const dx = mx - b.x
      const dy = ny - b.y
      if (Math.abs(dx) < BOTTLE_WIDTH / 2 + HIT_PADDING && Math.abs(dy) < BOTTLE_HEIGHT / 2 + HIT_PADDING) {
        return b
      }
    }
    return null
  }

  start() {
    if (this.running) return
    this.running = true
    this.time = performance.now() / 1000
    this.loop()
  }

  stop() {
    this.running = false
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
    }
  }

  private loop = () => {
    if (!this.running) return
    const now = performance.now() / 1000
    const dt = Math.min(now - this.time, 0.05)
    this.time = now
    this.update(dt)
    this.render()
    this.animationId = requestAnimationFrame(this.loop)
  }

  private update(dt: number) {
    for (const b of this.bottles) {
      b.floatPhaseX += b.floatSpeedX * dt
      b.floatPhaseY += b.floatSpeedY * dt
      b.glowPhase += b.glowSpeed * dt
      b.rotation += b.rotationSpeed

      b.x = b.baseX + Math.sin(b.floatPhaseX) * b.floatAmpX
      b.y = b.baseY + Math.cos(b.floatPhaseY) * b.floatAmpY

      b.scale += (b.targetScale - b.scale) * 0.1
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      p.x += p.vx
      p.y += p.vy
      p.vy += p.gravity
      p.life -= dt / p.maxLife
      if (p.life <= 0) {
        this.particles.splice(i, 1)
      }
    }
  }

  private render() {
    const w = this.canvas.getBoundingClientRect().width
    const h = this.canvas.getBoundingClientRect().height
    const ctx = this.ctx

    ctx.clearRect(0, 0, w, h)

    const grad = ctx.createLinearGradient(0, 0, 0, h)
    grad.addColorStop(0, '#0a0e27')
    grad.addColorStop(0.5, '#0d1233')
    grad.addColorStop(1, '#1a0a2e')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)

    this.drawWaveLayer(ctx, w, h, 0.3, 0.6, 'rgba(30, 60, 120, 0.08)', 80)
    this.drawWaveLayer(ctx, w, h, 0.5, 0.4, 'rgba(20, 50, 100, 0.06)', 60)
    this.drawWaveLayer(ctx, w, h, 0.7, 0.3, 'rgba(40, 30, 80, 0.05)', 40)

    for (const bottle of this.bottles) {
      this.drawBottle(ctx, bottle)
    }

    this.drawParticles(ctx)
  }

  private drawWaveLayer(ctx: CanvasRenderingContext2D, w: number, h: number, phase: number, speed: number, color: string, amplitude: number) {
    const t = this.time * speed + phase * 10
    ctx.beginPath()
    ctx.moveTo(0, h)
    for (let x = 0; x <= w; x += 4) {
      const y = h * (0.3 + phase * 0.4) + Math.sin(x * 0.008 + t) * amplitude + Math.sin(x * 0.003 + t * 0.5) * amplitude * 0.5
      ctx.lineTo(x, y)
    }
    ctx.lineTo(w, h)
    ctx.closePath()
    ctx.fillStyle = color
    ctx.fill()
  }

  private drawBottle(ctx: CanvasRenderingContext2D, b: AnimatedBottle) {
    ctx.save()
    ctx.translate(b.x, b.y)
    ctx.rotate(b.rotation)
    ctx.scale(b.scale, b.scale)

    const glowIntensity = 0.3 + Math.sin(b.glowPhase) * 0.15
    const glowSize = 35 + Math.sin(b.glowPhase) * 8

    const glowGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, glowSize)
    glowGrad.addColorStop(0, this.colorWithAlpha(b.color, glowIntensity))
    glowGrad.addColorStop(0.5, this.colorWithAlpha(b.color, glowIntensity * 0.3))
    glowGrad.addColorStop(1, this.colorWithAlpha(b.color, 0))
    ctx.fillStyle = glowGrad
    ctx.beginPath()
    ctx.arc(0, 0, glowSize, 0, Math.PI * 2)
    ctx.fill()

    this.drawBottleShape(ctx, b.color, b === this.hoveredBottle)

    if (b === this.hoveredBottle) {
      ctx.fillStyle = 'rgba(255,255,255,0.9)'
      ctx.font = '11px "Noto Sans SC", sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      const label = b.tag.substring(0, 2)
      ctx.fillText(label, 0, BOTTLE_HEIGHT / 2 + 6)
    }

    ctx.restore()
  }

  private drawBottleShape(ctx: CanvasRenderingContext2D, color: string, hovered: boolean) {
    const bw = BOTTLE_WIDTH
    const bh = BOTTLE_HEIGHT
    const neckW = bw * 0.3
    const neckH = bh * 0.25
    const bodyH = bh * 0.55
    const bodyTop = -bh / 2 + neckH
    const bodyBottom = bh / 2
    const shoulderW = bw * 0.35
    const corkH = bh * 0.1
    const corkTop = -bh / 2

    ctx.beginPath()

    ctx.moveTo(-neckW / 2, corkTop + corkH)
    ctx.lineTo(-neckW / 2, bodyTop + 4)
    ctx.quadraticCurveTo(-neckW / 2, bodyTop, -shoulderW, bodyTop + 2)
    ctx.quadraticCurveTo(-bw / 2, bodyTop + 8, -bw / 2, bodyTop + bodyH * 0.3)
    ctx.lineTo(-bw / 2, bodyBottom - 6)
    ctx.quadraticCurveTo(-bw / 2, bodyBottom, -bw / 2 + 6, bodyBottom)
    ctx.lineTo(bw / 2 - 6, bodyBottom)
    ctx.quadraticCurveTo(bw / 2, bodyBottom, bw / 2, bodyBottom - 6)
    ctx.lineTo(bw / 2, bodyTop + bodyH * 0.3)
    ctx.quadraticCurveTo(bw / 2, bodyTop + 8, shoulderW, bodyTop + 2)
    ctx.quadraticCurveTo(neckW / 2, bodyTop, neckW / 2, bodyTop + 4)
    ctx.lineTo(neckW / 2, corkTop + corkH)
    ctx.closePath()

    const bodyGrad = ctx.createLinearGradient(-bw / 2, 0, bw / 2, 0)
    bodyGrad.addColorStop(0, this.colorWithAlpha(color, 0.15))
    bodyGrad.addColorStop(0.3, this.colorWithAlpha(color, hovered ? 0.5 : 0.35))
    bodyGrad.addColorStop(0.5, this.colorWithAlpha(color, hovered ? 0.55 : 0.4))
    bodyGrad.addColorStop(0.7, this.colorWithAlpha(color, hovered ? 0.5 : 0.35))
    bodyGrad.addColorStop(1, this.colorWithAlpha(color, 0.15))
    ctx.fillStyle = bodyGrad
    ctx.fill()

    ctx.strokeStyle = this.colorWithAlpha(color, hovered ? 0.8 : 0.5)
    ctx.lineWidth = hovered ? 1.5 : 1
    ctx.stroke()

    ctx.fillStyle = this.colorWithAlpha(color, hovered ? 0.8 : 0.6)
    ctx.fillRect(-neckW / 2, corkTop, neckW, corkH)
    ctx.strokeStyle = this.colorWithAlpha(color, hovered ? 0.9 : 0.7)
    ctx.lineWidth = 0.8
    ctx.strokeRect(-neckW / 2, corkTop, neckW, corkH)

    const hlGrad = ctx.createLinearGradient(-bw / 2, 0, -bw / 4, 0)
    hlGrad.addColorStop(0, 'rgba(255,255,255,0)')
    hlGrad.addColorStop(1, 'rgba(255,255,255,0.15)')
    ctx.fillStyle = hlGrad
    ctx.fillRect(-bw / 2 + 2, bodyTop + 10, bw * 0.2, bodyH * 0.5)
  }

  private drawParticles(ctx: CanvasRenderingContext2D) {
    for (const p of this.particles) {
      const alpha = Math.max(0, p.life)
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2)
      ctx.fillStyle = this.colorWithAlpha(p.color, alpha * 0.7)
      ctx.fill()
    }
  }

  private colorWithAlpha(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r},${g},${b},${alpha})`
  }

  handleMouseMove(mx: number, my: number) {
    this.mouseX = mx
    this.mouseY = my
    const prev = this.hoveredBottle
    const found = this.getBottleAtPoint(mx, my)

    if (prev !== found) {
      if (prev) prev.targetScale = 1
      if (found) found.targetScale = 1.2
      this.hoveredBottle = found
      this.onBottleHover?.(found)
    }

    this.canvas.style.cursor = found ? 'pointer' : 'default'
  }

  handleClick(mx: number, my: number) {
    const found = this.getBottleAtPoint(mx, my)
    if (found) {
      this.spawnParticles(found.x, found.y, found.color, 25)
      this.onBottleClick?.(found)
    }
  }

  handleMouseLeave() {
    if (this.hoveredBottle) {
      this.hoveredBottle.targetScale = 1
      this.hoveredBottle = null
      this.onBottleHover?.(null)
    }
    this.canvas.style.cursor = 'default'
  }
}
