import {
  RenderState,
  Obstacle,
  Note,
  Particle,
  LevelConfig,
  LANES,
  LANE_WIDTH,
  NOTE_RADIUS,
  NOTE_GLOW_RADIUS,
  SPAWN_Z
} from './types'

interface PerspectivePoint {
  x: number
  y: number
  scale: number
}

export class SceneRenderer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private width: number = 0
  private height: number = 0
  private levelConfig: LevelConfig | null = null

  private vanishPointX: number = 0
  private vanishPointY: number = 0
  private nearPlaneY: number = 0
  private nearPlaneWidth: number = 0
  private farPlaneWidth: number = 80
  private fov: number = 0.8
  private cameraHeight: number = 5

  private rhythmBarOffset: number = 0
  private time: number = 0

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Failed to get 2D context')
    this.ctx = ctx
  }

  setLevelConfig(config: LevelConfig): void {
    this.levelConfig = config
  }

  resize(width: number, height: number): void {
    this.width = width
    this.height = height
    this.canvas.width = width
    this.canvas.height = height
    this.vanishPointX = width / 2
    this.vanishPointY = height * 0.2
    this.nearPlaneY = height * 0.85
    this.nearPlaneWidth = LANE_WIDTH * LANES * 1.5
    this.farPlaneWidth = LANE_WIDTH * LANES * 0.15
  }

  private perspectiveProject(z: number, laneOffset: number = 0): PerspectivePoint {
    const t = Math.max(0, Math.min(1, 1 - z / SPAWN_Z))

    const projectedY = this.vanishPointY + (this.nearPlaneY - this.vanishPointY) * Math.pow(t, 1.3)

    const currentWidth = this.farPlaneWidth + (this.nearPlaneWidth - this.farPlaneWidth) * Math.pow(t, 1.3)
    const scale = currentWidth / this.nearPlaneWidth

    const laneSpan = currentWidth / LANES
    const centerX = this.vanishPointX + laneOffset * laneSpan

    return { x: centerX, y: projectedY, scale }
  }

  render(state: RenderState, deltaTime: number): void {
    this.time += deltaTime
    this.rhythmBarOffset += deltaTime * 0.1

    const ctx = this.ctx
    ctx.clearRect(0, 0, this.width, this.height)

    this.drawBackground(state)
    this.drawRunway(state)
    this.drawRhythmBars(state)
    this.drawObstacles(state.obstacles)
    this.drawNotes(state.notes)
    this.drawPlayer(state)
    this.drawParticles(state.particles)
    this.drawScreenFlash(state)
  }

  private drawBackground(state: RenderState): void {
    const ctx = this.ctx
    const gradient = ctx.createLinearGradient(0, 0, 0, this.height)

    if (this.levelConfig) {
      gradient.addColorStop(0, this.levelConfig.theme.backgroundStart)
      gradient.addColorStop(1, this.levelConfig.theme.backgroundEnd)
    } else {
      gradient.addColorStop(0, '#0a0a2e')
      gradient.addColorStop(1, '#1a1a3e')
    }

    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, this.width, this.height)

    this.drawStars()

    if (state.beatFlash > 0) {
      const intensity = state.beatFlash * 0.08
      ctx.fillStyle = `rgba(0, 240, 255, ${intensity})`
      ctx.fillRect(0, 0, this.width, this.height)
    }
  }

  private drawStars(): void {
    const ctx = this.ctx
    const starCount = 60
    for (let i = 0; i < starCount; i++) {
      const seed = i * 7919 + 1
      const x = ((seed * 13) % this.width)
      const y = ((seed * 17) % (this.height * 0.4))
      const twinkle = Math.sin(this.time * 0.002 + i) * 0.3 + 0.7
      const size = (seed % 3) + 0.5
      ctx.beginPath()
      ctx.arc(x, y, size, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(255, 255, 255, ${twinkle * 0.6})`
      ctx.fill()
    }
  }

  private drawRunway(state: RenderState): void {
    const ctx = this.ctx
    const segmentCount = 40

    for (let i = 0; i < segmentCount; i++) {
      const z1 = (i / segmentCount) * SPAWN_Z
      const z2 = ((i + 1) / segmentCount) * SPAWN_Z

      const leftTop = this.perspectiveProject(z2, -LANES / 2)
      const rightTop = this.perspectiveProject(z2, LANES / 2)
      const leftBottom = this.perspectiveProject(z1, -LANES / 2)
      const rightBottom = this.perspectiveProject(z1, LANES / 2)

      const depth = 1 - i / segmentCount
      const beatGlow = state.beatIntensity * 0.15

      ctx.beginPath()
      ctx.moveTo(leftTop.x, leftTop.y)
      ctx.lineTo(rightTop.x, rightTop.y)
      ctx.lineTo(rightBottom.x, rightBottom.y)
      ctx.lineTo(leftBottom.x, leftBottom.y)
      ctx.closePath()

      const r = Math.floor(15 + depth * 25 + beatGlow * 30)
      const g = Math.floor(15 + depth * 25 + beatGlow * 60)
      const b = Math.floor(40 + depth * 40 + beatGlow * 80)
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`
      ctx.fill()
    }

    for (let lane = 0; lane <= LANES; lane++) {
      const laneOffset = lane - LANES / 2
      this.drawRunwayLine(state, laneOffset)
    }

    this.drawCrossLines(state)
  }

  private drawRunwayLine(state: RenderState, laneOffset: number): void {
    const ctx = this.ctx
    const steps = 30

    ctx.beginPath()
    for (let i = 0; i <= steps; i++) {
      const z = (i / steps) * SPAWN_Z
      const point = this.perspectiveProject(z, laneOffset)
      if (i === 0) {
        ctx.moveTo(point.x, point.y)
      } else {
        ctx.lineTo(point.x, point.y)
      }
    }

    const isEdge = Math.abs(laneOffset) === LANES / 2
    const baseAlpha = isEdge ? 0.6 : 0.2
    const beatAlpha = state.beatIntensity * 0.3

    ctx.strokeStyle = `rgba(0, 240, 255, ${baseAlpha + beatAlpha})`
    ctx.lineWidth = isEdge ? 2 : 1
    ctx.stroke()
  }

  private drawCrossLines(state: RenderState): void {
    const ctx = this.ctx
    const lineCount = 15
    const scrollOffset = (this.rhythmBarOffset % (SPAWN_Z / lineCount))

    for (let i = -1; i < lineCount; i++) {
      const z = (i / lineCount) * SPAWN_Z + scrollOffset
      if (z < 0 || z > SPAWN_Z) continue

      const leftPoint = this.perspectiveProject(z, -LANES / 2)
      const rightPoint = this.perspectiveProject(z, LANES / 2)

      const depth = 1 - z / SPAWN_Z
      const alpha = depth * 0.3

      ctx.beginPath()
      ctx.moveTo(leftPoint.x, leftPoint.y)
      ctx.lineTo(rightPoint.x, rightPoint.y)
      ctx.strokeStyle = `rgba(0, 240, 255, ${alpha})`
      ctx.lineWidth = 1
      ctx.stroke()
    }
  }

  private drawRhythmBars(state: RenderState): void {
    const ctx = this.ctx
    const barCount = 8
    const isPrimary = Math.floor(this.time / 500) % 2 === 0

    for (let side = -1; side <= 1; side += 2) {
      for (let i = 0; i < barCount; i++) {
        const z = (i / barCount) * SPAWN_Z
        const point = this.perspectiveProject(z, side * (LANES / 2 + 0.3))

        const depth = 1 - z / SPAWN_Z
        const beatPulse = state.beatIntensity * depth
        const baseHeight = 20 * depth
        const pulseHeight = baseHeight + beatPulse * 15

        const color1 = isPrimary ? '#ff6b9d' : '#00f0ff'
        const color2 = isPrimary ? '#00f0ff' : '#ff6b9d'
        const color = i % 2 === 0 ? color1 : color2

        const alpha = 0.3 + beatPulse * 0.5
        const barWidth = 4 * depth

        ctx.save()
        ctx.globalAlpha = alpha
        ctx.fillStyle = color
        ctx.shadowColor = color
        ctx.shadowBlur = 10 * depth

        const x = side === -1 ? point.x - 30 * depth - barWidth : point.x + 30 * depth
        ctx.fillRect(x, point.y - pulseHeight / 2, barWidth, pulseHeight)
        ctx.restore()
      }
    }
  }

  private drawObstacles(obstacles: Obstacle[]): void {
    const ctx = this.ctx
    const sorted = [...obstacles].sort((a, b) => b.z - a.z)

    for (const obstacle of sorted) {
      if (obstacle.z < 0 || obstacle.z > SPAWN_Z) continue

      const laneOffset = obstacle.lane - 1
      const point = this.perspectiveProject(obstacle.z, laneOffset)

      if (point.y < this.vanishPointY || point.y > this.nearPlaneY + 50) continue

      const scale = point.scale
      const baseSize = 40 * scale

      ctx.save()
      ctx.translate(point.x, point.y)

      switch (obstacle.type) {
        case 'gear':
          this.drawGear(ctx, baseSize, scale)
          break
        case 'spike':
          this.drawSpike(ctx, baseSize, scale)
          break
        case 'lightning':
          this.drawLightning(ctx, baseSize, scale)
          break
      }

      ctx.restore()
    }
  }

  private drawGear(ctx: CanvasRenderingContext2D, size: number, scale: number): void {
    const teeth = 8
    const outerRadius = size / 2
    const innerRadius = outerRadius * 0.65
    const toothHeight = outerRadius * 0.3

    ctx.save()
    ctx.rotate(this.time * 0.003)

    ctx.beginPath()
    for (let i = 0; i < teeth; i++) {
      const angle1 = (i / teeth) * Math.PI * 2
      const angle2 = ((i + 0.3) / teeth) * Math.PI * 2
      const angle3 = ((i + 0.5) / teeth) * Math.PI * 2
      const angle4 = ((i + 0.8) / teeth) * Math.PI * 2

      if (i === 0) {
        ctx.moveTo(Math.cos(angle1) * innerRadius, Math.sin(angle1) * innerRadius)
      }
      ctx.lineTo(Math.cos(angle2) * (innerRadius + toothHeight), Math.sin(angle2) * (innerRadius + toothHeight))
      ctx.lineTo(Math.cos(angle3) * (innerRadius + toothHeight), Math.sin(angle3) * (innerRadius + toothHeight))
      ctx.lineTo(Math.cos(angle4) * innerRadius, Math.sin(angle4) * innerRadius)
    }
    ctx.closePath()

    ctx.fillStyle = `rgba(255, 60, 60, ${0.7 + scale * 0.3})`
    ctx.shadowColor = '#ff3c3c'
    ctx.shadowBlur = 15 * scale
    ctx.fill()
    ctx.strokeStyle = '#ff8888'
    ctx.lineWidth = 2 * scale
    ctx.stroke()

    ctx.beginPath()
    ctx.arc(0, 0, innerRadius * 0.35, 0, Math.PI * 2)
    ctx.fillStyle = '#1a1a3e'
    ctx.fill()

    ctx.restore()
  }

  private drawSpike(ctx: CanvasRenderingContext2D, size: number, scale: number): void {
    const halfSize = size / 2

    ctx.beginPath()
    ctx.moveTo(0, -halfSize)
    ctx.lineTo(halfSize * 0.6, 0)
    ctx.lineTo(0, halfSize)
    ctx.lineTo(-halfSize * 0.6, 0)
    ctx.closePath()

    ctx.fillStyle = `rgba(255, 100, 50, ${0.7 + scale * 0.3})`
    ctx.shadowColor = '#ff6432'
    ctx.shadowBlur = 12 * scale
    ctx.fill()
    ctx.strokeStyle = '#ffa060'
    ctx.lineWidth = 2 * scale
    ctx.stroke()

    const innerScale = 0.5
    ctx.beginPath()
    ctx.moveTo(0, -halfSize * innerScale)
    ctx.lineTo(halfSize * 0.6 * innerScale, 0)
    ctx.lineTo(0, halfSize * innerScale)
    ctx.lineTo(-halfSize * 0.6 * innerScale, 0)
    ctx.closePath()
    ctx.fillStyle = `rgba(255, 180, 100, ${0.5 + scale * 0.3})`
    ctx.fill()
  }

  private drawLightning(ctx: CanvasRenderingContext2D, size: number, scale: number): void {
    const halfSize = size / 2

    const wobble = Math.sin(this.time * 0.01) * 2 * scale

    ctx.beginPath()
    ctx.moveTo(-halfSize * 0.3 + wobble, -halfSize)
    ctx.lineTo(halfSize * 0.5, -halfSize * 0.2)
    ctx.lineTo(0, -halfSize * 0.1)
    ctx.lineTo(halfSize * 0.3 - wobble, halfSize)
    ctx.lineTo(-halfSize * 0.5, halfSize * 0.2)
    ctx.lineTo(0, halfSize * 0.1)
    ctx.closePath()

    ctx.fillStyle = `rgba(100, 200, 255, ${0.6 + scale * 0.4})`
    ctx.shadowColor = '#64c8ff'
    ctx.shadowBlur = 20 * scale
    ctx.fill()

    ctx.strokeStyle = '#a0e0ff'
    ctx.lineWidth = 2 * scale
    ctx.stroke()
  }

  private drawNotes(notes: Note[]): void {
    const ctx = this.ctx

    for (const note of notes) {
      if (note.collected) continue

      const z = (note as any).z ?? SPAWN_Z
      if (z < 0 || z > SPAWN_Z) continue

      const laneOffset = note.lane - 1
      const point = this.perspectiveProject(z, laneOffset)

      if (point.y < this.vanishPointY || point.y > this.nearPlaneY + 50) continue

      const scale = point.scale
      const innerRadius = NOTE_RADIUS * scale
      const glowRadius = NOTE_GLOW_RADIUS * scale

      const pulse = Math.sin(this.time * 0.008) * 0.2 + 1

      ctx.save()
      ctx.translate(point.x, point.y)

      const glowGradient = ctx.createRadialGradient(0, 0, innerRadius * 0.5, 0, 0, glowRadius * pulse)
      glowGradient.addColorStop(0, 'rgba(255, 217, 61, 0.8)')
      glowGradient.addColorStop(0.5, 'rgba(255, 217, 61, 0.3)')
      glowGradient.addColorStop(1, 'rgba(255, 217, 61, 0)')

      ctx.beginPath()
      ctx.arc(0, 0, glowRadius * pulse, 0, Math.PI * 2)
      ctx.fillStyle = glowGradient
      ctx.fill()

      ctx.beginPath()
      ctx.arc(0, 0, innerRadius, 0, Math.PI * 2)
      const coreGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, innerRadius)
      coreGradient.addColorStop(0, '#fff8e0')
      coreGradient.addColorStop(0.5, '#ffd93d')
      coreGradient.addColorStop(1, note.type === 'bonus' ? '#ff9d00' : '#ffc107')
      ctx.fillStyle = coreGradient
      ctx.shadowColor = '#ffd93d'
      ctx.shadowBlur = 15 * scale
      ctx.fill()

      if (note.type === 'bonus') {
        ctx.beginPath()
        const starPoints = 5
        for (let i = 0; i < starPoints * 2; i++) {
          const angle = (i * Math.PI) / starPoints - Math.PI / 2
          const radius = i % 2 === 0 ? innerRadius * 1.3 : innerRadius * 0.6
          const sx = Math.cos(angle) * radius
          const sy = Math.sin(angle) * radius
          if (i === 0) ctx.moveTo(sx, sy)
          else ctx.lineTo(sx, sy)
        }
        ctx.closePath()
        ctx.fillStyle = 'rgba(255, 157, 0, 0.4)'
        ctx.fill()
      }

      ctx.restore()
    }
  }

  private drawPlayer(state: RenderState): void {
    const ctx = this.ctx
    const player = state.player

    const laneOffset = player.lane - 1
    const point = this.perspectiveProject(0, laneOffset)

    const radius = 20
    const isInvincible = player.isInvincible

    if (isInvincible && Math.floor(this.time / 80) % 2 === 0) {
      ctx.globalAlpha = 0.4
    }

    ctx.save()
    ctx.translate(point.x, point.y)

    const glowSize = radius * 2.5 + Math.sin(this.time * 0.005) * 5
    const glowGradient = ctx.createRadialGradient(0, 0, radius * 0.5, 0, 0, glowSize)
    glowGradient.addColorStop(0, 'rgba(0, 240, 255, 0.4)')
    glowGradient.addColorStop(0.5, 'rgba(0, 240, 255, 0.15)')
    glowGradient.addColorStop(1, 'rgba(0, 240, 255, 0)')

    ctx.beginPath()
    ctx.arc(0, 0, glowSize, 0, Math.PI * 2)
    ctx.fillStyle = glowGradient
    ctx.fill()

    const ringPulse = 1 + state.beatIntensity * 0.15
    ctx.beginPath()
    ctx.arc(0, 0, radius * 1.3 * ringPulse, 0, Math.PI * 2)
    ctx.strokeStyle = `rgba(0, 240, 255, ${0.3 + state.beatIntensity * 0.4})`
    ctx.lineWidth = 2
    ctx.stroke()

    const coreGradient = ctx.createRadialGradient(0, -3, 0, 0, 0, radius)
    coreGradient.addColorStop(0, '#ffffff')
    coreGradient.addColorStop(0.3, '#a0f0ff')
    coreGradient.addColorStop(0.7, '#00f0ff')
    coreGradient.addColorStop(1, '#0080c0')

    ctx.beginPath()
    ctx.arc(0, 0, radius, 0, Math.PI * 2)
    ctx.fillStyle = coreGradient
    ctx.shadowColor = '#00f0ff'
    ctx.shadowBlur = 20
    ctx.fill()

    ctx.beginPath()
    ctx.arc(0, -radius * 0.25, radius * 0.35, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'
    ctx.fill()

    ctx.restore()
    ctx.globalAlpha = 1
  }

  private drawParticles(particles: Particle[]): void {
    const ctx = this.ctx

    for (const particle of particles) {
      if (particle.life <= 0) continue

      const alpha = particle.life / particle.maxLife
      ctx.save()
      ctx.globalAlpha = alpha
      ctx.fillStyle = particle.color
      ctx.shadowColor = particle.color
      ctx.shadowBlur = 8

      ctx.beginPath()
      ctx.arc(particle.x, particle.y, particle.size * alpha, 0, Math.PI * 2)
      ctx.fill()

      ctx.restore()
    }
  }

  private drawScreenFlash(state: RenderState): void {
    if (state.screenFlash <= 0) return

    const ctx = this.ctx
    const alpha = state.screenFlash * 0.6

    const gradient = ctx.createRadialGradient(
      this.width / 2, this.height / 2, 0,
      this.width / 2, this.height / 2, this.width * 0.7
    )
    gradient.addColorStop(0, `rgba(255, 255, 255, ${alpha})`)
    gradient.addColorStop(0.5, `rgba(255, 255, 255, ${alpha * 0.5})`)
    gradient.addColorStop(1, `rgba(255, 255, 255, 0)`)

    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, this.width, this.height)
  }
}
