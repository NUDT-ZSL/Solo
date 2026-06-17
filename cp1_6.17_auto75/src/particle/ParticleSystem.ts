export interface Particle {
  id: number
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
  nutrientLevel: number
  lifetime: number
  maxLifetime: number
}

export interface ParticleData {
  positions: Float32Array
  colors: Float32Array
  count: number
}

const MAX_PARTICLES = 200
const PARTICLE_LIFETIME = 5.0
const EMISSION_RATE_BASE = 10
const SOIL_RADIUS = 1.5
const SOIL_Y = 0.1

export class ParticleSystem {
  private particles: Particle[] = []
  private nextId = 0
  private emissionAccumulator = 0
  private waterLevel = 50
  private nutrientLevel = 30
  private positionBuffer = new Float32Array(MAX_PARTICLES * 3)
  private colorBuffer = new Float32Array(MAX_PARTICLES * 3)

  setWater(level: number): void {
    this.waterLevel = Math.max(0, Math.min(100, level))
  }

  setNutrient(level: number): void {
    this.nutrientLevel = Math.max(0, Math.min(100, level))
  }

  update(deltaTime: number): ParticleData {
    const diffusionFactor = 1.0 - (this.waterLevel / 100) * 0.5
    const emissionRate = EMISSION_RATE_BASE + (this.waterLevel / 100) * 15

    this.emissionAccumulator += emissionRate * deltaTime
    while (this.emissionAccumulator >= 1 && this.particles.length < MAX_PARTICLES) {
      this.emitParticle()
      this.emissionAccumulator -= 1
    }

    const toRemove: number[] = []

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i]

      p.lifetime += deltaTime

      if (p.lifetime >= p.maxLifetime) {
        toRemove.push(i)
        continue
      }

      p.vy -= 0.2 * deltaTime
      p.vx *= 0.99
      p.vz *= 0.99

      const speed = diffusionFactor * 0.5
      p.x += p.vx * speed * deltaTime
      p.y += p.vy * deltaTime
      p.z += p.vz * speed * deltaTime

      if (p.y < -0.8) {
        p.y = -0.8
        p.vy = 0
      }

      const dist = Math.sqrt(p.x * p.x + p.z * p.z)
      if (dist > SOIL_RADIUS * 1.5) {
        const factor = (SOIL_RADIUS * 1.5) / dist
        p.x *= factor
        p.z *= factor
        p.vx *= -0.3
        p.vz *= -0.3
      }

      p.nutrientLevel = Math.max(0, p.nutrientLevel - 0.05 * deltaTime)
    }

    for (let i = toRemove.length - 1; i >= 0; i--) {
      this.particles.splice(toRemove[i], 1)
    }

    this.updateBuffers()

    return {
      positions: this.positionBuffer,
      colors: this.colorBuffer,
      count: this.particles.length
    }
  }

  private emitParticle(): void {
    const angle = Math.random() * Math.PI * 2
    const radius = Math.random() * SOIL_RADIUS * 0.8
    const x = Math.cos(angle) * radius
    const z = Math.sin(angle) * radius

    const speed = 0.3 + Math.random() * 0.5
    const spreadAngle = Math.random() * Math.PI - Math.PI / 2
    const vy = speed * Math.abs(Math.sin(spreadAngle)) + 0.2
    const horizontalSpeed = speed * Math.cos(spreadAngle) * 0.3

    const particle: Particle = {
      id: this.nextId++,
      x,
      y: SOIL_Y + Math.random() * 0.1,
      z,
      vx: Math.cos(angle) * horizontalSpeed,
      vy,
      vz: Math.sin(angle) * horizontalSpeed,
      nutrientLevel: this.nutrientLevel / 100,
      lifetime: 0,
      maxLifetime: PARTICLE_LIFETIME + (Math.random() - 0.5) * 1.0
    }

    this.particles.push(particle)
  }

  private updateBuffers(): void {
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i]
      const idx = i * 3

      this.positionBuffer[idx] = p.x
      this.positionBuffer[idx + 1] = p.y
      this.positionBuffer[idx + 2] = p.z

      const lifeRatio = 1 - p.lifetime / p.maxLifetime
      const r = (1 - p.nutrientLevel) * 0.3 + p.nutrientLevel * 0.1
      const g = (1 - p.nutrientLevel) * 0.6 + p.nutrientLevel * 0.9
      const b = (1 - p.nutrientLevel) * 1.0 + p.nutrientLevel * 0.3

      this.colorBuffer[idx] = r * lifeRatio
      this.colorBuffer[idx + 1] = g * lifeRatio
      this.colorBuffer[idx + 2] = b * lifeRatio
    }
  }

  getParticleCount(): number {
    return this.particles.length
  }

  reset(): void {
    this.particles = []
    this.emissionAccumulator = 0
    this.positionBuffer.fill(0)
    this.colorBuffer.fill(0)
  }
}
