import * as THREE from 'three'

export interface ParticleConfig {
  position: THREE.Vector3
  velocity: THREE.Vector3
  color: THREE.Color
  size: number
  life: number
}

export class Particle {
  public position: THREE.Vector3
  public velocity: THREE.Vector3
  public color: THREE.Color
  public initialColor: THREE.Color
  public size: number
  public initialSize: number
  public life: number
  public maxLife: number
  public alive: boolean
  public trail: Array<{ position: THREE.Vector3; alpha: number; size: number }>
  public trailLength: number = 5

  constructor(config: ParticleConfig) {
    this.position = config.position.clone()
    this.velocity = config.velocity.clone()
    this.color = config.color.clone()
    this.initialColor = config.color.clone()
    this.size = config.size
    this.initialSize = config.size
    this.maxLife = config.life
    this.life = config.life
    this.alive = true
    this.trail = []
  }

  update(deltaTime: number): void {
    if (!this.alive) return

    this.trail.unshift({
      position: this.position.clone(),
      alpha: 0.4,
      size: this.size * 0.9
    })

    while (this.trail.length > this.trailLength) {
      this.trail.pop()
    }

    for (let i = 0; i < this.trail.length; i++) {
      const t = i / this.trail.length
      this.trail[i].alpha = 0.4 * (1 - t)
      this.trail[i].size = this.size * (0.9 - t * 0.7)
    }

    this.position.addScaledVector(this.velocity, deltaTime)
    this.velocity.multiplyScalar(0.98)
    this.velocity.y -= 0.5 * deltaTime

    this.life -= deltaTime
    if (this.life <= 0) {
      this.alive = false
      return
    }

    const lifeRatio = this.life / this.maxLife
    this.size = this.initialSize * lifeRatio
  }

  get alpha(): number {
    const ratio = this.life / this.maxLife
    return Math.max(0, Math.min(1, ratio))
  }
}
