import { Particle, MAX_PARTICLES } from './types'

export class ParticleManager {
  private particles: Particle[] = []

  emit(x: number, y: number, count: number, type: Particle['type'], color: string, spread = 60) {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= MAX_PARTICLES) {
        const idx = this.particles.findIndex(p => p.life <= 0)
        if (idx === -1) break
        this.particles.splice(idx, 1)
      }
      const angle = Math.random() * Math.PI * 2
      const speed = Math.random() * spread
      const life = 0.3 + Math.random() * 0.7
      this.particles.push({
        x: x + (Math.random() - 0.5) * 10,
        y: y + (Math.random() - 0.5) * 10,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life,
        maxLife: life,
        size: 2 + Math.random() * 4,
        color,
        alpha: 0.8,
        type,
      })
    }
  }

  emitGearTrail(x: number, y: number) {
    this.emit(x, y, 1, 'gear_trail', '#B87333', 20)
  }

  emitCoreCollect(x: number, y: number) {
    this.emit(x, y, 20, 'core_collect', '#C9A84C', 120)
  }

  emitSteamHit(x: number, y: number) {
    this.emit(x, y, 8, 'steam_hit', '#E8DCC8', 80)
  }

  emitBossExplode(x: number, y: number) {
    this.emit(x, y, 30, 'boss_explode', '#8B3A2A', 150)
    this.emit(x, y, 15, 'boss_explode', '#C9A84C', 100)
  }

  emitRuneSpark(x: number, y: number) {
    this.emit(x, y, 2, 'rune_spark', '#4ECDC4', 30)
  }

  update(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      p.life -= dt
      if (p.life <= 0) {
        this.particles.splice(i, 1)
        continue
      }
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.alpha = (p.life / p.maxLife) * 0.8
      if (p.type === 'steam_hit' || p.type === 'core_collect') {
        p.vy -= 30 * dt
      }
    }
  }

  getParticles(): Particle[] {
    return this.particles
  }

  clear() {
    this.particles = []
  }
}
