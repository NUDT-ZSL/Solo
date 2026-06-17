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
const EMISSION_RATE_BASE = 15
const SOIL_RADIUS = 1.4
const SOIL_TOP_Y = 0.5
const SOIL_BOTTOM_Y = -1.5
const GRAVITY = 0.8
const DIFFUSION_BASE = 0.5

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
    const waterFactor = this.waterLevel / 100
    const diffusionSpeed = DIFFUSION_BASE * (1.0 - waterFactor * 0.6)
    const emissionRate = EMISSION_RATE_BASE + waterFactor * 20

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

      p.vy -= GRAVITY * deltaTime

      const brownianX = (Math.random() - 0.5) * diffusionSpeed * 2
      const brownianZ = (Math.random() - 0.5) * diffusionSpeed * 2
      const brownianY = (Math.random() - 0.5) * diffusionSpeed * 0.5

      p.vx += brownianX * deltaTime
      p.vz += brownianZ * deltaTime
      p.vy += brownianY * deltaTime

      const drag = 0.98 + waterFactor * 0.015
      p.vx *= drag
      p.vz *= drag
      p.vy *= drag

      const speedFactor = diffusionSpeed * 1.5
      p.x += p.vx * speedFactor * deltaTime
      p.y += p.vy * speedFactor * deltaTime
      p.z += p.vz * speedFactor * deltaTime

      const distFromCenter = Math.sqrt(p.x * p.x + p.z * p.z)
      if (distFromCenter > SOIL_RADIUS) {
        const factor = SOIL_RADIUS / distFromCenter
        p.x *= factor
        p.z *= factor
        const normalX = p.x / SOIL_RADIUS
        const normalZ = p.z / SOIL_RADIUS
        const dot = p.vx * normalX + p.vz * normalZ
        p.vx -= 2 * dot * normalX
        p.vz -= 2 * dot * normalZ
        p.vx *= 0.3
        p.vz *= 0.3
      }

      if (p.y < SOIL_BOTTOM_Y) {
        p.y = SOIL_BOTTOM_Y
        p.vy = Math.abs(p.vy) * 0.2
      }

      if (p.y > SOIL_TOP_Y + 0.2) {
        p.y = SOIL_TOP_Y + 0.2
        p.vy = -Math.abs(p.vy) * 0.5
      }

      p.nutrientLevel = Math.max(0, p.nutrientLevel - 0.08 * deltaTime)
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
    const radius = Math.random() * SOIL_RADIUS * 0.7
    const x = Math.cos(angle) * radius
    const z = Math.sin(angle) * radius

    const spreadAngle = Math.random() * Math.PI * 2
    const horizontalSpeed = 0.2 + Math.random() * 0.4
    const downwardSpeed = 0.3 + Math.random() * 0.5

    const particle: Particle = {
      id: this.nextId++,
      x,
      y: SOIL_TOP_Y + (Math.random() - 0.5) * 0.1,
      z,
      vx: Math.cos(spreadAngle) * horizontalSpeed,
      vy: -downwardSpeed,
      vz: Math.sin(spreadAngle) * horizontalSpeed,
      nutrientLevel: this.nutrientLevel / 100,
      lifetime: 0,
      maxLifetime: PARTICLE_LIFETIME + (Math.random() - 0.5) * 1.5
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
      const alpha = lifeRatio * 0.9

      const nutrient = p.nutrientLevel

      const blueR = 0.31
      const blueG = 0.76
      const blueB = 0.97
      const greenR = 0.1
      const greenG = 0.85
      const greenB = 0.15

      const r = blueR + (greenR - blueR) * nutrient
      const g = blueG + (greenG - blueG) * nutrient
      const b = blueB + (greenB - blueB) * nutrient

      this.colorBuffer[idx] = r * alpha
      this.colorBuffer[idx + 1] = g * alpha
      this.colorBuffer[idx + 2] = b * alpha
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
