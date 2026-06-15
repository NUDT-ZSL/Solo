import { Star, Asteroid, Vector2D, PhysicsConfig, DEFAULT_PHYSICS_CONFIG } from './types'

export class PhysicsEngine {
  private config: PhysicsConfig

  constructor(config: Partial<PhysicsConfig> = {}) {
    this.config = { ...DEFAULT_PHYSICS_CONFIG, ...config }
  }

  private getEffectiveDistance(distance: number): number {
    return Math.max(distance, this.config.minDistance)
  }

  public calculateGravityForce(
    asteroid: Asteroid,
    stars: Star[]
  ): Vector2D {
    let totalForceX = 0
    let totalForceY = 0

    for (const star of stars) {
      const dx = star.x - asteroid.x
      const dy = star.y - asteroid.y
      const distance = Math.sqrt(dx * dx + dy * dy)

      if (distance > star.gravityRadius) {
        continue
      }

      const effectiveDistance = this.getEffectiveDistance(distance)
      const acceleration = star.mass / (effectiveDistance * effectiveDistance)

      if (distance > 0) {
        totalForceX += (dx / distance) * acceleration
        totalForceY += (dy / distance) * acceleration
      }
    }

    return { x: totalForceX, y: totalForceY }
  }

  public updateAsteroid(
    asteroid: Asteroid,
    stars: Star[],
    deltaTime: number
  ): Asteroid {
    if (!asteroid.isLaunched || asteroid.isDead) {
      return { ...asteroid }
    }

    const force = this.calculateGravityForce(asteroid, stars)

    const newVx = asteroid.vx + force.x * deltaTime
    const newVy = asteroid.vy + force.y * deltaTime

    const speed = Math.sqrt(newVx * newVx + newVy * newVy)
    const clampedVx = speed > this.config.maxSpeed
      ? (newVx / speed) * this.config.maxSpeed
      : newVx
    const clampedVy = speed > this.config.maxSpeed
      ? (newVy / speed) * this.config.maxSpeed
      : newVy

    const newX = asteroid.x + clampedVx * deltaTime * 60
    const newY = asteroid.y + clampedVy * deltaTime * 60

    return {
      ...asteroid,
      x: newX,
      y: newY,
      vx: clampedVx,
      vy: clampedVy,
    }
  }

  public checkStarCollision(asteroid: Asteroid, stars: Star[]): boolean {
    for (const star of stars) {
      const dx = star.x - asteroid.x
      const dy = star.y - asteroid.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      if (distance < star.radius + asteroid.radius) {
        return true
      }
    }
    return false
  }

  public checkOutOfBounds(
    asteroid: Asteroid,
    canvasWidth: number,
    canvasHeight: number,
    margin: number = 50
  ): boolean {
    return (
      asteroid.x < -margin ||
      asteroid.x > canvasWidth + margin ||
      asteroid.y < -margin ||
      asteroid.y > canvasHeight + margin
    )
  }

  public getSpeed(asteroid: Asteroid): number {
    return Math.sqrt(asteroid.vx * asteroid.vx + asteroid.vy * asteroid.vy)
  }

  public consumeFuel(fuel: number, deltaTime: number): number {
    return Math.max(0, fuel - this.config.fuelConsumptionPerSecond * deltaTime)
  }

  public updateConfig(config: Partial<PhysicsConfig>): void {
    this.config = { ...this.config, ...config }
  }
}
