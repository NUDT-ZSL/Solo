import * as THREE from 'three'
import { useStore } from './store'

const PARTICLE_COUNT = 800

export class ParticleSystem {
  private points: THREE.Points
  private geometry: THREE.BufferGeometry
  private positions: Float32Array
  private velocities: Float32Array
  private originalPositions: Float32Array
  private sizes: Float32Array
  private opacities: Float32Array
  private attractTarget: THREE.Vector3 | null = null
  private attractTimer: number = 0
  private material: THREE.PointsMaterial

  constructor(scene: THREE.Scene) {
    this.geometry = new THREE.BufferGeometry()
    this.positions = new Float32Array(PARTICLE_COUNT * 3)
    this.velocities = new Float32Array(PARTICLE_COUNT * 3)
    this.originalPositions = new Float32Array(PARTICLE_COUNT * 3)
    this.sizes = new Float32Array(PARTICLE_COUNT)
    this.opacities = new Float32Array(PARTICLE_COUNT)

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3
      const radius = 5 + Math.random() * 20
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)

      this.positions[i3] = radius * Math.sin(phi) * Math.cos(theta)
      this.positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
      this.positions[i3 + 2] = radius * Math.cos(phi)

      this.originalPositions[i3] = this.positions[i3]
      this.originalPositions[i3 + 1] = this.positions[i3 + 1]
      this.originalPositions[i3 + 2] = this.positions[i3 + 2]

      this.velocities[i3] = (Math.random() - 0.5) * 0.01
      this.velocities[i3 + 1] = (Math.random() - 0.5) * 0.01
      this.velocities[i3 + 2] = (Math.random() - 0.5) * 0.01

      this.sizes[i] = 1.0 + Math.random() * 3.0
      this.opacities[i] = 0.3 + Math.random() * 0.7
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3))
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1))

    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 64
    const ctx = canvas.getContext('2d')!
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)')
    gradient.addColorStop(0.2, 'rgba(255, 250, 230, 0.8)')
    gradient.addColorStop(0.5, 'rgba(255, 240, 200, 0.3)')
    gradient.addColorStop(1, 'rgba(255, 220, 180, 0)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 64, 64)
    const texture = new THREE.CanvasTexture(canvas)

    this.material = new THREE.PointsMaterial({
      size: 0.15,
      map: texture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: false,
      color: new THREE.Color('#ffeedd'),
      opacity: 0.6,
      sizeAttenuation: true,
    })

    this.points = new THREE.Points(this.geometry, this.material)
    scene.add(this.points)

    useStore.subscribe(
      (state) => state.clickedPosition,
      (pos) => {
        if (pos) {
          this.attractTarget = pos.clone()
          this.attractTimer = 0
        }
      }
    )
  }

  public update(time: number, deltaTime: number) {
    const posAttr = this.geometry.getAttribute('position') as THREE.BufferAttribute

    if (this.attractTarget) {
      this.attractTimer += deltaTime
      if (this.attractTimer > 1.0) {
        this.attractTarget = null
        this.attractTimer = 0
      }
    }

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3

      this.positions[i3] += this.velocities[i3]
      this.positions[i3 + 1] += this.velocities[i3 + 1]
      this.positions[i3 + 2] += this.velocities[i3 + 2]

      this.positions[i3] += Math.sin(time * 0.3 + i * 0.01) * 0.002
      this.positions[i3 + 1] += Math.cos(time * 0.2 + i * 0.02) * 0.002
      this.positions[i3 + 2] += Math.sin(time * 0.25 + i * 0.015) * 0.002

      if (this.attractTarget) {
        const dx = this.attractTarget.x - this.positions[i3]
        const dy = this.attractTarget.y - this.positions[i3 + 1]
        const dz = this.attractTarget.z - this.positions[i3 + 2]
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
        const attractStrength = Math.max(0, 1.0 - dist * 0.1) * 0.03 * Math.sin(this.attractTimer * Math.PI)

        this.positions[i3] += dx * attractStrength
        this.positions[i3 + 1] += dy * attractStrength
        this.positions[i3 + 2] += dz * attractStrength
      } else {
        const returnStrength = 0.001
        this.positions[i3] += (this.originalPositions[i3] - this.positions[i3]) * returnStrength
        this.positions[i3 + 1] += (this.originalPositions[i3 + 1] - this.positions[i3 + 1]) * returnStrength
        this.positions[i3 + 2] += (this.originalPositions[i3 + 2] - this.positions[i3 + 2]) * returnStrength
      }
    }

    posAttr.needsUpdate = true
    this.points.rotation.y += deltaTime * 0.01
  }

  public dispose() {
    this.geometry.dispose()
    this.material.dispose()
    if (this.material.map) this.material.map.dispose()
    this.points.parent?.remove(this.points)
  }
}
