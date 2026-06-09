import * as THREE from 'three'
import { Particle } from './Particle'

const WARM_COLORS = [
  new THREE.Color('#FF6B6B'),
  new THREE.Color('#FFD93D'),
  new THREE.Color('#6BCB77'),
  new THREE.Color('#4D96FF')
]

const MAX_PARTICLES = 2000
const CONNECTION_DISTANCE = 1.5
const DISCONNECTION_DISTANCE = 2.0

export class FireworkSystem {
  private scene: THREE.Scene
  private particles: Particle[] = []
  private particleMesh: THREE.Points | null = null
  private trailMesh: THREE.Points | null = null
  private connectionLines: THREE.LineSegments | null = null
  private connectionMaterial: THREE.LineBasicMaterial | null = null
  private particleGeometry: THREE.BufferGeometry | null = null
  private trailGeometry: THREE.BufferGeometry | null = null
  private connectionGeometry: THREE.BufferGeometry | null = null
  private particleMaterial: THREE.PointsMaterial | null = null
  private trailMaterial: THREE.PointsMaterial | null = null
  private activeFireworkCount: number = 0

  constructor(scene: THREE.Scene) {
    this.scene = scene
    this.init()
  }

  private init(): void {
    this.particleGeometry = new THREE.BufferGeometry()
    this.particleMaterial = new THREE.PointsMaterial({
      size: 1.2,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
    this.particleMesh = new THREE.Points(this.particleGeometry, this.particleMaterial)
    this.scene.add(this.particleMesh)

    this.trailGeometry = new THREE.BufferGeometry()
    this.trailMaterial = new THREE.PointsMaterial({
      size: 0.8,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
    this.trailMesh = new THREE.Points(this.trailGeometry, this.trailMaterial)
    this.scene.add(this.trailMesh)

    this.connectionGeometry = new THREE.BufferGeometry()
    this.connectionMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 1,
      linewidth: 0.05,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
    this.connectionLines = new THREE.LineSegments(this.connectionGeometry, this.connectionMaterial)
    this.scene.add(this.connectionLines)
  }

  createFirework(position: THREE.Vector3, baseColor: THREE.Color, intensity: number): void {
    this.activeFireworkCount++
    console.log('Creating firework at:', position.x, position.y, position.z, 'particles:', this.particles.length)

    const particleCount = Math.floor(80 + intensity * 10)
    const speedMultiplier = 0.5 + intensity * 0.15

    for (let i = 0; i < particleCount; i++) {
      if (this.particles.length >= MAX_PARTICLES) {
        this.removeOldestParticles(particleCount)
        break
      }

      const theta = Math.random() * Math.PI * 2
      const phi = Math.random() * Math.PI
      const speed = (5 + Math.random() * 7) * speedMultiplier

      const velocity = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta),
        Math.sin(phi) * Math.sin(theta),
        Math.cos(phi)
      ).multiplyScalar(speed)

      const warmColor = WARM_COLORS[Math.floor(Math.random() * WARM_COLORS.length)]
      const t = Math.random()
      const color = baseColor.clone().lerp(warmColor, t)

      const size = 0.3 + Math.random() * 0.7
      const life = 2 + Math.random() * 2

      const particle = new Particle({
        position: position.clone(),
        velocity,
        color,
        size,
        life
      })

      this.particles.push(particle)
    }
  }

  private removeOldestParticles(count: number): void {
    this.particles.sort((a, b) => a.life - b.life)
    this.particles.splice(0, Math.min(count, this.particles.length))
  }

  update(deltaTime: number): void {
    for (const particle of this.particles) {
      particle.update(deltaTime)
    }

    const beforeCount = this.particles.length
    this.particles = this.particles.filter(p => p.alive)
    if (beforeCount !== this.particles.length) {
      this.activeFireworkCount = Math.max(0, this.activeFireworkCount - Math.ceil((beforeCount - this.particles.length) / 100))
    }
    
    if (this.particles.length > 0 && Math.random() < 0.02) {
      console.log('Particles alive:', this.particles.length, 'first pos:', this.particles[0].position.x, this.particles[0].position.y, this.particles[0].position.z, 'size:', this.particles[0].size, 'alpha:', this.particles[0].alpha)
    }

    this.updateParticleMesh()
    this.updateTrailMesh()
    this.updateConnectionLines()
  }

  private updateParticleMesh(): void {
    if (!this.particleGeometry || !this.particleMaterial) return

    const positions: number[] = []
    const colors: number[] = []
    const sizes: number[] = []

    for (const particle of this.particles) {
      positions.push(particle.position.x, particle.position.y, particle.position.z)
      colors.push(particle.color.r, particle.color.g, particle.color.b)
      sizes.push(particle.size)
    }

    this.particleGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    this.particleGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    this.particleMaterial.size = 1.2
  }

  private updateTrailMesh(): void {
    if (!this.trailGeometry || !this.trailMaterial) return

    const positions: number[] = []
    const colors: number[] = []

    let trailCount = 0
    const maxTrailPoints = this.particles.length * 3

    for (const particle of this.particles) {
      for (let i = 0; i < particle.trail.length; i++) {
        if (trailCount >= maxTrailPoints) break
        const trailPoint = particle.trail[i]
        positions.push(trailPoint.position.x, trailPoint.position.y, trailPoint.position.z)
        const alpha = trailPoint.alpha
        colors.push(particle.color.r * alpha, particle.color.g * alpha, particle.color.b * alpha)
        trailCount++
      }
      if (trailCount >= maxTrailPoints) break
    }

    this.trailGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    this.trailGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  }

  private updateConnectionLines(): void {
    if (!this.connectionGeometry || !this.connectionMaterial) return

    const positions: number[] = []
    const colors: number[] = []

    const maxConnections = this.particles.length * 3
    let connectionCount = 0

    for (let i = 0; i < this.particles.length && connectionCount < maxConnections; i++) {
      for (let j = i + 1; j < this.particles.length && connectionCount < maxConnections; j++) {
        const p1 = this.particles[i]
        const p2 = this.particles[j]

        const distance = p1.position.distanceTo(p2.position)

        if (distance < CONNECTION_DISTANCE) {
          const alpha = 0.2 + 0.4 * (1 - distance / DISCONNECTION_DISTANCE)

          positions.push(p1.position.x, p1.position.y, p1.position.z)
          positions.push(p2.position.x, p2.position.y, p2.position.z)

          const mixedColor = p1.color.clone().lerp(p2.color, 0.5)
          colors.push(mixedColor.r * alpha, mixedColor.g * alpha, mixedColor.b * alpha)
          colors.push(mixedColor.r * alpha, mixedColor.g * alpha, mixedColor.b * alpha)

          connectionCount++
        }
      }
    }

    this.connectionGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    this.connectionGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  }

  getParticleCount(): number {
    return this.particles.length
  }

  getActiveFireworkCount(): number {
    return this.activeFireworkCount
  }

  dispose(): void {
    if (this.particleGeometry) this.particleGeometry.dispose()
    if (this.particleMaterial) this.particleMaterial.dispose()
    if (this.trailGeometry) this.trailGeometry.dispose()
    if (this.trailMaterial) this.trailMaterial.dispose()
    if (this.connectionGeometry) this.connectionGeometry.dispose()
    if (this.connectionMaterial) this.connectionMaterial.dispose()
    if (this.particleMesh) this.scene.remove(this.particleMesh)
    if (this.trailMesh) this.scene.remove(this.trailMesh)
    if (this.connectionLines) this.scene.remove(this.connectionLines)
  }
}
