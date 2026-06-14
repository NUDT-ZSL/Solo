import { ElementType, ParticleParams } from './data/cards'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  color: string
  alpha: number
  life: number
  maxLife: number
  rotation?: number
  rotationSpeed?: number
  type?: 'circle' | 'star' | 'snowflake' | 'lightning'
  phase?: 'shrink' | 'expand'
  shrinkTargetX?: number
  shrinkTargetY?: number
  angle?: number
  radius?: number
  angularSpeed?: number
}

interface LightningBranch {
  startX: number
  startY: number
  points: { x: number; y: number }[]
}

interface EffectInstance {
  id: number
  element: ElementType
  x: number
  y: number
  params: ParticleParams
  particles: Particle[]
  lightnings: LightningBranch[]
  startTime: number
  duration: number
  finished: boolean
  phase: 'shrink' | 'expand' | 'normal'
}

export class ParticleEffect {
  private canvas: HTMLCanvasElement | null = null
  private ctx: CanvasRenderingContext2D | null = null
  private effects: EffectInstance[] = []
  private animationId: number | null = null
  private stars: { x: number; y: number; size: number; alpha: number }[] = []
  private effectIdCounter: number = 0
  private lastFrameTime: number = 0
  private fps: number = 60

  init(canvas: HTMLCanvasElement): void {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.resizeCanvas()
    this.initStars()
    this.startLoop()

    window.addEventListener('resize', this.handleResize)
  }

  private handleResize = (): void => {
    this.resizeCanvas()
    this.initStars()
  }

  private resizeCanvas(): void {
    if (!this.canvas) return
    const rect = this.canvas.getBoundingClientRect()
    this.canvas.width = rect.width * window.devicePixelRatio
    this.canvas.height = rect.height * window.devicePixelRatio
    if (this.ctx) {
      this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    }
  }

