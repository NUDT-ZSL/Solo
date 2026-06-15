import { BrushEngine, Particle } from './BrushEngine'

export class LifeSimulator {
  private engine: BrushEngine
  private frameCount = 0

  constructor(engine: BrushEngine) {
    this.engine = engine
  }

  update(): Particle[] {
    this.frameCount++
    const particles = this.engine.getParticles()
    const newParticles: Particle[] = []
    const particlesToSpawn: Particle[] = []
    const inkDotSpawns: { x: number; y: number; hue: number }[] = []

    for (const p of particles) {
      p.age++

      if (p.isExplosion || p.isInkDot) {
        p.x += p.vx
        p.y += p.vy
        if (p.isExplosion) {
          p.alpha = Math.max(0, 0.9 - (p.age / p.maxAge) * 0.9)
        } else {
          p.alpha = Math.max(0, 0.3 - (p.age / p.maxAge) * 0.3)
        }
      } else {
        const wobble = Math.sin(
          this.frameCount * p.wobbleFrequency + p.wobbleOffset
        )
        const perpX = -p.vy
        const perpY = p.vx
        const perpLen = Math.sqrt(perpX * perpX + perpY * perpY) || 1
        p.x += p.vx + (perpX / perpLen) * wobble * p.wobbleAmplitude
        p.y += p.vy + (perpY / perpLen) * wobble * p.wobbleAmplitude

        p.vx *= 0.995
        p.vy *= 0.995

        p.alpha = Math.max(0, p.alpha - 0.0005)

        if (p.age > 120 && !p.hasSplit && Math.random() < 0.1) {
          p.hasSplit = true
          const config = this.engine.getConfig()
          const hueOffset = (Math.random() < 0.5 ? -1 : 1) * 15
          for (let s = 0; s < 2; s++) {
            particlesToSpawn.push({
              id: 0,
              x: p.x + (Math.random() - 0.5) * 4,
              y: p.y + (Math.random() - 0.5) * 4,
              vx: p.vx + (Math.random() - 0.5) * 0.4,
              vy: p.vy + (Math.random() - 0.5) * 0.4,
              radius: p.radius * 0.5,
              hue: (p.baseHue + hueOffset + 360) % 360,
              baseHue: (p.baseHue + hueOffset + 360) % 360,
              saturation: config.saturation,
              lightness: config.lightness,
              alpha: p.alpha,
              age: 0,
              maxAge: p.maxAge,
              wobbleOffset: Math.random() * Math.PI * 2,
              wobbleFrequency: 0.1 + Math.random() * 0.2,
              wobbleAmplitude: 0.5,
              hasSplit: true
            })
          }
        }

        const ageRatio = Math.min(1, p.age / p.maxAge)
        const startHue = this.engine.getConfig().startHue
        const endHue = this.engine.getConfig().endHue
        const progressFactor = startHue <= endHue ? 1 : -1
        const hueRange = Math.abs(endHue - startHue)
        p.hue = startHue + progressFactor * hueRange * ageRatio
      }

      if (p.alpha > 0.05 && p.age < p.maxAge) {
        newParticles.push(p)
      } else if (!p.isExplosion && !p.isInkDot) {
        inkDotSpawns.push({ x: p.x, y: p.y, hue: p.hue })
      }
    }

    for (const spawn of inkDotSpawns) {
      this.engine.addInkDots(spawn.x, spawn.y, spawn.hue)
    }

    const finalParticles = [...newParticles, ...particlesToSpawn]
    this.engine.setParticles(finalParticles)

    return finalParticles
  }

  getActiveCount(): number {
    return this.engine.getParticles().filter(
      (p) => !p.isExplosion && !p.isInkDot
    ).length
  }
}
