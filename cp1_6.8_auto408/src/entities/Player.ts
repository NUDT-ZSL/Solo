import { Maze } from './Maze'

export interface TrailPoint {
  x: number
  y: number
  alpha: number
}

export class Player {
  x: number
  y: number
  radius: number
  speed: number
  crystals: number
  steps: number
  trail: TrailPoint[]
  maxTrail: number
  moveDir: { x: number; y: number }
  lastMoveTime: number
  stepAccumulator: number
  glowParticles: { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; size: number }[]

  constructor(startX: number, startY: number) {
    this.x = startX
    this.y = startY
    this.radius = 10
    this.speed = 150
    this.crystals = 0
    this.steps = 0
    this.trail = []
    this.maxTrail = 30
    this.moveDir = { x: 0, y: 0 }
    this.lastMoveTime = 0
    this.stepAccumulator = 0
    this.glowParticles = []
  }

  setDirection(dx: number, dy: number) {
    this.moveDir.x = dx
    this.moveDir.y = dy
  }

  update(dt: number, maze: Maze) {
    if (this.moveDir.x !== 0 || this.moveDir.y !== 0) {
      const len = Math.hypot(this.moveDir.x, this.moveDir.y)
      const ndx = this.moveDir.x / len
      const ndy = this.moveDir.y / len
      const moveAmount = this.speed * dt

      let newX = this.x + ndx * moveAmount
      let newY = this.y + ndy * moveAmount

      if (!maze.checkWallCollision(newX, this.y, this.radius)) {
        this.x = newX
      }
      if (!maze.checkWallCollision(this.x, newY, this.radius)) {
        this.y = newY
      }

      this.stepAccumulator += moveAmount
      if (this.stepAccumulator > maze.cellSize * 0.5) {
        this.steps++
        this.stepAccumulator -= maze.cellSize * 0.5
      }

      this.trail.unshift({ x: this.x, y: this.y, alpha: 1 })
      if (this.trail.length > this.maxTrail) {
        this.trail.pop()
      }

      if (Math.random() < 0.4) {
        this.glowParticles.push({
          x: this.x + (Math.random() - 0.5) * this.radius,
          y: this.y + (Math.random() - 0.5) * this.radius,
          vx: (Math.random() - 0.5) * 20,
          vy: -10 - Math.random() * 30,
          life: 0.3 + Math.random() * 0.3,
          maxLife: 0.3 + Math.random() * 0.3,
          size: 1 + Math.random() * 2
        })
      }
    }

    for (let i = this.trail.length - 1; i >= 0; i--) {
      this.trail[i].alpha -= dt * 3
      if (this.trail[i].alpha <= 0) {
        this.trail.splice(i, 1)
      }
    }

    for (let i = this.glowParticles.length - 1; i >= 0; i--) {
      const p = this.glowParticles[i]
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.life -= dt
      if (p.life <= 0) {
        this.glowParticles.splice(i, 1)
      }
    }
  }

  render(ctx: CanvasRenderingContext2D, time: number) {
    ctx.save()

    for (let i = 0; i < this.trail.length; i++) {
      const t = this.trail[i]
      const progress = i / this.trail.length
      const size = this.radius * (1 - progress * 0.6)
      ctx.fillStyle = `rgba(255, 200, 50, ${t.alpha * 0.3})`
      ctx.beginPath()
      ctx.arc(t.x, t.y, size, 0, Math.PI * 2)
      ctx.fill()
    }

    for (const p of this.glowParticles) {
      const alpha = p.life / p.maxLife
      ctx.fillStyle = `rgba(255, 220, 80, ${alpha * 0.7})`
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2)
      ctx.fill()
    }

    const pulse = 0.8 + 0.2 * Math.sin(time * 5)
    ctx.shadowColor = `rgba(255, 200, 0, ${pulse})`
    ctx.shadowBlur = 20

    const bodyGrad = ctx.createRadialGradient(this.x - 2, this.y - 2, 0, this.x, this.y, this.radius)
    bodyGrad.addColorStop(0, 'rgba(255, 255, 200, 1)')
    bodyGrad.addColorStop(0.4, 'rgba(255, 220, 50, 0.95)')
    bodyGrad.addColorStop(0.8, 'rgba(255, 180, 0, 0.8)')
    bodyGrad.addColorStop(1, 'rgba(255, 150, 0, 0.3)')

    ctx.fillStyle = bodyGrad
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2)
    ctx.fill()

    ctx.shadowBlur = 0
    ctx.fillStyle = 'rgba(255, 255, 240, 0.6)'
    ctx.beginPath()
    ctx.arc(this.x - 2, this.y - 3, this.radius * 0.3, 0, Math.PI * 2)
    ctx.fill()

    ctx.restore()
  }
}
