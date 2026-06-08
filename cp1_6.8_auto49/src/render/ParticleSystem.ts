import type { Particle, Position } from '../core/types'

export class ParticleSystem {
  particles: Particle[] = []
  private ctx: CanvasRenderingContext2D | null = null

  setContext(ctx: CanvasRenderingContext2D): void {
    this.ctx = ctx
  }

  emit(position: Position, cellSize: number, type: 'attack' | 'skill' | 'pickup' | 'death' | 'select', count: number = 15): void {
    const cx = position.col * cellSize + cellSize / 2
    const cy = position.row * cellSize + cellSize / 2

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5
      const speed = 1 + Math.random() * 3

      let color: string
      let size: number
      let life: number
      let pType: Particle['type']

      switch (type) {
        case 'attack':
          color = `hsl(${10 + Math.random() * 30}, 100%, ${50 + Math.random() * 30}%)`
          size = 2 + Math.random() * 4
          life = 0.5 + Math.random() * 0.5
          pType = 'spark'
          break
        case 'skill':
          color = `hsl(${200 + Math.random() * 60}, 100%, ${60 + Math.random() * 30}%)`
          size = 3 + Math.random() * 5
          life = 0.6 + Math.random() * 0.6
          pType = 'glow'
          break
        case 'pickup':
          color = `hsl(${50 + Math.random() * 30}, 100%, ${60 + Math.random() * 30}%)`
          size = 2 + Math.random() * 3
          life = 0.8 + Math.random() * 0.4
          pType = 'trail'
          break
        case 'death':
          color = `hsl(${0 + Math.random() * 20}, 80%, ${40 + Math.random() * 30}%)`
          size = 3 + Math.random() * 5
          life = 1.0 + Math.random() * 0.5
          pType = 'glow'
          break
        case 'select':
          color = `hsl(${45 + Math.random() * 15}, 100%, ${60 + Math.random() * 20}%)`
          size = 2 + Math.random() * 2
          life = 0.3 + Math.random() * 0.3
          pType = 'spark'
          break
        default:
          color = '#ffffff'
          size = 2
          life = 0.5
          pType = 'spark'
      }

      this.particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed * (type === 'pickup' ? 0.5 : 1),
        vy: Math.sin(angle) * speed * (type === 'pickup' ? -1.5 : 1),
        life,
        maxLife: life,
        color,
        size,
        type: pType,
      })
    }
  }

  emitRing(position: Position, cellSize: number, color: string = '#e74c3c', maxRadius: number = 30): void {
    const cx = position.col * cellSize + cellSize / 2
    const cy = position.row * cellSize + cellSize / 2

    for (let i = 0; i < 24; i++) {
      const angle = (Math.PI * 2 * i) / 24
      const speed = maxRadius / 0.5
      this.particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed * 0.03,
        vy: Math.sin(angle) * speed * 0.03,
        life: 0.5,
        maxLife: 0.5,
        color,
        size: 3,
        type: 'ring',
      })
    }
  }

  emitTrail(fromX: number, fromY: number, toX: number, toY: number, color: string = '#f0c040', count: number = 8): void {
    for (let i = 0; i < count; i++) {
      const t = i / count
      this.particles.push({
        x: fromX + (toX - fromX) * t + (Math.random() - 0.5) * 10,
        y: fromY + (toY - fromY) * t + (Math.random() - 0.5) * 10,
        vx: (Math.random() - 0.5) * 2,
        vy: -1 - Math.random() * 2,
        life: 0.4 + Math.random() * 0.3,
        maxLife: 0.7,
        color,
        size: 2 + Math.random() * 2,
        type: 'trail',
      })
    }
  }

  update(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      p.x += p.vx
      p.y += p.vy
      p.vy += 0.05
      p.life -= dt
      if (p.life <= 0) {
        this.particles.splice(i, 1)
      }
    }
  }

  render(): void {
    if (!this.ctx) return
    const ctx = this.ctx

    for (const p of this.particles) {
      const alpha = Math.max(0, p.life / p.maxLife)
      ctx.save()
      ctx.globalAlpha = alpha

      if (p.type === 'glow') {
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2)
        gradient.addColorStop(0, p.color)
        gradient.addColorStop(1, 'transparent')
        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2)
        ctx.fill()
      } else if (p.type === 'ring') {
        ctx.strokeStyle = p.color
        ctx.lineWidth = 2 * alpha
        const radius = (1 - alpha) * 40
        ctx.beginPath()
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2)
        ctx.stroke()
      } else {
        ctx.fillStyle = p.color
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.restore()
    }
  }

  clear(): void {
    this.particles = []
  }
}
