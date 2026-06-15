import * as THREE from 'three'
import { LuminanceParticle } from './LuminanceParticle'
import { useAuroraStore } from './store'

const RIBBON_COUNT = 5
const MAX_PARTICLES = 5000

export class AuroraEngine {
  particles: LuminanceParticle[] = []
  geometry: THREE.BufferGeometry
  material: THREE.PointsMaterial
  points: THREE.Points
  positions: Float32Array
  colors: Float32Array
  sizes: Float32Array
  opacities: Float32Array
  currentDensity: number = 3000
  time: number = 0
  raycaster: THREE.Raycaster

  constructor() {
    this.positions = new Float32Array(MAX_PARTICLES * 3)
    this.colors = new Float32Array(MAX_PARTICLES * 3)
    this.sizes = new Float32Array(MAX_PARTICLES)
    this.opacities = new Float32Array(MAX_PARTICLES)

    this.geometry = new THREE.BufferGeometry()
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3))
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3))
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1))

    this.material = new THREE.PointsMaterial({
      size: 0.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    })

    this.points = new THREE.Points(this.geometry, this.material)
    this.raycaster = new THREE.Raycaster()
    this.raycaster.params.Points = { threshold: 1 }

    this.generateParticles(this.currentDensity)
  }

  generateParticles(count: number): void {
    this.particles = []
    const particlesPerRibbon = Math.floor(count / RIBBON_COUNT)
    const ribbonSpread = 6

    for (let r = 0; r < RIBBON_COUNT; r++) {
      const baseY = (r - RIBBON_COUNT / 2) * ribbonSpread / RIBBON_COUNT + 5
      const zOffset = (r - RIBBON_COUNT / 2) * 2

      for (let i = 0; i < particlesPerRibbon; i++) {
        const offset = (Math.random() - 0.5) * 80
        const yVariation = (Math.random() - 0.5) * 2
        const p = new LuminanceParticle(r, offset, baseY + yVariation)
        p.data.position.z = zOffset + (Math.random() - 0.5) * 3
        p.data.life = Math.random() * p.data.maxLife
        this.particles.push(p)
      }
    }

    this.currentDensity = count
  }

  update(delta: number): void {
    const state = useAuroraStore.getState()
    this.time += delta

    if (state.density !== this.currentDensity) {
      this.generateParticles(state.density)
    }

    const amplitude = state.amplitude
    const locked = state.locked

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i]
      p.update(delta, amplitude, locked)

      const pos = p.data.position
      const drift = Math.sin(this.time * 0.2 + p.data.phase) * 0.3
      if (!locked) {
        pos.x = p.data.offset + drift
      }

      this.positions[i * 3] = pos.x
      this.positions[i * 3 + 1] = pos.y
      this.positions[i * 3 + 2] = pos.z

      const color = p.getColor((this.time * 0.05 + i / this.particles.length) % 1)
      this.colors[i * 3] = color.r
      this.colors[i * 3 + 1] = color.g
      this.colors[i * 3 + 2] = color.b

      this.sizes[i] = p.data.size * (1 + p.data.flickerIntensity * (p.data.flickerTimer > 0 ? 1 : 0))
      this.opacities[i] = p.getOpacity()
    }

    for (let i = this.particles.length; i < MAX_PARTICLES; i++) {
      this.positions[i * 3] = 0
      this.positions[i * 3 + 1] = 0
      this.positions[i * 3 + 2] = 0
      this.sizes[i] = 0
    }

    this.geometry.attributes.position.needsUpdate = true
    this.geometry.attributes.color.needsUpdate = true
    this.geometry.attributes.size.needsUpdate = true
    this.geometry.setDrawRange(0, this.particles.length)
  }

  handleClick(mouse: THREE.Vector2, camera: THREE.Camera): number[] {
    this.raycaster.setFromCamera(mouse, camera)
    const intersects = this.raycaster.intersectObject(this.points)

    if (intersects.length > 0) {
      const idx = intersects[0].index!
      const nearbyStart = Math.max(0, idx - 20)
      const nearbyEnd = Math.min(this.particles.length, idx + 20)

      for (let i = nearbyStart; i < nearbyEnd; i++) {
        this.particles[i].triggerFlicker()
      }

      const p = this.particles[idx]
      const color = p.getColor((this.time * 0.05 + idx / this.particles.length) % 1)
      return [color.r, color.g, color.b, p.data.position.x, p.data.position.y, p.data.position.z]
    }

    return []
  }

  applyCameraInfluence(azimuth: number): void {
    const offset = Math.sin(azimuth) * 0.5
    for (const p of this.particles) {
      if (!useAuroraStore.getState().locked) {
        p.data.position.x += offset * 0.01
      }
    }
  }

  dispose(): void {
    this.geometry.dispose()
    this.material.dispose()
  }
}
