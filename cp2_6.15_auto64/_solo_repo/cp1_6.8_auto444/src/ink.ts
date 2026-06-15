export interface InkParticle {
  x: number
  y: number
  radius: number
  currentRadius: number
  opacity: number
  inkAmount: number
  spreadSpeed: number
  fadeRate: number
  createdAt: number
  type: 'stroke' | 'splash'
  merged: boolean
}

export interface SplashDot {
  x: number
  y: number
  originX: number
  originY: number
  targetX: number
  targetY: number
  radius: number
  opacity: number
  phase: 'explode' | 'gather'
  progress: number
  speed: number
  startTime: number
}

const MAX_PARTICLES = 500
const MIN_OPACITY = 0.06

export class InkSystem {
  private particles: InkParticle[] = []
  private splashes: SplashDot[] = []
  private spreadSpeed = 1.0
  private inkDensity = 0.6

  setSpreadSpeed(value: number): void {
    this.spreadSpeed = value
  }

  setInkDensity(value: number): void {
    this.inkDensity = value
  }

  getParticles(): InkParticle[] {
    return this.particles
  }

  getSplashes(): SplashDot[] {
    return this.splashes
  }

  addStrokeInk(x: number, y: number, radius: number, pressure: number): InkParticle {
    const particle: InkParticle = {
      x,
      y,
      radius: radius * 0.8,
      currentRadius: radius * 0.8,
      opacity: this.inkDensity * pressure * 0.7,
      inkAmount: this.inkDensity * pressure,
      spreadSpeed: this.spreadSpeed,
      fadeRate: 0.3 + (1 - this.inkDensity) * 0.4,
      createdAt: performance.now(),
      type: 'stroke',
      merged: false,
    }
    this.particles.push(particle)
    this.trimParticles()
    return particle
  }

  createSplash(x: number, y: number): SplashDot[] {
    const count = 10 + Math.floor(Math.random() * 11)
    const dots: SplashDot[] = []
    const now = performance.now()

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.6
      const dist = 20 + Math.random() * 50
      const targetX = x + Math.cos(angle) * dist
      const targetY = y + Math.sin(angle) * dist

      const dot: SplashDot = {
        x,
        y,
        originX: x,
        originY: y,
        targetX,
        targetY,
        radius: 1.5 + Math.random() * 3,
        opacity: 0.6 + Math.random() * 0.4,
        phase: 'explode',
        progress: 0,
        speed: 0.8 + Math.random() * 0.6,
        startTime: now,
      }
      dots.push(dot)
    }
    this.splashes.push(...dots)
    return dots
  }

  update(deltaTime: number): void {
    this.updateParticles(deltaTime)
    this.updateSplashes(deltaTime)
  }

  private updateParticles(deltaTime: number): void {
    const dt = Math.min(deltaTime, 50)

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]

      if (p.inkAmount > 0.01) {
        const spreadDelta = p.spreadSpeed * p.inkAmount * dt * 0.00008
        p.currentRadius += spreadDelta
        p.inkAmount -= dt * 0.0003
        p.inkAmount = Math.max(0, p.inkAmount)
      }

      if (p.opacity > MIN_OPACITY) {
        p.opacity -= dt * p.fadeRate * 0.00015
        p.opacity = Math.max(MIN_OPACITY, p.opacity)
      }

      if (p.opacity <= MIN_OPACITY && p.inkAmount <= 0.01) {
        const age = performance.now() - p.createdAt
        if (age > 15000) {
          this.particles.splice(i, 1)
        }
      }
    }
  }

  private updateSplashes(deltaTime: number): void {
    const dt = Math.min(deltaTime, 50)
    const now = performance.now()

    for (let i = this.splashes.length - 1; i >= 0; i--) {
      const s = this.splashes[i]
      const elapsed = now - s.startTime

      if (s.phase === 'explode') {
        const explodeDuration = 400 * s.speed
        const t = Math.min(elapsed / explodeDuration, 1)
        const ease = 1 - Math.pow(1 - t, 3)

        s.x = s.originX + (s.targetX - s.originX) * ease
        s.y = s.originY + (s.targetY - s.originY) * ease
        s.progress = t

        if (t >= 1) {
          s.phase = 'gather'
          s.startTime = now
          s.progress = 0
        }
      } else if (s.phase === 'gather') {
        const gatherDuration = 800 * s.speed
        const t = Math.min(elapsed / gatherDuration, 1)
        const ease = t < 0.5
          ? 4 * t * t * t
          : 1 - Math.pow(-2 * t + 2, 3) / 2

        s.x = s.targetX + (s.originX - s.targetX) * ease
        s.y = s.targetY + (s.originY - s.targetY) * ease

        s.opacity = 0.8 - t * 0.3

        if (t >= 1) {
          const mergedParticle: InkParticle = {
            x: s.originX,
            y: s.originY,
            radius: 6 + Math.random() * 4,
            currentRadius: 6 + Math.random() * 4,
            opacity: 0.5,
            inkAmount: 0.4,
            spreadSpeed: this.spreadSpeed,
            fadeRate: 0.3,
            createdAt: now,
            type: 'splash',
            merged: true,
          }
          this.particles.push(mergedParticle)
          this.splashes.splice(i, 1)
        }
      }
    }
  }

  drawParticles(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      if (p.opacity <= 0) continue

      const fadeRatio = p.opacity / Math.max(0.01, p.inkDensity)
      const r = Math.round(26 + (153 - 26) * (1 - fadeRatio))
      const g = Math.round(26 + (153 - 26) * (1 - fadeRatio))
      const b = Math.round(26 + (153 - 26) * (1 - fadeRatio))

      ctx.save()

      if (p.currentRadius > p.radius * 1.1) {
        const outerRadius = p.currentRadius
        const gradient = ctx.createRadialGradient(
          p.x, p.y, p.radius * 0.3,
          p.x, p.y, outerRadius
        )
        gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${p.opacity})`)
        gradient.addColorStop(0.4, `rgba(${r}, ${g}, ${b}, ${p.opacity * 0.6})`)
        gradient.addColorStop(0.7, `rgba(123, 143, 161, ${p.opacity * 0.2})`)
        gradient.addColorStop(1, `rgba(123, 143, 161, 0)`)

        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(p.x, p.y, outerRadius, 0, Math.PI * 2)
        ctx.fill()
      } else {
        const gradient = ctx.createRadialGradient(
          p.x, p.y, 0,
          p.x, p.y, p.radius
        )
        gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${p.opacity})`)
        gradient.addColorStop(0.6, `rgba(${r}, ${g}, ${b}, ${p.opacity * 0.5})`)
        gradient.addColorStop(1, `rgba(123, 143, 161, 0)`)

        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.restore()
    }
  }

  drawSplashes(ctx: CanvasRenderingContext2D): void {
    for (const s of this.splashes) {
      ctx.save()

      const gradient = ctx.createRadialGradient(
        s.x, s.y, 0,
        s.x, s.y, s.radius
      )
      gradient.addColorStop(0, `rgba(26, 26, 26, ${s.opacity})`)
      gradient.addColorStop(0.5, `rgba(26, 26, 26, ${s.opacity * 0.6})`)
      gradient.addColorStop(1, `rgba(123, 143, 161, 0)`)

      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2)
      ctx.fill()

      ctx.restore()
    }
  }

  clear(): void {
    this.particles = []
    this.splashes = []
  }

  private trimParticles(): void {
    while (this.particles.length > MAX_PARTICLES) {
      this.particles.shift()
    }
  }
}
