import * as THREE from 'three'

export class DustParticle {
  points: THREE.Points
  private geometry: THREE.BufferGeometry
  private positions: Float32Array
  private velocities: Float32Array
  private lifetimes: Float32Array
  private ages: Float32Array
  private alphas: Float32Array
  private particleCount: number
  private bounds: { x: number; z: number; y: number }

  constructor(count: number = 4000, bounds: { x: number; z: number; y: number } = { x: 14, z: 14, y: 4 }) {
    this.particleCount = count
    this.bounds = bounds
    this.positions = new Float32Array(count * 3)
    this.velocities = new Float32Array(count * 3)
    this.lifetimes = new Float32Array(count)
    this.ages = new Float32Array(count)
    this.alphas = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      this.resetParticle(i)
    }

    this.geometry = new THREE.BufferGeometry()
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3))

    const material = new THREE.PointsMaterial({
      color: 0xD4A24A,
      size: 0.08,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    })

    this.points = new THREE.Points(this.geometry, material)
  }

  private resetParticle(i: number) {
    this.positions[i * 3] = (Math.random() - 0.5) * this.bounds.x * 2
    this.positions[i * 3 + 1] = Math.random() * this.bounds.y
    this.positions[i * 3 + 2] = (Math.random() - 0.5) * this.bounds.z * 2
    this.velocities[i * 3] = 0
    this.velocities[i * 3 + 1] = Math.random() * 0.02
    this.velocities[i * 3 + 2] = 0
    this.lifetimes[i] = 2 + Math.random() * 6
    this.ages[i] = Math.random() * this.lifetimes[i]
    this.alphas[i] = 0.3 + Math.random() * 0.5
  }

  triggerBurst(point: THREE.Vector3, count: number = 80) {
    const startIdx = Math.max(0, this.particleCount - count)
    for (let i = startIdx; i < this.particleCount; i++) {
      this.positions[i * 3] = point.x + (Math.random() - 0.5) * 0.5
      this.positions[i * 3 + 1] = point.y + Math.random() * 0.5
      this.positions[i * 3 + 2] = point.z + (Math.random() - 0.5) * 0.5
      const angle = Math.random() * Math.PI * 2
      const speed = 1 + Math.random() * 3
      this.velocities[i * 3] = Math.cos(angle) * speed * 0.3
      this.velocities[i * 3 + 1] = Math.random() * 2
      this.velocities[i * 3 + 2] = Math.sin(angle) * speed * 0.3
      this.lifetimes[i] = 1 + Math.random() * 2
      this.ages[i] = 0
      this.alphas[i] = 0.8
    }
  }

  update(dt: number, windSpeed: number, windDirection: number) {
    const windRad = (windDirection * Math.PI) / 180
    const windForceX = Math.cos(windRad) * windSpeed * 0.08
    const windForceZ = Math.sin(windRad) * windSpeed * 0.08
    const windForceY = windSpeed * 0.01
    const speedFactor = windSpeed / 10

    for (let i = 0; i < this.particleCount; i++) {
      this.ages[i] += dt

      if (this.ages[i] >= this.lifetimes[i]) {
        this.resetParticle(i)
        continue
      }

      const lifeRatio = this.ages[i] / this.lifetimes[i]
      const easing = 1 - lifeRatio

      this.velocities[i * 3] += windForceX * dt * easing
      this.velocities[i * 3 + 1] += windForceY * dt
      this.velocities[i * 3 + 2] += windForceZ * dt * easing

      this.velocities[i * 3] *= 0.98
      this.velocities[i * 3 + 1] *= 0.98
      this.velocities[i * 3 + 2] *= 0.98

      this.positions[i * 3] += this.velocities[i * 3] * dt * 2
      this.positions[i * 3 + 1] += this.velocities[i * 3 + 1] * dt * 2
      this.positions[i * 3 + 2] += this.velocities[i * 3 + 2] * dt * 2

      if (Math.abs(this.positions[i * 3]) > this.bounds.x) {
        this.positions[i * 3] = -Math.sign(this.positions[i * 3]) * (this.bounds.x - 0.5)
        this.ages[i] = this.lifetimes[i] * 0.5
      }
      if (this.positions[i * 3 + 1] > this.bounds.y + 2) {
        this.positions[i * 3 + 1] = 0
      }
      if (this.positions[i * 3 + 1] < -0.5) {
        this.positions[i * 3 + 1] = 0.1
        this.velocities[i * 3 + 1] = Math.random() * 0.05
      }
      if (Math.abs(this.positions[i * 3 + 2]) > this.bounds.z) {
        this.positions[i * 3 + 2] = -Math.sign(this.positions[i * 3 + 2]) * (this.bounds.z - 0.5)
        this.ages[i] = this.lifetimes[i] * 0.5
      }
    }

    this.geometry.getAttribute('position').needsUpdate = true

    const mat = this.points.material as THREE.PointsMaterial
    mat.opacity = 0.2 + speedFactor * 0.6
    mat.size = 0.05 + speedFactor * 0.06
    const r = 0.83 + speedFactor * 0.1
    const g = 0.63 - speedFactor * 0.15
    const b = 0.29 - speedFactor * 0.1
    mat.color.setRGB(Math.min(r, 1), Math.max(g, 0), Math.max(b, 0))
  }

  dispose() {
    this.geometry.dispose()
    ;(this.points.material as THREE.Material).dispose()
  }
}
