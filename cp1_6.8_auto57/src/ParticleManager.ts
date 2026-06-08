export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  color: string
  alpha: number
  type: 'trail' | 'crystal_burst' | 'boost' | 'star'
}

const POOL_SIZE = 500

export class ParticleManager {
  particles: Particle[] = []
  private pool: Particle[] = []

  constructor() {
    for (let i = 0; i < POOL_SIZE; i++) {
      this.pool.push(this.createDeadParticle())
    }
  }

  private createDeadParticle(): Particle {
    return {
      x: 0, y: 0, vx: 0, vy: 0,
      life: 0, maxLife: 0, size: 0,
      color: '#00f0ff', alpha: 0, type: 'trail',
    }
  }

  private getParticle(): Particle {
    if (this.pool.length > 0) {
      return this.pool.pop()!
    }
    const dead = this.particles.find(p => p.life <= 0)
    if (dead) return dead
    return this.createDeadParticle()
  }

  emitTrail(x: number, y: number, boosting: boolean) {
    const count = boosting ? 3 : 1
    for (let i = 0; i < count; i++) {
      const p = this.getParticle()
      p.x = x + (Math.random() - 0.5) * 6
      p.y = y + (Math.random() - 0.5) * 6
      p.vx = -1.5 - Math.random() * 2
      p.vy = (Math.random() - 0.5) * 1.5
      p.life = 0.3 + Math.random() * 0.3
      p.maxLife = p.life
      p.size = boosting ? 3 + Math.random() * 4 : 2 + Math.random() * 3
      p.color = boosting ? '#ff6b35' : '#00f0ff'
      p.alpha = 1
      p.type = 'trail'
      if (this.particles.indexOf(p) === -1) {
        this.particles.push(p)
      }
    }
  }

  emitCrystalBurst(x: number, y: number) {
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12 + Math.random() * 0.3
      const speed = 2 + Math.random() * 4
      const p = this.getParticle()
      p.x = x
      p.y = y
      p.vx = Math.cos(angle) * speed
      p.vy = Math.sin(angle) * speed
      p.life = 0.4 + Math.random() * 0.4
      p.maxLife = p.life
      p.size = 2 + Math.random() * 3
      p.color = '#00f0ff'
      p.alpha = 1
      p.type = 'crystal_burst'
      if (this.particles.indexOf(p) === -1) {
        this.particles.push(p)
      }
    }
  }

  emitBoostStart(x: number, y: number) {
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 3 + Math.random() * 6
      const p = this.getParticle()
      p.x = x + (Math.random() - 0.5) * 40
      p.y = y + (Math.random() - 0.5) * 40
      p.vx = Math.cos(angle) * speed
      p.vy = Math.sin(angle) * speed
      p.life = 0.5 + Math.random() * 0.5
      p.maxLife = p.life
      p.size = 3 + Math.random() * 5
      p.color = i % 2 === 0 ? '#ff6b35' : '#00f0ff'
      p.alpha = 1
      p.type = 'boost'
      if (this.particles.indexOf(p) === -1) {
        this.particles.push(p)
      }
    }
  }

  emitStars(canvasWidth: number, canvasHeight: number) {
    if (Math.random() > 0.3) return
    const p = this.getParticle()
    p.x = canvasWidth + 10
    p.y = Math.random() * canvasHeight
    p.vx = -0.5 - Math.random() * 1.5
    p.vy = 0
    p.life = 2 + Math.random() * 3
    p.maxLife = p.life
    p.size = 0.5 + Math.random() * 1.5
    p.color = '#ffffff'
    p.alpha = 0.3 + Math.random() * 0.5
    p.type = 'star'
    if (this.particles.indexOf(p) === -1) {
      this.particles.push(p)
    }
  }

  update(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      if (p.life <= 0) {
        this.pool.push(this.particles.splice(i, 1)[0])
        continue
      }
      p.life -= dt
      p.x += p.vx * 60 * dt
      p.y += p.vy * 60 * dt
      p.alpha = Math.max(0, p.life / p.maxLife)
      if (p.type === 'trail') {
        p.size *= 0.97
      }
      if (p.type === 'crystal_burst') {
        p.vx *= 0.95
        p.vy *= 0.95
      }
    }
  }

  render(ctx: CanvasRenderingContext2D) {
    ctx.save()
    for (const p of this.particles) {
      if (p.life <= 0 || p.alpha <= 0) continue
      ctx.globalAlpha = p.alpha * (p.type === 'star' ? 1 : 0.8)
      ctx.fillStyle = p.color

      if (p.type === 'trail' || p.type === 'boost') {
        ctx.shadowColor = p.color
        ctx.shadowBlur = p.size * 2
      }

      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.shadowBlur = 0
    ctx.globalAlpha = 1
    ctx.restore()
  }
}
