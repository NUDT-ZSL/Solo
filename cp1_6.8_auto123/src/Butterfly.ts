export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  hue: number
}

export class Butterfly {
  x: number
  y: number
  vx: number
  vy: number
  radius: number = 14
  particles: Particle[] = []
  maxParticles: number = 200
  glowPhase: number = 0
  isDragging: boolean = false
  dragTargetX: number = 0
  dragTargetY: number = 0
  keys: Set<string> = new Set()
  invincibleTimer: number = 0
  wingAngle: number = 0
  private acceleration: number = 0.4
  private friction: number = 0.92
  private maxSpeed: number = 6

  constructor(x: number, y: number) {
    this.x = x
    this.y = y
    this.vx = 0
    this.vy = 0
  }

  update(dt: number, canvasW: number, canvasH: number): void {
    const accel = this.acceleration

    if (this.isDragging) {
      const dx = this.dragTargetX - this.x
      const dy = this.dragTargetY - this.y
      this.vx += dx * 0.08
      this.vy += dy * 0.08
    }

    if (this.keys.has('ArrowLeft') || this.keys.has('a')) this.vx -= accel
    if (this.keys.has('ArrowRight') || this.keys.has('d')) this.vx += accel
    if (this.keys.has('ArrowUp') || this.keys.has('w')) this.vy -= accel
    if (this.keys.has('ArrowDown') || this.keys.has('s')) this.vy += accel

    this.vx *= this.friction
    this.vy *= this.friction

    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy)
    if (speed > this.maxSpeed) {
      this.vx = (this.vx / speed) * this.maxSpeed
      this.vy = (this.vy / speed) * this.maxSpeed
    }

    this.x += this.vx
    this.y += this.vy

    if (this.x < this.radius) { this.x = this.radius; this.vx *= -0.3 }
    if (this.x > canvasW - this.radius) { this.x = canvasW - this.radius; this.vx *= -0.3 }
    if (this.y < this.radius) { this.y = this.radius; this.vy *= -0.3 }
    if (this.y > canvasH - this.radius) { this.y = canvasH - this.radius; this.vy *= -0.3 }

    this.glowPhase += 0.03
    this.wingAngle += 0.15

    if (this.invincibleTimer > 0) this.invincibleTimer -= dt

    this.emitParticles()
    this.updateParticles()
  }

  private emitParticles(): void {
    if (this.particles.length >= this.maxParticles) return
    const count = Math.min(3, this.maxParticles - this.particles.length)
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const spd = Math.random() * 0.5 + 0.2
      this.particles.push({
        x: this.x + (Math.random() - 0.5) * 8,
        y: this.y + (Math.random() - 0.5) * 8,
        vx: -this.vx * 0.2 + Math.cos(angle) * spd,
        vy: -this.vy * 0.2 + Math.sin(angle) * spd,
        life: 1.0,
        maxLife: 1.0,
        size: Math.random() * 3 + 1.5,
        hue: 220 + Math.random() * 80,
      })
    }
  }

  private updateParticles(): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      p.x += p.vx
      p.y += p.vy
      p.vx *= 0.98
      p.vy *= 0.98
      p.life -= 0.02
      if (p.life <= 0) {
        this.particles.splice(i, 1)
      }
    }
  }

  render(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    const sx = this.x - camX
    const sy = this.y - camY

    for (const p of this.particles) {
      const px = p.x - camX
      const py = p.y - camY
      const alpha = p.life * 0.7
      ctx.beginPath()
      ctx.arc(px, py, p.size * p.life, 0, Math.PI * 2)
      ctx.fillStyle = `hsla(${p.hue}, 80%, 70%, ${alpha})`
      ctx.fill()
    }

    if (this.invincibleTimer > 0 && Math.floor(this.invincibleTimer * 10) % 2 === 0) return

    const glowSize = 28 + Math.sin(this.glowPhase) * 8
    const grad = ctx.createRadialGradient(sx, sy, 2, sx, sy, glowSize)
    grad.addColorStop(0, 'rgba(150, 130, 255, 0.5)')
    grad.addColorStop(0.5, 'rgba(100, 80, 220, 0.15)')
    grad.addColorStop(1, 'rgba(60, 40, 180, 0)')
    ctx.beginPath()
    ctx.arc(sx, sy, glowSize, 0, Math.PI * 2)
    ctx.fillStyle = grad
    ctx.fill()

    const wingFlap = Math.sin(this.wingAngle) * 0.6
    ctx.save()
    ctx.translate(sx, sy)

    ctx.beginPath()
    ctx.ellipse(-6, -2 + wingFlap * 4, 10, 7, -0.3 + wingFlap, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(180, 140, 255, 0.7)'
    ctx.fill()
    ctx.strokeStyle = 'rgba(200, 170, 255, 0.5)'
    ctx.lineWidth = 1
    ctx.stroke()

    ctx.beginPath()
    ctx.ellipse(6, -2 - wingFlap * 4, 10, 7, 0.3 - wingFlap, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(160, 120, 255, 0.7)'
    ctx.fill()
    ctx.strokeStyle = 'rgba(200, 170, 255, 0.5)'
    ctx.stroke()

    ctx.beginPath()
    ctx.ellipse(0, 0, 4, 6, 0, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(230, 220, 255, 0.9)'
    ctx.fill()

    ctx.beginPath()
    ctx.moveTo(-1, 6)
    ctx.lineTo(-3, 14)
    ctx.moveTo(1, 6)
    ctx.lineTo(3, 14)
    ctx.strokeStyle = 'rgba(180, 160, 255, 0.6)'
    ctx.lineWidth = 1
    ctx.stroke()

    ctx.restore()
  }

  isInvincible(): boolean {
    return this.invincibleTimer > 0
  }

  hit(): void {
    this.invincibleTimer = 2.0
  }
}
