import type { TextParticle } from './ParticleEngine'

interface NebulaParticle {
  baseX: number
  baseY: number
  distance: number
  angle: number
  radius: number
  opacity: number
  colorProgress: number
}

export class Renderer {
  private ctx: CanvasRenderingContext2D
  private width: number
  private height: number
  private nebulaParticles: NebulaParticle[] = []
  private rotation: number = 0
  private readonly NEBULA_COUNT = 3000
  private readonly ROTATION_PERIOD = 5000

  constructor(ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.ctx = ctx
    this.width = width
    this.height = height
    this.initNebula()
  }

  resize(width: number, height: number): void {
    this.width = width
    this.height = height
    this.initNebula()
  }

  private initNebula(): void {
    this.nebulaParticles = []
    const centerX = this.width / 2
    const centerY = this.height / 2
    const maxDist = Math.min(this.width, this.height) * 0.6

    for (let i = 0; i < this.NEBULA_COUNT; i++) {
      const angle = Math.random() * Math.PI * 2
      const distFactor = Math.pow(Math.random(), 0.6)
      const distance = distFactor * maxDist

      const spiralOffset = distance * 0.008 * (i % 5)
      const finalAngle = angle + spiralOffset

      const sizeFactor = 1 - distFactor * 0.75
      const baseSize = 1.2 + sizeFactor * 4
      const radius = baseSize * (0.6 + Math.random() * 0.8)

      const opacity = 0.08 + (1 - distFactor) * 0.55

      this.nebulaParticles.push({
        baseX: centerX,
        baseY: centerY,
        distance,
        angle: finalAngle,
        radius,
        opacity,
        colorProgress: Math.random()
      })
    }
  }

  private lerpColor(progress: number): { r: number; g: number; b: number } {
    const c1 = { r: 10, g: 10, b: 46 }
    const c2 = { r: 107, g: 47, b: 160 }
    const p = progress < 0.5 ? progress * 2 : 2 - progress * 2
    return {
      r: Math.round(c1.r + (c2.r - c1.r) * p),
      g: Math.round(c1.g + (c2.g - c1.g) * p),
      b: Math.round(c1.b + (c2.b - c1.b) * p)
    }
  }

  private drawNebula(deltaMs: number, totalMs: number): void {
    this.rotation = (totalMs % this.ROTATION_PERIOD) / this.ROTATION_PERIOD * Math.PI * 2

    for (const p of this.nebulaParticles) {
      const rotatedAngle = p.angle + this.rotation
      const x = p.baseX + Math.cos(rotatedAngle) * p.distance
      const y = p.baseY + Math.sin(rotatedAngle) * p.distance * 0.75

      const wobble = Math.sin(totalMs * 0.001 + p.angle * 3) * 0.8
      const rx = x + Math.cos(rotatedAngle + Math.PI / 2) * wobble
      const ry = y + Math.sin(rotatedAngle + Math.PI / 2) * wobble * 0.75

      const colorP = (p.colorProgress + totalMs * 0.00005) % 1
      const color = this.lerpColor(colorP)

      this.ctx.beginPath()
      this.ctx.arc(rx, ry, p.radius, 0, Math.PI * 2)
      this.ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${p.opacity})`
      this.ctx.fill()
    }

    const cx = this.width / 2
    const cy = this.height / 2
    const maxRadius = Math.min(this.width, this.height) * 0.7
    const gradient = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, maxRadius)
    gradient.addColorStop(0, 'rgba(107, 47, 160, 0.12)')
    gradient.addColorStop(0.4, 'rgba(26, 26, 78, 0.06)')
    gradient.addColorStop(1, 'rgba(10, 10, 46, 0)')
    this.ctx.fillStyle = gradient
    this.ctx.fillRect(0, 0, this.width, this.height)
  }

  private drawTextParticles(particles: TextParticle[]): void {
    for (const p of particles) {
      if (p.opacity <= 0.01) continue

      const hue = ((p.hue % 360) + 360) % 360
      const color = `hsla(${hue}, ${p.saturation}%, ${p.lightness}%, ${p.opacity})`
      const glowColor = `hsla(${hue}, ${p.saturation}%, ${Math.min(p.lightness + 15, 95)}%, ${p.opacity * 0.4})`

      this.ctx.beginPath()
      this.ctx.shadowBlur = 12
      this.ctx.shadowColor = glowColor
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
      this.ctx.fillStyle = color
      this.ctx.fill()
      this.ctx.shadowBlur = 0

      if (p.radius > 4) {
        this.ctx.beginPath()
        this.ctx.arc(p.x, p.y, p.radius * 0.4, 0, Math.PI * 2)
        const innerColor = `hsla(${hue}, ${p.saturation}%, ${Math.min(p.lightness + 25, 100)}%, ${p.opacity * 0.9})`
        this.ctx.fillStyle = innerColor
        this.ctx.fill()
      }
    }
  }

  render(particles: TextParticle[], deltaMs: number, totalMs: number): void {
    this.ctx.fillStyle = '#0A0A2E'
    this.ctx.fillRect(0, 0, this.width, this.height)

    this.drawNebula(deltaMs, totalMs)
    this.drawTextParticles(particles)
  }

  exportPNG(): string {
    return this.ctx.canvas.toDataURL('image/png')
  }
}
