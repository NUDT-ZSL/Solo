import { Star, TargetRing } from './types'

export class LayoutGenerator {
  private seed: number

  constructor(seed?: string) {
    this.seed = seed ? this.hashString(seed) : Date.now()
  }

  private hashString(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return Math.abs(hash)
  }

  private random(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280
    return this.seed / 233280
  }

  public generateStars(
    canvasWidth: number,
    canvasHeight: number,
    count: number = 4
  ): Star[] {
    const stars: Star[] = []
    const minX = canvasWidth * 0.2
    const maxX = canvasWidth * 0.7
    const minY = canvasHeight * 0.15
    const maxY = canvasHeight * 0.85

    for (let i = 0; i < count; i++) {
      const mass = 1 + Math.floor(this.random() * 4)
      const radius = 10 + mass * 5
      const gravityRadius = mass * 50

      let x: number, y: number
      let attempts = 0
      let valid = false

      while (!valid && attempts < 100) {
        x = minX + this.random() * (maxX - minX)
        y = minY + this.random() * (maxY - minY)
        valid = true

        for (const existing of stars) {
          const dx = x - existing.x
          const dy = y - existing.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < gravityRadius + existing.gravityRadius + 50) {
            valid = false
            break
          }
        }
        attempts++
      }

      stars.push({
        id: `star-${i}`,
        x: x!,
        y: y!,
        mass,
        radius,
        gravityRadius,
        pulsePhase: this.random() * Math.PI * 2,
      })
    }

    return stars
  }

  public generateTargets(
    canvasWidth: number,
    canvasHeight: number,
    stars: Star[],
    count: number = 3
  ): TargetRing[] {
    const targets: TargetRing[] = []
    const targetRadius = 30

    for (let i = 0; i < count; i++) {
      let x: number, y: number
      let attempts = 0
      let valid = false

      while (!valid && attempts < 200) {
        x = 100 + this.random() * (canvasWidth - 300)
        y = 50 + this.random() * (canvasHeight - 100)
        valid = true

        for (const star of stars) {
          const dx = x - star.x
          const dy = y - star.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < star.gravityRadius + targetRadius + 20) {
            valid = false
            break
          }
        }

        for (const existing of targets) {
          const dx = x - existing.x
          const dy = y - existing.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < targetRadius * 2 + 30) {
            valid = false
            break
          }
        }

        attempts++
      }

      targets.push({
        id: `target-${i}`,
        x: x!,
        y: y!,
        radius: targetRadius,
        isHit: false,
        hitTime: 0,
        rippleRadius: targetRadius,
        rippleAlpha: 0,
      })
    }

    return targets
  }

  public getSeedString(): string {
    return this.seed.toString()
  }
}
