import { Particle, Obstacle, CollisionEvent } from './store'

export interface PhysicsConfig {
  gravity: number
  damping: number
  restitution: number
  boundarySize: [number, number, number]
  particleLifetime: number
  particleRadius: number
  maxParticles: number
}

export interface PhysicsState {
  particles: Particle[]
  obstacles: Obstacle[]
  collisionEvents: CollisionEvent[]
}

const generateId = (): string => Math.random().toString(36).substr(2, 9)

const lerpColor = (color1: string, color2: string, t: number): string => {
  const c1 = parseInt(color1.slice(1), 16)
  const c2 = parseInt(color2.slice(1), 16)
  const r = Math.round((c1 >> 16) + ((c2 >> 16) - (c1 >> 16)) * t)
  const g = Math.round(((c1 >> 8) & 0xff) + ((c2 >> 8 & 0xff) - (c1 >> 8 & 0xff)) * t)
  const b = Math.round((c1 & 0xff) + ((c2 & 0xff) - (c1 & 0xff)) * t)
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
}

export class PhysicsEngine {
  private config: PhysicsConfig
  private emissionAccumulator: number = 0

  constructor(config: PhysicsConfig) {
    this.config = config
  }

  updateConfig(config: Partial<PhysicsConfig>): void {
    this.config = { ...this.config, ...config }
  }

  createParticle(boundarySize: [number, number, number]): Particle {
    const x = (Math.random() - 0.5) * boundarySize[0] * 0.9
    const z = (Math.random() - 0.5) * boundarySize[2] * 0.9
    const colorT = Math.random()
    return {
      id: generateId(),
      position: [x, boundarySize[1] / 2, z],
      velocity: [(Math.random() - 0.5) * 0.5, 0, (Math.random() - 0.5) * 0.5],
      life: this.config.particleLifetime,
      maxLife: this.config.particleLifetime,
      color: lerpColor('#00BFFF', '#1E90FF', colorT),
    }
  }

  emitParticles(
    dt: number,
    emissionRate: number,
    currentParticles: Particle[]
  ): Particle[] {
    const newParticles: Particle[] = []
    this.emissionAccumulator += emissionRate * dt

    while (this.emissionAccumulator >= 1 && newParticles.length < 10) {
      if (currentParticles.length + newParticles.length < this.config.maxParticles) {
        newParticles.push(this.createParticle(this.config.boundarySize))
      }
      this.emissionAccumulator -= 1
    }

    return newParticles
  }

  updateParticles(
    particles: Particle[],
    dt: number,
    timeScale: number,
    collisionEvents: CollisionEvent[]
  ): { updated: Particle[]; removed: string[] } {
    const scaledDt = dt * timeScale
    const removed: string[] = []
    const halfBounds = this.config.boundarySize.map((s) => s / 2) as [number, number, number]

    const collisionMap = new Map<string, CollisionEvent>()
    for (const event of collisionEvents) {
      collisionMap.set(event.particleId, event)
    }

    const updated = particles.map((p) => {
      const collision = collisionMap.get(p.id)
      let velocity = [...p.velocity] as [number, number, number]
      let position = [...p.position] as [number, number, number]

      if (collision) {
        velocity = [
          -velocity[0] * this.config.restitution,
          -velocity[1] * this.config.restitution,
          -velocity[2] * this.config.restitution,
        ]
        const dot = velocity[0] * collision.normal[0] +
                    velocity[1] * collision.normal[1] +
                    velocity[2] * collision.normal[2]
        velocity = [
          (velocity[0] - 2 * dot * collision.normal[0]) * this.config.restitution,
          (velocity[1] - 2 * dot * collision.normal[1]) * this.config.restitution,
          (velocity[2] - 2 * dot * collision.normal[2]) * this.config.restitution,
        ]
        position = [...collision.position] as [number, number, number]
      }

      velocity[1] += this.config.gravity * scaledDt
      velocity = velocity.map((v) => v * this.config.damping) as [number, number, number]

      position = [
        position[0] + velocity[0] * scaledDt,
        position[1] + velocity[1] * scaledDt,
        position[2] + velocity[2] * scaledDt,
      ]

      for (let i = 0; i < 3; i++) {
        if (position[i] < -halfBounds[i] + this.config.particleRadius) {
          position[i] = -halfBounds[i] + this.config.particleRadius
          velocity[i] = -velocity[i] * this.config.restitution
        } else if (position[i] > halfBounds[i] - this.config.particleRadius) {
          position[i] = halfBounds[i] - this.config.particleRadius
          velocity[i] = -velocity[i] * this.config.restitution
        }
      }

      return {
        ...p,
        position,
        velocity,
        life: p.life - scaledDt,
      }
    })

    const alive = updated.filter((p) => {
      if (p.life <= 0) {
        removed.push(p.id)
        return false
      }
      return true
    })

    return { updated: alive, removed }
  }

  getParticlePositions(particles: Particle[]): Float32Array {
    const positions = new Float32Array(particles.length * 3)
    for (let i = 0; i < particles.length; i++) {
      positions[i * 3] = particles[i].position[0]
      positions[i * 3 + 1] = particles[i].position[1]
      positions[i * 3 + 2] = particles[i].position[2]
    }
    return positions
  }

  getParticleColors(particles: Particle[]): Float32Array {
    const colors = new Float32Array(particles.length * 3)
    for (let i = 0; i < particles.length; i++) {
      const hex = particles[i].color
      colors[i * 3] = parseInt(hex.slice(1, 3), 16) / 255
      colors[i * 3 + 1] = parseInt(hex.slice(3, 5), 16) / 255
      colors[i * 3 + 2] = parseInt(hex.slice(5, 7), 16) / 255
    }
    return colors
  }
}
