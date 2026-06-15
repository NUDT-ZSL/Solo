import { eventBus } from '../eventBus'
import { EffectEvent } from '../types'
import { PARTICLE_COLORS } from '../data/puzzles'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  color: string
  life: number
  maxLife: number
}

export class ParticleEffect {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private particles: Particle[] = []
  private animationId: number | null = null
  private scoreAnimation: {
    active: boolean
    score: number
    startTime: number
    duration: number
  } | null = null

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    this.setupEventListener()
  }

  private setupEventListener(): void {
    eventBus.on('triggerEffect', (data) => {
      const effectData = data as EffectEvent
      this.triggerCompletionEffect(effectData)
    })
  }

  private getRandomColor(): string {
    return PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)]
  }

  triggerCompletionEffect(data: EffectEvent): void {
    this.spawnParticles(data.x, data.y, 200)
    this.startScoreAnimation(data.score)
  }

  private spawnParticles(x: number, y: number, count: number): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 2 + Math.random() * 6
      const size = 2 + Math.random() * 6

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size,
        color: this.getRandomColor(),
        life: 0,
        maxLife: 2000
      })
    }

    if (!this.animationId) {
      this.animate()
    }
  }

  private startScoreAnimation(score: number): void {
    this.scoreAnimation = {
      active: true,
      score,
      startTime: performance.now(),
      duration: 2000
    }
  }

  private easeOut(t: number): number {
    return 1 - Math.pow(1 - t, 3)
  }

  private animate(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    const now = performance.now()
    const activeParticles: Particle[] = []

    for (const particle of this.particles) {
      particle.life += 16
      const progress = particle.life / particle.maxLife

      if (progress < 1) {
        particle.x += particle.vx
        particle.y += particle.vy
        particle.vy += 0.1

        const easedProgress = this.easeOut(progress)
        const alpha = 1 - easedProgress

        this.ctx.save()
        this.ctx.globalAlpha = alpha
        this.ctx.fillStyle = particle.color
        this.ctx.beginPath()
        this.ctx.arc(particle.x, particle.y, particle.size * (1 - easedProgress * 0.5), 0, Math.PI * 2)
        this.ctx.fill()
        this.ctx.restore()

        activeParticles.push(particle)
      }
    }

    this.particles = activeParticles

    if (this.scoreAnimation?.active) {
      this.renderScoreAnimation(now)
    }

    if (this.particles.length > 0 || (this.scoreAnimation?.active && (now - this.scoreAnimation.startTime) < this.scoreAnimation.duration)) {
      this.animationId = requestAnimationFrame(() => this.animate())
    } else {
      this.animationId = null
      this.scoreAnimation = null
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    }
  }

  private renderScoreAnimation(now: number): void {
    if (!this.scoreAnimation) return

    const elapsed = now - this.scoreAnimation.startTime
    const progress = Math.min(elapsed / this.scoreAnimation.duration, 1)

    let translateY: number
    let scale: number
    let alpha: number

    if (progress < 0.3) {
      const bounceProgress = progress / 0.3
      translateY = -80 * this.easeOut(bounceProgress)
      scale = 1 + 0.5 * this.easeOut(bounceProgress)
      alpha = 1
    } else {
      const fadeProgress = (progress - 0.3) / 0.7
      translateY = -80 - 40 * this.easeOut(fadeProgress)
      scale = 1.5 - 0.7 * this.easeOut(fadeProgress)
      alpha = 1 - this.easeOut(fadeProgress)
    }

    const centerX = this.canvas.width / 2
    const centerY = this.canvas.height / 2

    this.ctx.save()
    this.ctx.globalAlpha = alpha
    this.ctx.font = 'bold 48px monospace'
    this.ctx.fillStyle = '#a6e3a1'
    this.ctx.textAlign = 'center'
    this.ctx.textBaseline = 'middle'
    this.ctx.translate(centerX, centerY + translateY)
    this.ctx.scale(scale, scale)
    this.ctx.fillText(`${this.scoreAnimation.score}`, 0, 0)
    this.ctx.restore()

    if (progress >= 1) {
      this.scoreAnimation.active = false
    }
  }

  resize(width: number, height: number): void {
    this.canvas.width = width
    this.canvas.height = height
  }

  destroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
    }
    this.particles = []
    this.scoreAnimation = null
    eventBus.off('triggerEffect', () => {})
  }
}
