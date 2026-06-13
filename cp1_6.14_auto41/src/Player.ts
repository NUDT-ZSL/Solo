export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  baseSize: number
  size: number
  baseX: number
  baseY: number
  angle: number
  orbitRadius: number
  orbitSpeed: number
}

export interface TrailParticle {
  x: number
  y: number
  life: number
  maxLife: number
  size: number
}

export class Player {
  x: number
  y: number
  vx: number
  vy: number
  speed: number
  radius: number
  particles: Particle[]
  trail: TrailParticle[]
  keys: Set<string>
  pulsePhase: number
  isRecording: boolean
  recordBuffer: { x: number; y: number; time: number; facing: number }[]
  facing: number
  lastMovingFacing: number

  constructor(x: number, y: number) {
    this.x = x
    this.y = y
    this.vx = 0
    this.vy = 0
    this.speed = 3.5
    this.radius = 22
    this.particles = []
    this.trail = []
    this.keys = new Set()
    this.pulsePhase = 0
    this.isRecording = false
    this.recordBuffer = []
    this.facing = 0
    this.lastMovingFacing = 0
    this.initParticles()
  }

  initParticles() {
    const count = 50
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.3
      const orbitRadius = 5 + Math.random() * 18
      const baseSize = 2 + Math.random() * 2.5
      this.particles.push({
        x: this.x + Math.cos(angle) * orbitRadius,
        y: this.y + Math.sin(angle) * orbitRadius,
        vx: 0,
        vy: 0,
        life: 1,
        maxLife: 1,
        baseSize,
        size: baseSize,
        baseX: this.x,
        baseY: this.y,
        angle,
        orbitRadius,
        orbitSpeed: 0.015 + Math.random() * 0.025,
      })
    }
  }

  handleKeyDown(key: string) {
    this.keys.add(key.toLowerCase())
  }

  handleKeyUp(key: string) {
    this.keys.delete(key.toLowerCase())
  }

  update(dt: number, checkCollision: (nx: number, ny: number, r: number) => boolean) {
    this.vx = 0
    this.vy = 0

    if (this.keys.has('w') || this.keys.has('arrowup')) this.vy -= this.speed
    if (this.keys.has('s') || this.keys.has('arrowdown')) this.vy += this.speed
    if (this.keys.has('a') || this.keys.has('arrowleft')) this.vx -= this.speed
    if (this.keys.has('d') || this.keys.has('arrowright')) this.vx += this.speed

    if (this.vx !== 0 && this.vy !== 0) {
      const factor = 1 / Math.sqrt(2)
      this.vx *= factor
      this.vy *= factor
    }

    const isMoving = this.vx !== 0 || this.vy !== 0

    const newX = this.x + this.vx
    if (!checkCollision(newX, this.y, this.radius)) {
      this.x = newX
    }

    const newY = this.y + this.vy
    if (!checkCollision(this.x, newY, this.radius)) {
      this.y = newY
    }

    if (isMoving && this.trail.length < 20) {
      this.trail.push({
        x: this.x,
        y: this.y,
        life: 1,
        maxLife: 15,
        size: 4,
      })
    }

    this.trail = this.trail.filter((t) => {
      t.life -= 1
      return t.life > 0
    })

    this.pulsePhase += dt * 0.004

    if (isMoving) {
      this.lastMovingFacing = Math.atan2(this.vy, this.vx)
    }
    this.facing = this.lastMovingFacing

    const globalSizePulse = 1 + Math.sin(this.pulsePhase * 2) * 0.35

    this.particles.forEach((p) => {
      const orbitPulse = 1 + Math.sin(this.pulsePhase + p.angle * 2) * 0.25
      const currentOrbit = p.orbitRadius * orbitPulse
      p.angle += p.orbitSpeed
      const jitterX = (Math.random() - 0.5) * 1.5
      const jitterY = (Math.random() - 0.5) * 1.5
      p.x = this.x + Math.cos(p.angle) * currentOrbit + jitterX
      p.y = this.y + Math.sin(p.angle) * currentOrbit + jitterY
      p.size = p.baseSize * globalSizePulse
      p.baseX = this.x
      p.baseY = this.y
    })

    if (this.isRecording) {
      const now = Date.now()
      this.recordBuffer.push({ x: this.x, y: this.y, time: now, facing: this.facing })
      const cutoff = now - 2000
      this.recordBuffer = this.recordBuffer.filter((r) => r.time >= cutoff)
    }
  }

  startRecording() {
    this.isRecording = true
    this.recordBuffer = []
  }

  stopRecording() {
    this.isRecording = false
    return [...this.recordBuffer]
  }

  draw(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number) {
    const sx = this.x - cameraX
    const sy = this.y - cameraY

    for (let i = 0; i < this.trail.length; i++) {
      const t = this.trail[i]
      const tsx = t.x - cameraX
      const tsy = t.y - cameraY
      const alpha = (t.life / t.maxLife) * 0.6
      const size = t.size * (t.life / t.maxLife)
      ctx.beginPath()
      ctx.arc(tsx, tsy, size, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`
      ctx.fill()
    }

    const glowPulse = 1 + Math.sin(this.pulsePhase * 1.5) * 0.2
    ctx.save()
    const gradient = ctx.createRadialGradient(sx, sy, 0, sx, sy, 60 * glowPulse)
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.35)')
    gradient.addColorStop(0.4, 'rgba(200, 230, 255, 0.15)')
    gradient.addColorStop(1, 'rgba(100, 180, 255, 0)')
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(sx, sy, 60 * glowPulse, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()

    this.particles.forEach((p) => {
      const psx = p.x - cameraX
      const psy = p.y - cameraY
      ctx.save()
      ctx.shadowColor = '#ffffff'
      ctx.shadowBlur = 8
      ctx.beginPath()
      ctx.arc(psx, psy, p.size, 0, Math.PI * 2)
      ctx.fillStyle = '#ffffff'
      ctx.fill()
      ctx.restore()
    })

    ctx.save()
    ctx.shadowColor = '#ffffff'
    ctx.shadowBlur = 20
    ctx.beginPath()
    ctx.arc(sx, sy, 6, 0, Math.PI * 2)
    ctx.fillStyle = '#ffffff'
    ctx.fill()
    ctx.restore()

    ctx.save()
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)'
    ctx.lineWidth = 2.5
    ctx.shadowColor = '#00d4ff'
    ctx.shadowBlur = 8
    ctx.beginPath()
    ctx.moveTo(sx, sy)
    ctx.lineTo(sx + Math.cos(this.facing) * 18, sy + Math.sin(this.facing) * 18)
    ctx.stroke()
    ctx.beginPath()
    const fx = sx + Math.cos(this.facing) * 18
    const fy = sy + Math.sin(this.facing) * 18
    ctx.moveTo(fx, fy)
    ctx.lineTo(fx - Math.cos(this.facing - 0.5) * 6, fy - Math.sin(this.facing - 0.5) * 6)
    ctx.lineTo(fx - Math.cos(this.facing + 0.5) * 6, fy - Math.sin(this.facing + 0.5) * 6)
    ctx.closePath()
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
    ctx.fill()
    ctx.restore()
  }
}