  private initStars(): void {
    if (!this.canvas) return
    const width = this.canvas.width / window.devicePixelRatio
    const height = this.canvas.height / window.devicePixelRatio
    this.stars = []
    for (let i = 0; i < 100; i++) {
      this.stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 2 + 0.5,
        alpha: Math.random() * 0.5 + 0.3,
      })
    }
  }

  playEffect(element: ElementType, x: number, y: number, params: ParticleParams): number {
    const effect: EffectInstance = {
      id: ++this.effectIdCounter,
      element,
      x,
      y,
      params,
      particles: [],
      lightnings: [],
      startTime: performance.now(),
      duration: params.duration,
      finished: false,
      phase: 'normal',
    }

    switch (element) {
      case 'fire':
        this.createFireParticles(effect)
        break
      case 'ice':
        this.createIceParticles(effect)
        break
      case 'thunder':
        this.createThunderEffect(effect)
        break
      case 'dark':
        this.createDarkParticles(effect)
        break
    }

    this.effects.push(effect)
    return effect.id
  }

  private createFireParticles(effect: EffectInstance): void {
    const { x, y, params } = effect
    const count = Math.floor(params.particleCount * params.intensity)

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = (2 + Math.random() * 4) * params.intensity
      const size = 3 + Math.random() * 6

      effect.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        size,
        color: Math.random() > 0.5 ? params.color : params.secondaryColor,
        alpha: 1,
        life: params.duration,
        maxLife: params.duration,
        type: 'circle',
      })
    }
  }

  private createIceParticles(effect: EffectInstance): void {
    const { x, y, params } = effect
    const count = Math.floor(params.particleCount * params.intensity)

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.3
      const radius = 10 + Math.random() * 10
      const targetRadius = 80 + Math.random() * 40

      effect.particles.push({
        x: x + Math.cos(angle) * radius,
        y: y + Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
        size: 4 + Math.random() * 4,
        color: Math.random() > 0.5 ? params.color : params.secondaryColor,
        alpha: 0.9,
        life: params.duration,
        maxLife: params.duration,
        type: 'snowflake',
        angle,
        radius,
        angularSpeed: (Math.random() - 0.5) * 0.05,
      })
    }
  }

  private createThunderEffect(effect: EffectInstance): void {
    const { x, y, params } = effect
    const branchCount = Math.floor(params.particleCount * params.intensity)

    for (let i = 0; i < branchCount; i++) {
      const angle = (i / branchCount) * Math.PI * 2 + Math.random() * 0.5
      const length = 60 + Math.random() * 80 * params.intensity
      const endX = x + Math.cos(angle) * length
      const endY = y + Math.sin(angle) * length

      const points: { x: number; y: number }[] = []
      const segments = 8
      for (let j = 0; j <= segments; j++) {
        const t = j / segments
        const baseX = x + (endX - x) * t
        const baseY = y + (endY - y) * t
        const offset = (Math.random() - 0.5) * 20
        points.push({
          x: baseX + offset * (1 - t),
          y: baseY + offset * (1 - t),
        })
      }

      effect.lightnings.push({
        startX: x,
        startY: y,
        points,
      })
    }
  }

  private createDarkParticles(effect: EffectInstance): void {
    const { x, y, params } = effect
    const count = Math.floor(params.particleCount * params.intensity)

    effect.phase = 'shrink'

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const startRadius = 60 + Math.random() * 60

      effect.particles.push({
        x: x + Math.cos(angle) * startRadius,
        y: y + Math.sin(angle) * startRadius,
        vx: 0,
        vy: 0,
        size: 3 + Math.random() * 5,
        color: Math.random() > 0.5 ? params.color : params.secondaryColor,
        alpha: 0.8,
        life: params.duration,
        maxLife: params.duration,
        type: 'circle',
        phase: 'shrink',
        shrinkTargetX: x,
        shrinkTargetY: y,
        angle,
        radius: startRadius,
        angularSpeed: 0.05 + Math.random() * 0.03,
      })
    }
  }

  private startLoop(): void {
    const loop = (time: number) => {
      const deltaTime = time - this.lastFrameTime
      this.lastFrameTime = time
      this.fps = 1000 / deltaTime

      this.update(deltaTime)
      this.render()

      this.animationId = requestAnimationFrame(loop)
    }
    this.animationId = requestAnimationFrame(loop)
  }

  private update(deltaTime: number): void {
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const effect = this.effects[i]
      const elapsed = performance.now() - effect.startTime

      if (elapsed >= effect.duration) {
        effect.finished = true
        this.effects.splice(i, 1)
        continue
      }

      this.updateEffect(effect, elapsed, deltaTime)
    }
  }

  private updateEffect(effect: EffectInstance, elapsed: number, deltaTime: number): void {
    const dt = deltaTime / 16.67

    switch (effect.element) {
      case 'fire':
        this.updateFireParticles(effect, dt)
        break
      case 'ice':
        this.updateIceParticles(effect, elapsed, dt)
        break
      case 'thunder':
        this.updateThunderEffect(effect, elapsed)
        break
      case 'dark':
        this.updateDarkParticles(effect, elapsed, dt)
        break
    }
  }

  private updateFireParticles(effect: EffectInstance, dt: number): void {
    for (const p of effect.particles) {
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.vy += 0.1 * dt
      p.alpha = Math.max(0, p.alpha - 0.02 * dt)
      p.size = Math.max(0, p.size - 0.05 * dt)
    }
  }

  private updateIceParticles(effect: EffectInstance, elapsed: number, dt: number): void {
    const progress = elapsed / effect.duration

    for (const p of effect.particles) {
      if (p.angularSpeed !== undefined && p.angle !== undefined && p.radius !== undefined) {
        p.angle += p.angularSpeed * dt
        const targetRadius = 10 + progress * 80 * effect.params.intensity
        p.radius += (targetRadius - p.radius) * 0.05 * dt
        p.x = effect.x + Math.cos(p.angle) * p.radius
        p.y = effect.y + Math.sin(p.angle) * p.radius
      }
      p.alpha = Math.max(0, 0.9 * (1 - progress * 0.8))
    }
  }

  private updateThunderEffect(effect: EffectInstance, elapsed: number): void {
    const flickerIntensity = Math.sin(elapsed * 0.05) * 0.3 + 0.7

    for (const lightning of effect.lightnings) {
      for (let i = 1; i < lightning.points.length - 1; i++) {
        const point = lightning.points[i]
        point.x += (Math.random() - 0.5) * 4
        point.y += (Math.random() - 0.5) * 4
      }
    }
  }

  private updateDarkParticles(effect: EffectInstance, elapsed: number, dt: number): void {
    const shrinkDuration = effect.duration * 0.38
    const shrinkProgress = Math.min(1, elapsed / shrinkDuration)

    if (shrinkProgress < 1) {
      effect.phase = 'shrink'
      for (const p of effect.particles) {
        if (p.angularSpeed !== undefined && p.angle !== undefined && p.radius !== undefined) {
          p.angle += p.angularSpeed * 2 * dt
          const targetRadius = 5 * (1 - shrinkProgress)
          p.radius += (targetRadius - p.radius) * 0.1 * dt
          p.x = effect.x + Math.cos(p.angle) * p.radius
          p.y = effect.y + Math.sin(p.angle) * p.radius
        }
        p.alpha = 0.5 + shrinkProgress * 0.5
      }
    } else {
      if (effect.phase !== 'expand') {
        effect.phase = 'expand'
        for (const p of effect.particles) {
          if (p.angle !== undefined) {
            const speed = 3 + Math.random() * 4
            p.vx = Math.cos(p.angle) * speed * effect.params.intensity
            p.vy = Math.sin(p.angle) * speed * effect.params.intensity
          }
        }
      }
      const expandProgress = (elapsed - shrinkDuration) / (effect.duration - shrinkDuration)
      for (const p of effect.particles) {
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.alpha = Math.max(0, 1 - expandProgress)
        p.size = Math.max(0, p.size * (1 - expandProgress * 0.5))
      }
    }
  }

  private render(): void {
    if (!this.ctx || !this.canvas) return

    const width = this.canvas.width / window.devicePixelRatio
    const height = this.canvas.height / window.devicePixelRatio

    const gradient = this.ctx.createLinearGradient(0, 0, 0, height)
    gradient.addColorStop(0, '#0a0a2e')
    gradient.addColorStop(1, '#1a1a3e')
    this.ctx.fillStyle = gradient
    this.ctx.fillRect(0, 0, width, height)

    this.renderStars()

    for (const effect of this.effects) {
      this.renderEffect(effect)
    }
  }

  private renderStars(): void {
    if (!this.ctx) return
    const time = performance.now() * 0.001

    for (const star of this.stars) {
      const twinkle = Math.sin(time + star.x * 0.1) * 0.3 + 0.7
      this.ctx.beginPath()
      this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2)
      this.ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha * twinkle})`
      this.ctx.fill()
    }
  }

  private renderEffect(effect: EffectInstance): void {
    if (!this.ctx) return

    switch (effect.element) {
      case 'fire':
        this.renderFireEffect(effect)
        break
      case 'ice':
        this.renderIceEffect(effect)
        break
      case 'thunder':
        this.renderThunderEffect(effect)
        break
      case 'dark':
        this.renderDarkEffect(effect)
        break
    }
  }

  private renderFireEffect(effect: EffectInstance): void {
    if (!this.ctx) return

    for (const p of effect.particles) {
      if (p.alpha <= 0) continue

      this.ctx.beginPath()
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      this.ctx.fillStyle = this.hexToRgba(p.color, p.alpha)
      this.ctx.fill()

      this.ctx.beginPath()
      this.ctx.arc(p.x, p.y, p.size * 1.5, 0, Math.PI * 2)
      const glowGradient = this.ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 1.5)
      glowGradient.addColorStop(0, this.hexToRgba(p.color, p.alpha * 0.5))
      glowGradient.addColorStop(1, this.hexToRgba(p.color, 0))
      this.ctx.fillStyle = glowGradient
      this.ctx.fill()
    }
  }

  private renderIceEffect(effect: EffectInstance): void {
    if (!this.ctx) return

    for (const p of effect.particles) {
      if (p.alpha <= 0) continue

      this.ctx.save()
      this.ctx.translate(p.x, p.y)
      this.ctx.globalAlpha = p.alpha
      this.ctx.fillStyle = p.color

      const sides = 6
      const outerRadius = p.size
      const innerRadius = p.size * 0.4

      this.ctx.beginPath()
      for (let i = 0; i < sides * 2; i++) {
        const angle = (i * Math.PI) / sides
        const radius = i % 2 === 0 ? outerRadius : innerRadius
        const x = Math.cos(angle) * radius
        const y = Math.sin(angle) * radius
        if (i === 0) {
          this.ctx.moveTo(x, y)
        } else {
          this.ctx.lineTo(x, y)
        }
      }
      this.ctx.closePath()
      this.ctx.fill()

      this.ctx.shadowColor = p.color
      this.ctx.shadowBlur = 10
      this.ctx.fill()
      this.ctx.restore()
    }
  }

  private renderThunderEffect(effect: EffectInstance): void {
    if (!this.ctx) return
    const elapsed = performance.now() - effect.startTime
    const alpha = Math.max(0, 1 - elapsed / effect.duration)
    const flicker = Math.sin(elapsed * 0.02) * 0.3 + 0.7

    for (const lightning of effect.lightnings) {
      this.ctx.beginPath()
      this.ctx.moveTo(lightning.startX, lightning.startY)

      for (let i = 1; i < lightning.points.length; i++) {
        this.ctx.lineTo(lightning.points[i].x, lightning.points[i].y)
      }

      this.ctx.strokeStyle = this.hexToRgba(effect.params.color, alpha * flicker)
      this.ctx.lineWidth = 3
      this.ctx.shadowColor = effect.params.color
      this.ctx.shadowBlur = 20
      this.ctx.stroke()

      this.ctx.strokeStyle = this.hexToRgba('#ffffff', alpha * flicker * 0.8)
      this.ctx.lineWidth = 1
      this.ctx.stroke()

      this.ctx.shadowBlur = 0
    }
  }

  private renderDarkEffect(effect: EffectInstance): void {
    if (!this.ctx) return

    for (const p of effect.particles) {
      if (p.alpha <= 0) continue

      this.ctx.beginPath()
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      this.ctx.fillStyle = this.hexToRgba(p.color, p.alpha)
      this.ctx.fill()

      this.ctx.beginPath()
      this.ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2)
      const glowGradient = this.ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2)
      glowGradient.addColorStop(0, this.hexToRgba(p.color, p.alpha * 0.4))
      glowGradient.addColorStop(1, this.hexToRgba(p.color, 0))
      this.ctx.fillStyle = glowGradient
      this.ctx.fill()
    }
  }

  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }

  getFPS(): number {
    return this.fps
  }

  clearAll(): void {
    this.effects = []
  }

  destroy(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
    window.removeEventListener('resize', this.handleResize)
    this.effects = []
  }
}

export const particleEffect = new ParticleEffect()
