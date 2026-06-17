export interface Particle {
  id: number
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
  concentration: number
  life: number
  maxLife: number
  type: 'water' | 'nutrient'
}

export interface ParticleSystemConfig {
  maxParticles: number
  particleLifetime: number
  emissionRate: number
  potRadius: number
  soilY: number
}

const DEFAULT_CONFIG: ParticleSystemConfig = {
  maxParticles: 200,
  particleLifetime: 5,
  emissionRate: 0.5,
  potRadius: 1.5,
  soilY: 0.5,
}

export class ParticleSystem {
  private particles: Particle[] = []
  private config: ParticleSystemConfig
  private nextId = 0
  private emissionAccumulator = 0
  private waterLevel = 50
  private nutrientLevel = 30
  private time = 0

  constructor(config?: Partial<ParticleSystemConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  setWaterLevel(level: number) {
    this.waterLevel = level
  }

  setNutrientLevel(level: number) {
    this.nutrientLevel = level
  }

  update(deltaTime: number) {
    this.time += deltaTime

    const waterEmissionRate = (this.waterLevel / 100) * 0.8
    const nutrientEmissionRate = (this.nutrientLevel / 100) * 0.6
    const totalEmissionRate = waterEmissionRate + nutrientEmissionRate

    this.emissionAccumulator += totalEmissionRate * deltaTime

    while (this.emissionAccumulator >= 1 && this.particles.length < this.config.maxParticles) {
      this.emissionAccumulator -= 1

      const isWater = Math.random() < waterEmissionRate / totalEmissionRate
      this.emitParticle(isWater ? 'water' : 'nutrient')
    }

    const humidityFactor = 1 - (this.waterLevel / 100) * 0.5
    const diffusionSpeed = 0.3 * humidityFactor

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]

      p.life -= deltaTime
      if (p.life <= 0) {
        this.particles.splice(i, 1)
        continue
      }

      p.x += p.vx * diffusionSpeed * deltaTime
      p.y += p.vy * diffusionSpeed * deltaTime
      p.z += p.vz * diffusionSpeed * deltaTime

      p.vy -= 0.1 * deltaTime

      const distFromCenter = Math.sqrt(p.x * p.x + p.z * p.z)
      if (distFromCenter > this.config.potRadius * 0.9) {
        const angle = Math.atan2(p.z, p.x)
        p.x = Math.cos(angle) * this.config.potRadius * 0.85
        p.z = Math.sin(angle) * this.config.potRadius * 0.85
        p.vx *= -0.3
        p.vz *= -0.3
      }

      if (p.y < -1.5) {
        p.y = -1.5
        p.vy *= -0.2
      }

      p.vx += (Math.random() - 0.5) * 0.2 * deltaTime
      p.vz += (Math.random() - 0.5) * 0.2 * deltaTime

      p.concentration = (p.life / p.maxLife) * (p.type === 'water' ? 0.8 : 1)
    }
  }

  private emitParticle(type: 'water' | 'nutrient') {
    const angle = Math.random() * Math.PI * 2
    const radius = Math.random() * this.config.potRadius * 0.6

    const particle: Particle = {
      id: this.nextId++,
      x: Math.cos(angle) * radius,
      y: this.config.soilY + Math.random() * 0.1,
      z: Math.sin(angle) * radius,
      vx: (Math.random() - 0.5) * 0.3,
      vy: -Math.random() * 0.5 - 0.1,
      vz: (Math.random() - 0.5) * 0.3,
      concentration: type === 'water' ? 0.8 : 1,
      life: this.config.particleLifetime,
      maxLife: this.config.particleLifetime,
      type,
    }

    this.particles.push(particle)
  }

  getParticles(): Particle[] {
    return this.particles
  }

  getParticleCount(): number {
    return this.particles.length
  }

  reset() {
    this.particles = []
    this.emissionAccumulator = 0
    this.nextId = 0
    this.time = 0
  }
}

export function getParticleColor(concentration: number, type: 'water' | 'nutrient'): { r: number; g: number; b: number } {
  if (type === 'water') {
    const r = Math.floor(79 + concentration * 20)
    const g = Math.floor(195 - concentration * 100)
    const b = Math.floor(247 - concentration * 50)
    return { r: r / 255, g: g / 255, b: b / 255 }
  } else {
    const r = Math.floor(129 - concentration * 80)
    const g = Math.floor(199 - concentration * 70)
    const b = Math.floor(132 - concentration * 80)
    return { r: r / 255, g: g / 255, b: b / 255 }
  }
}
