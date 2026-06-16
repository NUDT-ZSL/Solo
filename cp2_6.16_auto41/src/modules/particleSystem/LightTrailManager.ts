import * as THREE from 'three'

export interface LightParticle {
  x: number
  y: number
  z: number
  size: number
  life: number
  maxLife: number
}

export class LightTrailManager {
  private particles: LightParticle[] = []
  private maxCount: number
  private lifetime: number
  private initialSize: number
  private positions: Float32Array
  private colors: Float32Array
  private sizes: Float32Array
  private alphas: Float32Array
  private isDragging: boolean = false

  constructor(maxCount: number = 800, lifetime: number = 3, initialSize: number = 6) {
    this.maxCount = maxCount
    this.lifetime = lifetime
    this.initialSize = initialSize
    this.positions = new Float32Array(maxCount * 3)
    this.colors = new Float32Array(maxCount * 3)
    this.sizes = new Float32Array(maxCount)
    this.alphas = new Float32Array(maxCount)
  }

  addParticle(position: THREE.Vector3): void {
    const particle: LightParticle = {
      x: position.x,
      y: position.y,
      z: position.z,
      size: this.initialSize,
      life: this.lifetime,
      maxLife: this.lifetime
    }

    if (this.particles.length >= this.maxCount) {
      this.particles.shift()
    }

    this.particles.push(particle)
  }

  update(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      p.life -= deltaTime

      if (p.life <= 0) {
        this.particles.splice(i, 1)
      }
    }

    this.updateBuffers()
  }

  private updateBuffers(): void {
    const count = this.particles.length

    for (let i = 0; i < this.maxCount; i++) {
      const i3 = i * 3

      if (i < count) {
        const p = this.particles[i]
        const lifeRatio = p.life / p.maxLife

        this.positions[i3] = p.x
        this.positions[i3 + 1] = p.y
        this.positions[i3 + 2] = p.z

        this.colors[i3] = 1
        this.colors[i3 + 1] = 1
        this.colors[i3 + 2] = 1

        this.sizes[i] = this.initialSize * lifeRatio
        this.alphas[i] = lifeRatio
      } else {
        this.positions[i3] = 0
        this.positions[i3 + 1] = 0
        this.positions[i3 + 2] = 0
        this.colors[i3] = 0
        this.colors[i3 + 1] = 0
        this.colors[i3 + 2] = 0
        this.sizes[i] = 0
        this.alphas[i] = 0
      }
    }
  }

  setDragging(dragging: boolean): void {
    this.isDragging = dragging
  }

  getIsDragging(): boolean {
    return this.isDragging
  }

  getPositions(): Float32Array {
    return this.positions
  }

  getColors(): Float32Array {
    return this.colors
  }

  getSizes(): Float32Array {
    return this.sizes
  }

  getAlphas(): Float32Array {
    return this.alphas
  }

  getActiveCount(): number {
    return this.particles.length
  }

  getMaxCount(): number {
    return this.maxCount
  }

  clear(): void {
    this.particles = []
    this.updateBuffers()
  }
}
