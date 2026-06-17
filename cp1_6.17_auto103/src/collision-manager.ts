import { Obstacle, Particle, CollisionEvent, ObstacleType } from './store'

const generateId = (): string => Math.random().toString(36).substr(2, 9)

export interface CollisionResult {
  events: CollisionEvent[]
}

export class CollisionManager {
  private obstacles: Obstacle[] = []
  private particleRadius: number = 0.1
  private boundarySize: [number, number, number] = [12, 10, 8]

  setObstacles(obstacles: Obstacle[]): void {
    this.obstacles = obstacles
  }

  setParticleRadius(radius: number): void {
    this.particleRadius = radius
  }

  setBoundarySize(size: [number, number, number]): void {
    this.boundarySize = size
  }

  createObstacle(
    type: ObstacleType,
    position: [number, number, number]
  ): Obstacle {
    let size: number
    switch (type) {
      case 'cube':
        size = 1 + Math.random() * 1
        break
      case 'sphere':
        size = 0.5 + Math.random() * 1
        break
      case 'torus':
        size = 1.5 + Math.random() * 1.5
        break
      default:
        size = 1
    }
    return {
      id: generateId(),
      type,
      position,
      size,
      rotation: [0, 0, 0],
    }
  }

  checkCollisions(particles: Particle[]): CollisionResult {
    const events: CollisionEvent[] = []
    const halfBounds = this.boundarySize.map((s) => s / 2) as [number, number, number]

    for (const particle of particles) {
      const boundaryCollision = this.checkBoundaryCollision(particle, halfBounds)
      if (boundaryCollision) {
        events.push(boundaryCollision)
        continue
      }

      const obstacleCollision = this.checkObstacleCollisions(particle)
      if (obstacleCollision) {
        events.push(obstacleCollision)
      }
    }

    return { events }
  }

  private checkBoundaryCollision(
    particle: Particle,
    halfBounds: [number, number, number]
  ): CollisionEvent | null {
    const pos = particle.position
    const r = this.particleRadius
    let normal: [number, number, number] | null = null

    for (let i = 0; i < 3; i++) {
      if (pos[i] - r <= -halfBounds[i]) {
        normal = [0, 0, 0]
        normal[i] = 1
        break
      } else if (pos[i] + r >= halfBounds[i]) {
        normal = [0, 0, 0]
        normal[i] = -1
        break
      }
    }

    if (!normal) return null

    const collisionPos = [...pos] as [number, number, number]
    for (let i = 0; i < 3; i++) {
      if (normal[i] > 0) collisionPos[i] = -halfBounds[i] + r
      else if (normal[i] < 0) collisionPos[i] = halfBounds[i] - r
    }

    return {
      particleId: particle.id,
      position: collisionPos,
      normal,
      timestamp: Date.now(),
    }
  }

  private checkObstacleCollisions(particle: Particle): CollisionEvent | null {
    for (const obstacle of this.obstacles) {
      const collision = this.checkSingleObstacleCollision(particle, obstacle)
      if (collision) {
        return collision
      }
    }
    return null
  }

  private checkSingleObstacleCollision(
    particle: Particle,
    obstacle: Obstacle
  ): CollisionEvent | null {
    switch (obstacle.type) {
      case 'cube':
        return this.checkCubeCollision(particle, obstacle)
      case 'sphere':
        return this.checkSphereCollision(particle, obstacle)
      case 'torus':
        return this.checkTorusCollision(particle, obstacle)
      default:
        return null
    }
  }

  private checkCubeCollision(
    particle: Particle,
    obstacle: Obstacle
  ): CollisionEvent | null {
    const halfSize = obstacle.size / 2
    const min = obstacle.position.map((p) => p - halfSize) as [number, number, number]
    const max = obstacle.position.map((p) => p + halfSize) as [number, number, number]
    const r = this.particleRadius

    const closest: [number, number, number] = [0, 0, 0]
    let inside = true

    for (let i = 0; i < 3; i++) {
      if (particle.position[i] < min[i] - r) {
        closest[i] = min[i]
        inside = false
      } else if (particle.position[i] > max[i] + r) {
        closest[i] = max[i]
        inside = false
      } else {
        closest[i] = particle.position[i]
      }
    }

    if (inside) {
      const distances = [
        particle.position[0] - min[0],
        max[0] - particle.position[0],
        particle.position[1] - min[1],
        max[1] - particle.position[1],
        particle.position[2] - min[2],
        max[2] - particle.position[2],
      ]
      const minDist = Math.min(...distances)
      const minIndex = distances.indexOf(minDist)

      const normal: [number, number, number] = [0, 0, 0]
      const collisionPos = [...particle.position] as [number, number, number]

      if (minIndex % 2 === 0) {
        normal[Math.floor(minIndex / 2)] = -1
        collisionPos[Math.floor(minIndex / 2)] = min[Math.floor(minIndex / 2)] - r
      } else {
        normal[Math.floor(minIndex / 2)] = 1
        collisionPos[Math.floor(minIndex / 2)] = max[Math.floor(minIndex / 2)] + r
      }

      return {
        particleId: particle.id,
        obstacleId: obstacle.id,
        position: collisionPos,
        normal,
        timestamp: Date.now(),
      }
    }

    const dx = particle.position[0] - closest[0]
    const dy = particle.position[1] - closest[1]
    const dz = particle.position[2] - closest[2]
    const distSq = dx * dx + dy * dy + dz * dz

    if (distSq < r * r) {
      const dist = Math.sqrt(distSq) || 0.0001
      const normal: [number, number, number] = [dx / dist, dy / dist, dz / dist]
      const collisionPos: [number, number, number] = [
        closest[0] + normal[0] * r,
        closest[1] + normal[1] * r,
        closest[2] + normal[2] * r,
      ]
      return {
        particleId: particle.id,
        obstacleId: obstacle.id,
        position: collisionPos,
        normal,
        timestamp: Date.now(),
      }
    }

    return null
  }

