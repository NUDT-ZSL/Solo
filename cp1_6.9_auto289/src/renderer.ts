import { ParticleSystem, Character, Particle } from './particles'
import { Brush, BrushStroke } from './brush'

export interface Ripple {
  x: number
  y: number
  progress: number
}

export interface HoverPreview {
  char: string
  x: number
  y: number
}

const BG_COLOR = '#2a2a2a'
const TABLET_COLOR = '#f5e6c8'
const GOLD_COLOR = '#ffd700'
const PARTICLE_RADIUS_BASE = 3
const LINE_WIDTH = 0.8

export class Renderer {
  private ctx: CanvasRenderingContext2D
  private canvas: HTMLCanvasElement
  private dpr: number
  ripples: Ripple[] = []
  hoverPreview: HoverPreview | null = null
  private paperNoise: ImageData | null = null

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d', { alpha: false })!
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)
  }

  resize(w: number, h: number) {
    this.canvas.width = w * this.dpr
    this.canvas.height = h * this.dpr
    this.canvas.style.width = w + 'px'
    this.canvas.style.height = h + 'px'
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    this.generatePaperNoise(w, h)
  }

  private generatePaperNoise(w: number, h: number) {
    const noiseCanvas = document.createElement('canvas')
    noiseCanvas.width = w
    noiseCanvas.height = h
    const nctx = noiseCanvas.getContext('2d')!
    const img = nctx.createImageData(w, h)
    for (let i = 0; i < img.data.length; i += 4) {
      const r = 245 + Math.floor(Math.random() * 8)
      const g = 228 + Math.floor(Math.random() * 12)
      const b = 196 + Math.floor(Math.random() * 14)
      img.data[i] = r
      img.data[i + 1] = g
      img.data[i + 2] = b
      img.data[i + 3] = 70 + Math.floor(Math.random() * 30)
    }
    this.paperNoise = img
  }

  clear(w: number, h: number) {
    this.ctx.fillStyle = BG_COLOR
    this.ctx.fillRect(0, 0, w, h)
  }

  drawTablet(ps: ParticleSystem, w: number, h: number) {
    const rect = ps.getTabletRect()
    const ctx = this.ctx
    const radius = 8 * rect.scale

    ctx.save()
    ctx.shadowColor = 'rgba(0,0,0,0.5)'
    ctx.shadowBlur = 30 * rect.scale
    ctx.shadowOffsetY = 8 * rect.scale

    ctx.fillStyle = TABLET_COLOR
    this.roundRect(ctx, rect.left, rect.top, rect.width, rect.height, radius)
    ctx.fill()

    ctx.shadowColor = 'transparent'
    ctx.shadowBlur = 0
    ctx.shadowOffsetY = 0

    if (this.paperNoise) {
      ctx.save()
      this.roundRect(ctx, rect.left, rect.top, rect.width, rect.height, radius)
      ctx.clip()
      ctx.putImageData(this.paperNoise, Math.floor(rect.left), Math.floor(rect.top))
      ctx.restore()
    }

    ctx.strokeStyle = 'rgba(180,150,90,0.4)'
    ctx.lineWidth = 2 * rect.scale
    this.roundRect(ctx, rect.left, rect.top, rect.width, rect.height, radius)
    ctx.stroke()

    const gradient = ctx.createLinearGradient(rect.left, rect.top, rect.left, rect.top + rect.height)
    gradient.addColorStop(0, 'rgba(255,255,255,0.08)')
    gradient.addColorStop(0.5, 'rgba(0,0,0,0)')
    gradient.addColorStop(1, 'rgba(0,0,0,0.08)')
    ctx.fillStyle = gradient
    this.roundRect(ctx, rect.left, rect.top, rect.width, rect.height, radius)
    ctx.fill()

    ctx.restore()
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y)
    ctx.quadraticCurveTo(x + w, y, x + w, y + r)
    ctx.lineTo(x + w, y + h - r)
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
    ctx.lineTo(x + r, y + h)
    ctx.quadraticCurveTo(x, y + h, x, y + h - r)
    ctx.lineTo(x, y + r)
    ctx.quadraticCurveTo(x, y, x + r, y)
    ctx.closePath()
  }

  drawParticles(ps: ParticleSystem) {
    const ctx = this.ctx
    const rect = ps.getTabletRect()
    const scale = rect.scale

    for (const ch of ps.characters) {
      if (ch.completed && ch.scattered) continue

      let offsetX = 0, offsetY = 0, floatScale = 1, floatAlpha = 1
      if (ch.completed && !ch.scattered) {
        const t = Math.min(1, ch.floatProgress)
        floatScale = 1 + Math.sin(t * Math.PI) * 0.3
        floatAlpha = 1 - t * 0.5
        offsetY = -t * 60 * scale
      }

      const pts = ch.particles
      if (!ch.completed && pts.length > 1) {
        const maxDist = 28 * scale
        ctx.strokeStyle = `rgba(255,215,0,0.35)`
        ctx.lineWidth = LINE_WIDTH * scale
        ctx.beginPath()
        for (let i = 0; i < pts.length - 1; i++) {
          const a = pts[i], b = pts[i + 1]
          const dx = a.x - b.x, dy = a.y - b.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < maxDist) {
            const ax = ch.centerX + (a.x - ch.centerX) * floatScale + offsetX
            const ay = ch.centerY + (a.y - ch.centerY) * floatScale + offsetY
            const bx = ch.centerX + (b.x - ch.centerX) * floatScale + offsetX
            const by = ch.centerY + (b.y - ch.centerY) * floatScale + offsetY
            ctx.moveTo(ax, ay)
            ctx.lineTo(bx, by)
          }
        }
        ctx.stroke()
      }

      for (const p of pts) {
        const px = ch.centerX + (p.x - ch.centerX) * floatScale + offsetX
        const py = ch.centerY + (p.y - ch.centerY) * floatScale + offsetY
        const brightness = ps.getBreathBrightness(p)

        let color: string
        let alpha = floatAlpha
        if (p.covered) {
          color = this.getCoveredColor(p, ps)
        } else {
          alpha *= brightness
          color = `rgba(255,215,0,${alpha})`
        }

        const r = PARTICLE_RADIUS_BASE * scale * (p.covered ? 1 : (0.85 + brightness * 0.3))

        if (!p.covered) {
          const glowR = r * 3
          const grad = ctx.createRadialGradient(px, py, 0, px, py, glowR)
          grad.addColorStop(0, `rgba(255,215,0,${0.4 * brightness * floatAlpha})`)
          grad.addColorStop(1, 'rgba(255,215,0,0)')
          ctx.fillStyle = grad
          ctx.beginPath()
          ctx.arc(px, py, glowR, 0, Math.PI * 2)
          ctx.fill()
        }

        ctx.fillStyle = color
        ctx.beginPath()
        ctx.arc(px, py, r, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }

  private getCoveredColor(p: Particle, ps: ParticleSystem): string {
    const ch = ps.characters.find(c => c.id === p.charId)
    if (!ch) return 'rgba(25,25,30,1)'
    const idx = p.charIndex / ch.particles.length
    const r = Math.floor(20 + 15 * idx)
    const g = Math.floor(20 + 50 * idx)
    const b = Math.floor(25 + 75 * idx)
    return `rgba(${r},${g},${b},1)`
  }

  drawStrokes(brush: Brush) {
    const ctx = this.ctx

    for (const stroke of brush.strokes) {
      this.drawStroke(ctx, stroke)
    }

    const current = brush.getCurrentStroke()
    if (current && current.points.length > 0) {
      this.drawStroke(ctx, current)
    }
  }

  private drawStroke(ctx: CanvasRenderingContext2D, stroke: BrushStroke) {
    const pts = stroke.points
    if (pts.length < 2) {
      if (pts.length === 1) {
        const p = pts[0]
        ctx.fillStyle = p.color
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2)
        ctx.fill()
      }
      return
    }

    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1]
      const curr = pts[i]
      const steps = Math.max(1, Math.ceil(Math.sqrt((curr.x - prev.x) ** 2 + (curr.y - prev.y) ** 2) / 1.5))
      for (let s = 0; s < steps; s++) {
        const t = s / steps
        const x = prev.x + (curr.x - prev.x) * t
        const y = prev.y + (curr.y - prev.y) * t
        const size = prev.size + (curr.size - prev.size) * t
        const alpha = prev.alpha + (curr.alpha - prev.alpha) * t
        const colorT = t

        const r1 = 20, g1 = 20, b1 = 25
        const r2 = 30, g2 = 60, b2 = 90
        const r = Math.floor(r1 + (r2 - r1) * colorT)
        const g = Math.floor(g1 + (g2 - g1) * colorT)
        const b = Math.floor(b1 + (b2 - b1) * colorT)

        ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`
        ctx.beginPath()
        ctx.arc(x, y, size / 2, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }

  drawRipples(dt: number) {
    const ctx = this.ctx
    this.ripples = this.ripples.filter(r => r.progress < 1)
    for (const ripple of this.ripples) {
      ripple.progress += dt / 0.6
      const t = Math.min(1, ripple.progress)
      const radius = 10 + t * 120
      const alpha = (1 - t) * 0.8

      for (let i = 0; i < 3; i++) {
        const tt = Math.max(0, t - i * 0.15)
        if (tt <= 0) continue
        const rr = 10 + tt * 120
        const aa = (1 - tt) * 0.8 * (1 - i * 0.3)
        ctx.strokeStyle = `rgba(255,215,0,${aa})`
        ctx.lineWidth = (1 - tt) * 3 + 0.5
        ctx.beginPath()
        ctx.arc(ripple.x, ripple.y, rr, 0, Math.PI * 2)
        ctx.stroke()
      }
    }
  }

  addRipple(x: number, y: number) {
    this.ripples.push({ x, y, progress: 0 })
  }

  drawScatterDots(ps: ParticleSystem) {
    const ctx = this.ctx
    for (const ch of ps.characters) {
      if (!ch.completed) continue
      for (const dot of ch.scatterDots) {
        const size = dot.size
        const grad = ctx.createRadialGradient(dot.x, dot.y, 0, dot.x, dot.y, size * 2)
        grad.addColorStop(0, `rgba(255,215,0,${dot.alpha})`)
        grad.addColorStop(1, 'rgba(255,215,0,0)')
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(dot.x, dot.y, size * 2, 0, Math.PI * 2)
        ctx.fill()

        ctx.fillStyle = `rgba(255,220,80,${dot.alpha})`
        ctx.beginPath()
        ctx.arc(dot.x, dot.y, size * 0.6, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }

  drawBottomArea(bottomY: number, w: number, h: number) {
    const ctx = this.ctx
    const areaH = h - bottomY

    const grad = ctx.createLinearGradient(0, bottomY, 0, h)
    grad.addColorStop(0, 'rgba(0,0,0,0.3)')
    grad.addColorStop(0.3, 'rgba(245,230,200,0.05)')
    grad.addColorStop(1, 'rgba(245,230,200,0.08)')
    ctx.fillStyle = grad
    ctx.fillRect(0, bottomY, w, areaH)

    ctx.strokeStyle = 'rgba(245,230,200,0.2)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, bottomY + 0.5)
    ctx.lineTo(w, bottomY + 0.5)
    ctx.stroke()

    ctx.fillStyle = 'rgba(245,230,200,0.4)'
    ctx.font = '14px "KaiTi", "楷体", "STKaiti", serif'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillText('缩 微 碑 帖', 24, bottomY + 16)
  }

  drawHoverPreview() {
    if (!this.hoverPreview) return
    const ctx = this.ctx
    const { char, x, y } = this.hoverPreview
    const size = 80

    let px = x + 20
    let py = y - size / 2
    if (px + size > this.canvas.width / this.dpr) px = x - size - 20
    if (py < 0) py = 10
    if (py + size > this.canvas.height / this.dpr) py = this.canvas.height / this.dpr - size - 10

    ctx.save()
    const r = 12
    ctx.beginPath()
    ctx.moveTo(px + r, py)
    ctx.lineTo(px + size - r, py)
    ctx.quadraticCurveTo(px + size, py, px + size, py + r)
    ctx.lineTo(px + size, py + size - r)
    ctx.quadraticCurveTo(px + size, py + size, px + size - r, py + size)
    ctx.lineTo(px + r, py + size)
    ctx.quadraticCurveTo(px, py + size, px, py + size - r)
    ctx.lineTo(px, py + r)
    ctx.quadraticCurveTo(px, py, px + r, py)
    ctx.closePath()

    ctx.fillStyle = 'rgba(245,230,200,0.85)'
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,215,0,0.6)'
    ctx.lineWidth = 1.5
    ctx.stroke()

    ctx.fillStyle = '#1a1a20'
    ctx.font = 'bold 56px "KaiTi", "楷体", "STKaiti", serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(char, px + size / 2, py + size / 2 + 4)
    ctx.restore()
  }

  drawProgress(ps: ParticleSystem, w: number) {
    const ctx = this.ctx
    const done = ps.getCompletedCount()
    const total = ps.getTotalCount()
    const pct = done / total

    const barW = 180
    const barH = 6
    const x = w - barW - 30
    const y = 26

    ctx.fillStyle = 'rgba(245,230,200,0.4)'
    ctx.font = '12px "KaiTi", "楷体", "STKaiti", serif'
    ctx.textAlign = 'right'
    ctx.textBaseline = 'top'
    ctx.fillText(`进度 ${done} / ${total}`, x + barW, y - 18)

    ctx.fillStyle = 'rgba(0,0,0,0.4)'
    this.roundRect(ctx, x, y, barW, barH, 3)
    ctx.fill()

    ctx.fillStyle = '#ffd700'
    this.roundRect(ctx, x, y, barW * pct, barH, 3)
    ctx.fill()
  }
}
