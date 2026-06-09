import * as THREE from 'three'

export interface ParticleData {
  position: THREE.Vector3
  velocity: THREE.Vector3
  color: THREE.Color
  life: number
  maxLife: number
}

export class ParticleSystem {
  maxParticles: number
  particles: ParticleData[]
  geometry: THREE.BufferGeometry
  material: THREE.PointsMaterial
  points: THREE.Points
  positions: Float32Array
  colors: Float32Array
  sizes: Float32Array
  nextIndex: number

  constructor(maxParticles = 1000) {
    this.maxParticles = maxParticles
    this.particles = new Array(maxParticles)
    this.nextIndex = 0

    for (let i = 0; i < maxParticles; i++) {
      this.particles[i] = {
        position: new THREE.Vector3(0, -1000, 0),
        velocity: new THREE.Vector3(),
        color: new THREE.Color(),
        life: 0,
        maxLife: 1,
      }
    }

    this.positions = new Float32Array(maxParticles * 3)
    this.colors = new Float32Array(maxParticles * 3)
    this.sizes = new Float32Array(maxParticles)

    for (let i = 0; i < maxParticles; i++) {
      this.positions[i * 3] = 0
      this.positions[i * 3 + 1] = -1000
      this.positions[i * 3 + 2] = 0
      this.sizes[i] = 0
    }

    this.geometry = new THREE.BufferGeometry()
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3))
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3))
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1))

    this.material = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    })

    this.points = new THREE.Points(this.geometry, this.material)
    this.points.frustumCulled = false
  }

  emit(
    origin: THREE.Vector3,
    baseColor: THREE.Color,
    count: number,
    options: { speed?: number; life?: number; radius?: number } = {},
  ) {
    const speed = options.speed ?? 0.1
    const life = options.life ?? 2
    const radius = options.radius ?? 0.1

    const actualCount = Math.min(count, this.maxParticles, 50)

    for (let i = 0; i < actualCount; i++) {
      const idx = this.nextIndex
      this.nextIndex = (this.nextIndex + 1) % this.maxParticles

      const p = this.particles[idx]

      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = radius * Math.cbrt(Math.random())

      const ox = r * Math.sin(phi) * Math.cos(theta)
      const oy = r * Math.sin(phi) * Math.sin(theta) + 0.05
      const oz = r * Math.cos(phi)

      p.position.set(origin.x + ox, origin.y + oy, origin.z + oz)

      const vtheta = Math.random() * Math.PI * 2
      const vphi = Math.acos(2 * Math.random() - 1)
      const vmag = speed * (0.5 + Math.random() * 0.8)

      p.velocity.set(
        vmag * Math.sin(vphi) * Math.cos(vtheta),
        Math.abs(vmag * Math.sin(vphi) * Math.sin(vtheta)) * 0.5 + vmag * 0.3,
        vmag * Math.cos(vphi),
      )

      const hueShift = (Math.random() - 0.5) * 0.08
      const tempColor = baseColor.clone()
      const hsl = { h: 0, s: 0, l: 0 }
      tempColor.getHSL(hsl)
      hsl.h = (hsl.h + hueShift + 1) % 1
      hsl.l = Math.min(0.9, hsl.l + Math.random() * 0.2)
      tempColor.setHSL(hsl.h, hsl.s, hsl.l)
      p.color.copy(tempColor)

      p.maxLife = life * (0.7 + Math.random() * 0.6)
      p.life = p.maxLife
    }
  }

  update(dt: number) {
    for (let i = 0; i < this.maxParticles; i++) {
      const p = this.particles[i]

      if (p.life > 0) {
        p.life -= dt
        if (p.life <= 0) {
          p.life = 0
          this.positions[i * 3 + 1] = -1000
          this.sizes[i] = 0
          continue
        }

        p.velocity.y -= 0.02 * dt
        p.position.addScaledVector(p.velocity, dt * 60)

        const lifeRatio = p.life / p.maxLife
        const easedRatio = lifeRatio * lifeRatio * (3 - 2 * lifeRatio)

        this.positions[i * 3] = p.position.x
        this.positions[i * 3 + 1] = p.position.y
        this.positions[i * 3 + 2] = p.position.z

        this.colors[i * 3] = p.color.r * easedRatio
        this.colors[i * 3 + 1] = p.color.g * easedRatio
        this.colors[i * 3 + 2] = p.color.b * easedRatio

        this.sizes[i] = 0.04 * easedRatio
      }
    }

    this.geometry.attributes.position.needsUpdate = true
    this.geometry.attributes.color.needsUpdate = true
    this.geometry.attributes.size.needsUpdate = true
  }

  dispose() {
    this.geometry.dispose()
    this.material.dispose()
  }
}

export default ParticleSystem
