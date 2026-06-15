import { EngineSnapshot, Cell, SoundWave, Fragment, Particle, TrailParticle, DIFFICULTY_CONFIGS } from '../core/types'

const WALL_COLOR = '#2a2a2a'
const WALL_GLOW_ALPHA = 0.3
const BALL_GLOW_RADIUS = 20
const BALL_GLOW_ALPHA = 0.6

export class Renderer {
  private ctx: CanvasRenderingContext2D
  private canvas: HTMLCanvasElement

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D context not available')
    this.ctx = ctx
  }

  render(snapshot: EngineSnapshot, timestamp: number) {
    const { maze, ball, soundWaves, fragments, particles, trail, exitPosition, difficulty } = snapshot
    const config = DIFFICULTY_CONFIGS[difficulty]
    const cs = config.cellSize
    const offset = cs * 0.5

    this.clear(snapshot.canvasSize)
    this.drawExit(exitPosition.x, exitPosition.y, timestamp)
    this.drawMaze(maze, cs, offset, soundWaves, timestamp)
    this.drawFragments(fragments, timestamp)
    this.drawTrail(trail)
    this.drawBall(ball)
    this.drawSoundWaves(soundWaves, timestamp)
    this.drawParticles(particles)
  }

  private clear(size: number) {
    this.ctx.fillStyle = '#000000'
    this.ctx.fillRect(0, 0, size, size)
  }

  private drawMaze(
    maze: Cell[][],
    cs: number,
    offset: number,
    soundWaves: SoundWave[],
    timestamp: number
  ) {
    const size = maze.length
    const glowColor = this.getDominantWaveColor(soundWaves)

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const cell = maze[y][x]
        const x1 = x * cs + offset
        const y1 = y * cs + offset
        const x2 = x1 + cs
        const y2 = y1 + cs

        this.ctx.save()
        this.ctx.strokeStyle = WALL_COLOR
        this.ctx.lineWidth = 4
        this.ctx.lineCap = 'square'

        if (cell.walls.top) this.drawWall(x1, y1, x2, y1, glowColor)
        if (cell.walls.right) this.drawWall(x2, y1, x2, y2, glowColor)
        if (cell.walls.bottom) this.drawWall(x1, y2, x2, y2, glowColor)
        if (cell.walls.left) this.drawWall(x1, y1, x1, y2, glowColor)

        this.ctx.restore()
      }
    }
  }

  private drawWall(x1: number, y1: number, x2: number, y2: number, glowColor: string) {
    if (glowColor !== 'transparent') {
      this.ctx.save()
      this.ctx.shadowColor = glowColor
      this.ctx.shadowBlur = 8
      this.ctx.globalAlpha = WALL_GLOW_ALPHA
      this.ctx.strokeStyle = glowColor
      this.ctx.lineWidth = 2
      this.ctx.beginPath()
      this.ctx.moveTo(x1, y1)
      this.ctx.lineTo(x2, y2)
      this.ctx.stroke()
      this.ctx.restore()
    }

    this.ctx.strokeStyle = WALL_COLOR
    this.ctx.lineWidth = 4
    this.ctx.beginPath()
    this.ctx.moveTo(x1, y1)
    this.ctx.lineTo(x2, y2)
    this.ctx.stroke()
  }

  private getDominantWaveColor(waves: SoundWave[]): string {
    for (const wave of waves) {
      if (wave.segments.length > 1) {
        return wave.bounceColor
      }
    }
    if (waves.length > 0) {
      return waves[0].color
    }
    return 'transparent'
  }

  private drawBall(ball: { x: number; y: number; radius: number }) {
    const { ctx } = this

    ctx.save()
    const gradient = ctx.createRadialGradient(
      ball.x, ball.y, 0,
      ball.x, ball.y, BALL_GLOW_RADIUS
    )
    gradient.addColorStop(0, `rgba(255, 255, 255, ${BALL_GLOW_ALPHA})`)
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.2)')
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')

    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(ball.x, ball.y, BALL_GLOW_RADIUS, 0, Math.PI * 2)
    ctx.fill()

    ctx.shadowColor = '#FFFFFF'
    ctx.shadowBlur = 15
    ctx.fillStyle = '#FFFFFF'
    ctx.beginPath()
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = '#E0F7FF'
    ctx.beginPath()
    ctx.arc(ball.x - ball.radius * 0.3, ball.y - ball.radius * 0.3, ball.radius * 0.35, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  private drawTrail(trail: TrailParticle[]) {
    const { ctx } = this
    for (let i = 0; i < trail.length; i++) {
      const t = trail[i]
      const alpha = t.life * 0.5
      const size = 6 * t.life

      ctx.save()
      ctx.globalAlpha = alpha
      const gradient = ctx.createRadialGradient(
        t.x, t.y, 0,
        t.x, t.y, size
      )
      gradient.addColorStop(0, 'rgba(200, 240, 255, 0.8)')
      gradient.addColorStop(1, 'rgba(200, 240, 255, 0)')
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(t.x, t.y, size, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
  }

  private drawSoundWaves(waves: SoundWave[], timestamp: number) {
    const { ctx } = this

    for (const wave of waves) {
      const age = timestamp - wave.birthTime
      const lifeRatio = Math.max(0, 1 - age / wave.lifetime)
      const pulseProgress = Math.min(1, age / (wave.lifetime * 0.4))

      ctx.save()
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      for (let i = 0; i < wave.segments.length; i++) {
        const seg = wave.segments[i]
        const segLength = Math.sqrt(
          (seg.x2 - seg.x1) ** 2 + (seg.y2 - seg.y1) ** 2
        )
        const currentSegLength = segLength * pulseProgress

        const dx = (seg.x2 - seg.x1) / segLength
        const dy = (seg.y2 - seg.y1) / segLength
        const endX = seg.x1 + dx * currentSegLength
        const endY = seg.y1 + dy * currentSegLength

        const baseAlpha = lifeRatio * 0.9

        if (wave.isStrongPulse) {
          ctx.shadowColor = seg.color
          ctx.shadowBlur = 20
          ctx.lineWidth = 5
        } else {
          ctx.shadowColor = seg.color
          ctx.shadowBlur = 10
          ctx.lineWidth = 2
        }

        const rgb = this.hexToRgb(seg.color)
        const gradient = ctx.createLinearGradient(seg.x1, seg.y1, endX, endY)
        gradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${baseAlpha * 0.2})`)
        gradient.addColorStop(0.7, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${baseAlpha})`)
        gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${baseAlpha})`)

        ctx.strokeStyle = gradient
        ctx.beginPath()
        ctx.moveTo(seg.x1, seg.y1)
        ctx.lineTo(endX, endY)
        ctx.stroke()

        if (pulseProgress >= 0.95 && i === wave.segments.length - 1) {
          const tipGlow = ctx.createRadialGradient(
            endX, endY, 0,
            endX, endY, wave.isStrongPulse ? 15 : 8
          )
          tipGlow.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${baseAlpha})`)
          tipGlow.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`)
          ctx.fillStyle = tipGlow
          ctx.beginPath()
          ctx.arc(endX, endY, wave.isStrongPulse ? 15 : 8, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      ctx.restore()
    }
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 255, g: 255, b: 255 }
  }

  private drawFragments(fragments: Fragment[], timestamp: number) {
    const { ctx } = this
    const cycleMs = 1000

    for (const frag of fragments) {
      if (frag.collected) continue

      const phase = (timestamp / cycleMs + frag.phase) * Math.PI * 2
      const alpha = 0.5 + 0.5 * Math.sin(phase)

      ctx.save()
      const rgb = this.hexToRgb(frag.color)

      const outerGlow = ctx.createRadialGradient(
        frag.x, frag.y, 0,
        frag.x, frag.y, frag.radius * 3
      )
      outerGlow.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha * 0.6})`)
      outerGlow.addColorStop(0.5, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha * 0.2})`)
      outerGlow.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`)

      ctx.fillStyle = outerGlow
      ctx.beginPath()
      ctx.arc(frag.x, frag.y, frag.radius * 3, 0, Math.PI * 2)
      ctx.fill()

      ctx.shadowColor = frag.color
      ctx.shadowBlur = 12
      ctx.globalAlpha = alpha
      ctx.fillStyle = frag.color

      this.drawStar(ctx, frag.x, frag.y, 5, frag.radius, frag.radius * 0.5)

      ctx.restore()
    }
  }

  private drawStar(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    spikes: number,
    outerRadius: number,
    innerRadius: number
  ) {
    let rot = (Math.PI / 2) * 3
    let x = cx
    let y = cy
    const step = Math.PI / spikes

    ctx.beginPath()
    ctx.moveTo(cx, cy - outerRadius)
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius
      y = cy + Math.sin(rot) * outerRadius
      ctx.lineTo(x, y)
      rot += step

      x = cx + Math.cos(rot) * innerRadius
      y = cy + Math.sin(rot) * innerRadius
      ctx.lineTo(x, y)
      rot += step
    }
    ctx.lineTo(cx, cy - outerRadius)
    ctx.closePath()
    ctx.fill()
  }

  private drawParticles(particles: Particle[]) {
    const { ctx } = this
    for (const p of particles) {
      const alpha = p.life
      ctx.save()
      ctx.globalAlpha = alpha
      const rgb = this.hexToRgb(p.color)

      const gradient = ctx.createRadialGradient(
        p.x, p.y, 0,
        p.x, p.y, p.size * 2
      )
      gradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`)
      gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`)
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
  }

  private drawExit(x: number, y: number, timestamp: number) {
    const { ctx } = this
    const pulsePhase = (timestamp / 800) * Math.PI * 2
    const pulseRadius = 22 + Math.sin(pulsePhase) * 5

    ctx.save()

    const outer = ctx.createRadialGradient(x, y, 0, x, y, pulseRadius * 2)
    outer.addColorStop(0, 'rgba(0, 255, 150, 0.4)')
    outer.addColorStop(0.5, 'rgba(0, 255, 150, 0.15)')
    outer.addColorStop(1, 'rgba(0, 255, 150, 0)')
    ctx.fillStyle = outer
    ctx.beginPath()
    ctx.arc(x, y, pulseRadius * 2, 0, Math.PI * 2)
    ctx.fill()

    const inner = ctx.createRadialGradient(x, y, 0, x, y, pulseRadius)
    inner.addColorStop(0, 'rgba(150, 255, 200, 0.9)')
    inner.addColorStop(0.6, 'rgba(0, 255, 150, 0.5)')
    inner.addColorStop(1, 'rgba(0, 255, 150, 0.1)')
    ctx.fillStyle = inner
    ctx.shadowColor = '#00FF96'
    ctx.shadowBlur = 25
    ctx.beginPath()
    ctx.arc(x, y, pulseRadius, 0, Math.PI * 2)
    ctx.fill()

    ctx.strokeStyle = 'rgba(200, 255, 230, 0.8)'
    ctx.lineWidth = 2
    ctx.shadowBlur = 10
    ctx.beginPath()
    ctx.arc(x, y, pulseRadius - 4, 0, Math.PI * 2)
    ctx.stroke()

    ctx.restore()
  }
}