  private checkSphereCollision(
    particle: Particle,
    obstacle: Obstacle
  ): CollisionEvent | null {
    const dx = particle.position[0] - obstacle.position[0]
    const dy = particle.position[1] - obstacle.position[1]
    const dz = particle.position[2] - obstacle.position[2]
    const distSq = dx * dx + dy * dy + dz * dz
    const totalRadius = obstacle.size + this.particleRadius

    if (distSq < totalRadius * totalRadius) {
      const dist = Math.sqrt(distSq) || 0.0001
      const normal: [number, number, number] = [dx / dist, dy / dist, dz / dist]
      const collisionPos: [number, number, number] = [
        obstacle.position[0] + normal[0] * totalRadius,
        obstacle.position[1] + normal[1] * totalRadius,
        obstacle.position[2] + normal[2] * totalRadius,
      ]
      return {
        particleId: particle.id,
        obstacleId: obstacle.id,
        position: collisionPos,
        normal,
        timestamp: Date.now(),
      }
    }

    return null
  }

  private checkTorusCollision(
    particle: Particle,
    obstacle: Obstacle
  ): CollisionEvent | null {
    const torusRadius = obstacle.size / 2
    const tubeRadius = torusRadius * 0.3

    const dx = particle.position[0] - obstacle.position[0]
    const dy = particle.position[1] - obstacle.position[1]
    const dz = particle.position[2] - obstacle.position[2]

    const distXZ = Math.sqrt(dx * dx + dz * dz)
    const distToCenter = Math.sqrt(dx * dx + dy * dy + dz * dz)

    if (distToCenter < torusRadius + tubeRadius + this.particleRadius) {
      let closestPointOnRing: [number, number, number]
      if (distXZ > 0.001) {
        closestPointOnRing = [
          obstacle.position[0] + (dx / distXZ) * torusRadius,
          obstacle.position[1],
          obstacle.position[2] + (dz / distXZ) * torusRadius,
        ]
      } else {
        closestPointOnRing = [
          obstacle.position[0] + torusRadius,
          obstacle.position[1],
          obstacle.position[2],
        ]
      }

      const tdx = particle.position[0] - closestPointOnRing[0]
      const tdy = particle.position[1] - closestPointOnRing[1]
      const tdz = particle.position[2] - closestPointOnRing[2]
      const tubeDistSq = tdx * tdx + tdy * tdy + tdz * tdz
      const totalTubeRadius = tubeRadius + this.particleRadius

      if (tubeDistSq < totalTubeRadius * totalTubeRadius) {
        const tubeDist = Math.sqrt(tubeDistSq) || 0.0001
        const normal: [number, number, number] = [
          tdx / tubeDist,
          tdy / tubeDist,
          tdz / tubeDist,
        ]
        const collisionPos: [number, number, number] = [
          closestPointOnRing[0] + normal[0] * totalTubeRadius,
          closestPointOnRing[1] + normal[1] * totalTubeRadius,
          closestPointOnRing[2] + normal[2] * totalTubeRadius,
        ]
        return {
          particleId: particle.id,
          obstacleId: obstacle.id,
          position: collisionPos,
          normal,
          timestamp: Date.now(),
        }
      }
    }

    return null
  }

  getObstacleBoundingBox(obstacle: Obstacle): { min: [number, number, number]; max: [number, number, number] } {
    let maxSize: number
    switch (obstacle.type) {
      case 'cube':
        maxSize = obstacle.size
        break
      case 'sphere':
        maxSize = obstacle.size * 2
        break
      case 'torus':
        maxSize = obstacle.size
        break
      default:
        maxSize = 1
    }
    const halfSize = maxSize / 2
    return {
      min: obstacle.position.map((p) => p - halfSize) as [number, number, number],
      max: obstacle.position.map((p) => p + halfSize) as [number, number, number],
    }
  }
}
