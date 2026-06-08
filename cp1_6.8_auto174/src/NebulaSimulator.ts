import * as THREE from 'three'
import { nebulaVertexShader, nebulaFragmentShader } from '@/shaders/nebulaParticle'
import { useSimStore } from '@/store'

const MAX_PARTICLES = 8000
const BOUNDS = 18
const ATTRACTION_RADIUS = 3.5
const DENSITY_THRESHOLD = 40

export interface ClusterInfo {
  position: THREE.Vector3
  particleCount: number
  totalMass: number
}

export class NebulaSimulator {
  geometry: THREE.BufferGeometry
  material: THREE.ShaderMaterial
  points: THREE.Points

  private positions: Float32Array
  private colors: Float32Array
  private sizes: Float32Array
  private alphas: Float32Array
  private velocities: Float32Array
  private activeCount: number
  private clusterCooldowns: Map<string, number> = new Map()

  constructor() {
    this.activeCount = MAX_PARTICLES
    this.positions = new Float32Array(MAX_PARTICLES * 3)
    this.colors = new Float32Array(MAX_PARTICLES * 3)
    this.sizes = new Float32Array(MAX_PARTICLES)
    this.alphas = new Float32Array(MAX_PARTICLES)
    this.velocities = new Float32Array(MAX_PARTICLES * 3)

    this.initParticles()

    this.geometry = new THREE.BufferGeometry()
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3))
    this.geometry.setAttribute('aColor', new THREE.BufferAttribute(this.colors, 3))
    this.geometry.setAttribute('aSize', new THREE.BufferAttribute(this.sizes, 1))
    this.geometry.setAttribute('aAlpha', new THREE.BufferAttribute(this.alphas, 1))

    const store = useSimStore.getState()
    this.material = new THREE.ShaderMaterial({
      vertexShader: nebulaVertexShader,
      fragmentShader: nebulaFragmentShader,
      uniforms: {
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
        uGlowIntensity: { value: store.glowIntensity },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })

    this.points = new THREE.Points(this.geometry, this.material)
    this.points.frustumCulled = false
  }

  private initParticles() {
    const palette = [
      new THREE.Color('#6366f1'),
      new THREE.Color('#a855f7'),
      new THREE.Color('#d946ef'),
      new THREE.Color('#f59e0b'),
      new THREE.Color('#fbbf24'),
    ]

    for (let i = 0; i < MAX_PARTICLES; i++) {
      const i3 = i * 3
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = Math.pow(Math.random(), 0.6) * BOUNDS

      this.positions[i3] = r * Math.sin(phi) * Math.cos(theta)
      this.positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.6
      this.positions[i3 + 2] = r * Math.cos(phi)

      this.velocities[i3] = (Math.random() - 0.5) * 0.02
      this.velocities[i3 + 1] = (Math.random() - 0.5) * 0.02
      this.velocities[i3 + 2] = (Math.random() - 0.5) * 0.02

      const c = palette[Math.floor(Math.random() * palette.length)]
      const variation = 0.15
      this.colors[i3] = Math.min(1, c.r + (Math.random() - 0.5) * variation)
      this.colors[i3 + 1] = Math.min(1, c.g + (Math.random() - 0.5) * variation)
      this.colors[i3 + 2] = Math.min(1, c.b + (Math.random() - 0.5) * variation)

      this.sizes[i] = 1.5 + Math.random() * 3.0
      this.alphas[i] = 0.3 + Math.random() * 0.5
    }
  }

  update(delta: number): ClusterInfo[] {
    const store = useSimStore.getState()
    const gravity = store.gravityStrength
    const density = store.particleDensity
    this.activeCount = Math.min(density, MAX_PARTICLES)

    this.material.uniforms.uGlowIntensity.value = store.glowIntensity

    const dt = Math.min(delta, 0.05)
    const dragFactor = 1.0 - 0.02 * dt * 60

    for (let i = 0; i < this.activeCount; i++) {
      const i3 = i * 3
      let ax = 0, ay = 0, az = 0

      const px = this.positions[i3]
      const py = this.positions[i3 + 1]
      const pz = this.positions[i3 + 2]
      const distCenter = Math.sqrt(px * px + py * py + pz * pz)

      if (distCenter > 0.5) {
        const gForce = -gravity * 0.3 / (distCenter * distCenter + 1)
        ax += (px / distCenter) * gForce
        ay += (py / distCenter) * gForce
        az += (pz / distCenter) * gForce
      }

      const swirlStrength = gravity * 0.08
      ax += -py * swirlStrength * 0.01
      az += px * swirlStrength * 0.01

      this.velocities[i3] = (this.velocities[i3] + ax * dt * 60) * dragFactor
      this.velocities[i3 + 1] = (this.velocities[i3 + 1] + ay * dt * 60) * dragFactor
      this.velocities[i3 + 2] = (this.velocities[i3 + 2] + az * dt * 60) * dragFactor

      this.positions[i3] += this.velocities[i3] * dt * 60
      this.positions[i3 + 1] += this.velocities[i3 + 1] * dt * 60
      this.positions[i3 + 2] += this.velocities[i3 + 2] * dt * 60

      for (let d = 0; d < 3; d++) {
        const idx = i3 + d
        if (Math.abs(this.positions[idx]) > BOUNDS * 1.5) {
          this.velocities[idx] *= -0.5
          this.positions[idx] = Math.sign(this.positions[idx]) * BOUNDS * 1.5
        }
      }
    }

    for (let i = this.activeCount; i < MAX_PARTICLES; i++) {
      const i3 = i * 3
      this.alphas[i] = 0
    }

    this.geometry.attributes.position.needsUpdate = true
    this.geometry.attributes.aAlpha.needsUpdate = true

    return this.detectClusters()
  }

  private detectClusters(): ClusterInfo[] {
    const store = useSimStore.getState()
    const clusters: ClusterInfo[] = []
    const cellSize = ATTRACTION_RADIUS
    const grid = new Map<string, number[]>()

    for (let i = 0; i < this.activeCount; i++) {
      const i3 = i * 3
      const cx = Math.floor(this.positions[i3] / cellSize)
      const cy = Math.floor(this.positions[i3 + 1] / cellSize)
      const cz = Math.floor(this.positions[i3 + 2] / cellSize)
      const key = `${cx},${cy},${cz}`
      if (!grid.has(key)) grid.set(key, [])
      grid.get(key)!.push(i)
    }

    const now = Date.now()
    grid.forEach((indices, key) => {
      if (indices.length < DENSITY_THRESHOLD) return
      const cooldown = this.clusterCooldowns.get(key) || 0
      if (now - cooldown < 3000) return

      let sx = 0, sy = 0, sz = 0
      for (const idx of indices) {
        const i3 = idx * 3
        sx += this.positions[i3]
        sy += this.positions[i3 + 1]
        sz += this.positions[i3 + 2]
      }
      const n = indices.length
      clusters.push({
        position: new THREE.Vector3(sx / n, sy / n, sz / n),
        particleCount: n,
        totalMass: n * 0.01 * store.gravityStrength,
      })
      this.clusterCooldowns.set(key, now)
    })

    return clusters
  }

  updateParticleDensity(count: number) {
    this.activeCount = Math.min(count, MAX_PARTICLES)
  }

  dispose() {
    this.geometry.dispose()
    this.material.dispose()
  }
}
