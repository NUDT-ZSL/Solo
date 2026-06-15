import { Asteroid, TargetRing } from './types'

export class CollisionDetector {
  public checkTargetCollision(
    asteroid: Asteroid,
    targets: TargetRing[]
  ): { hit: boolean; targetId: string | null } {
    for (const target of targets) {
      if (target.isHit) continue

      const dx = asteroid.x - target.x
      const dy = asteroid.y - target.y
      const distance = Math.sqrt(dx * dx + dy * dy)

      if (distance < target.radius) {
        return { hit: true, targetId: target.id }
      }
    }
    return { hit: false, targetId: null }
  }

  public checkPointInCircle(
    px: number,
    py: number,
    cx: number,
    cy: number,
    radius: number
  ): boolean {
    const dx = px - cx
    const dy = py - cy
    return dx * dx + dy * dy < radius * radius
  }
}
