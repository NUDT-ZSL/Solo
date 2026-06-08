import * as THREE from 'three'
import type { ObstacleData } from './SoundWave'

const NEON_PINK = new THREE.Color(0xff2d95)
const NEON_BLUE = new THREE.Color(0x00d4ff)
const NEON_PURPLE = new THREE.Color(0xa855f7)
const NEON_COLORS = [NEON_PINK, NEON_BLUE, NEON_PURPLE]

interface Particle {
  position: THREE.Vector3
  velocity: THREE.Vector3
  color: THREE.Color
  size: number
  life: number
  maxLife: number
  active: boolean
  type: 'dust' | 'trail' | 'burst'
}

const VERTEX_SHADER = `
  attribute float aSize;
  attribute vec3 aColor;
  attribute float aAlpha;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vColor = aColor;
    vAlpha = aAlpha;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (250.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`

const FRAGMENT_SHADER = `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float r = distance(gl_PointCoord, vec2(0.5));
    if (r > 0.5) discard;
    float alpha = vAlpha * smoothstep(0.5, 0.1, r);
    gl_FragColor = vec4(vColor * 1.5, alpha);
  }
`

export class ParticleSystem {
  private scene: THREE.Scene
  private particles: Particle[]
  private maxParticles: number
  private points: THREE.Points
  private geometry: THREE.BufferGeometry
  private positionAttr: THREE.BufferAttribute
  private colorAttr: THREE.BufferAttribute
  private sizeAttr: THREE.BufferAttribute
  private alphaAttr: THREE.BufferAttribute
  private dustTimer = 0
  private _density = 2000

  constructor(scene: THREE.Scene, maxParticles = 5000) {
    this.scene = scene
    this.maxParticles = maxParticles
    this.particles = []

    this.geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(maxParticles * 3)
    const colors = new Float32Array(maxParticles * 3)
    const sizes = new Float32Array(maxParticles)
    const alphas = new Float32Array(maxParticles)

    this.positionAttr = new THREE.BufferAttribute(positions, 3)
    this.colorAttr = new THREE.BufferAttribute(colors, 3)
    this.sizeAttr = new THREE.BufferAttribute(sizes, 1)
    this.alphaAttr = new THREE.BufferAttribute(alphas, 1)

    this.positionAttr.setUsage(THREE.DynamicDrawUsage)
    this.colorAttr.setUsage(THREE.DynamicDrawUsage)
    this.sizeAttr.setUsage(THREE.DynamicDrawUsage)
    this.alphaAttr.setUsage(THREE.DynamicDrawUsage)

    this.geometry.setAttribute('position', this.positionAttr)
    this.geometry.setAttribute('aColor', this.colorAttr)
    this.geometry.setAttribute('aSize', this.sizeAttr)
    this.geometry.setAttribute('aAlpha', this.alphaAttr)

    const material = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })

    this.points = new THREE.Points(this.geometry, material)
    this.points.frustumCulled = false
    this.scene.add(this.points)
  }

  private getInactiveParticle(): Particle | null {
    for (const p of this.particles) {
      if (!p.active) return p
    }
    if (this.particles.length < this.maxParticles) {
      const p: Particle = {
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        color: new THREE.Color(),
        size: 1,
        life: 0,
        maxLife: 1,
        active: false,
        type: 'dust',
      }
      this.particles.push(p)
      return p
    }
    return null
  }

  emitDust(count: number) {
    for (let i = 0; i < count; i++) {
      const p = this.getInactiveParticle()
      if (!p) return
      p.active = true
      p.type = 'dust'
      p.position.set(
        (Math.random() - 0.5) * 30,
        (Math.random() - 0.5) * 15,
        (Math.random() - 0.5) * 30
      )
      p.velocity.set(
        (Math.random() - 0.5) * 0.02,
        (Math.random() - 0.5) * 0.01,
        (Math.random() - 0.5) * 0.02
      )
      p.color.copy(NEON_COLORS[Math.floor(Math.random() * 3)])
      p.size = Math.random() * 1.5 + 0.5
      p.life = 0
      p.maxLife = 5 + Math.random() * 10
    }
  }

  emitTrail(position: THREE.Vector3, direction: THREE.Vector3, color: THREE.Color, count = 3) {
    for (let i = 0; i < count; i++) {
      const p = this.getInactiveParticle()
      if (!p) return
      p.active = true
      p.type = 'trail'
      p.position.copy(position).add(
        new THREE.Vector3(
          (Math.random() - 0.5) * 0.5,
          (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.5
        )
      )
      p.velocity.copy(direction).multiplyScalar(0.3 + Math.random() * 0.3)
      p.velocity.y += (Math.random() - 0.5) * 0.1
      p.color.copy(color)
      p.size = Math.random() * 2 + 1
      p.life = 0
      p.maxLife = 1.5 + Math.random() * 1.5
    }
  }

  emitBurst(position: THREE.Vector3, color: THREE.Color, count = 50) {
    for (let i = 0; i < count; i++) {
      const p = this.getInactiveParticle()
      if (!p) return
      p.active = true
      p.type = 'burst'
      p.position.copy(position)
      const dir = new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() - 0.5,
        Math.random() - 0.5
      ).normalize()
      p.velocity.copy(dir).multiplyScalar(2 + Math.random() * 4)
      p.color.copy(color)
      p.color.lerp(NEON_COLORS[Math.floor(Math.random() * 3)], 0.3)
      p.size = Math.random() * 3 + 1.5
      p.life = 0
      p.maxLife = 1 + Math.random() * 1.5
    }
  }

  pushParticlesAway(position: THREE.Vector3, force: number, radius: number) {
    for (const p of this.particles) {
      if (!p.active) continue
      const dist = p.position.distanceTo(position)
      if (dist < radius && dist > 0.01) {
        const dir = p.position.clone().sub(position).normalize()
        p.velocity.add(dir.multiplyScalar(force * (1 - dist / radius)))
      }
    }
  }

  update(delta: number, obstacles: ObstacleData[]) {
    this.dustTimer += delta
    const dustCount = Math.floor(this._density / 500)
    if (this.dustTimer > 0.5) {
      this.dustTimer = 0
      this.emitDust(dustCount)
    }

    const activeCount = Math.min(this.particles.length, this.maxParticles)

    for (let i = 0; i < activeCount; i++) {
      const p = this.particles[i]
      if (!p.active) {
        this.positionAttr.setXYZ(i, 0, -1000, 0)
        this.alphaAttr.setX(i, 0)
        continue
      }

      p.life += delta
      if (p.life >= p.maxLife) {
        p.active = false
        this.positionAttr.setXYZ(i, 0, -1000, 0)
        this.alphaAttr.setX(i, 0)
        continue
      }

      p.position.add(p.velocity.clone().multiplyScalar(delta))

      if (p.type === 'dust') {
        p.velocity.x += (Math.random() - 0.5) * 0.001
        p.velocity.y += (Math.random() - 0.5) * 0.001
        p.velocity.z += (Math.random() - 0.5) * 0.001
        p.velocity.multiplyScalar(0.99)
      } else if (p.type === 'burst') {
        p.velocity.multiplyScalar(0.95)
      } else if (p.type === 'trail') {
        p.velocity.multiplyScalar(0.97)
      }

      const lifeRatio = p.life / p.maxLife
      const alpha = p.type === 'dust'
        ? Math.sin(lifeRatio * Math.PI) * 0.4
        : (1 - lifeRatio) * 0.8

      this.positionAttr.setXYZ(i, p.position.x, p.position.y, p.position.z)
      this.colorAttr.setXYZ(i, p.color.r, p.color.g, p.color.b)
      this.sizeAttr.setX(i, p.size * (p.type === 'burst' ? (1 + lifeRatio * 0.5) : 1))
      this.alphaAttr.setX(i, alpha)
    }

    this.positionAttr.needsUpdate = true
    this.colorAttr.needsUpdate = true
    this.sizeAttr.needsUpdate = true
    this.alphaAttr.needsUpdate = true
    this.geometry.setDrawRange(0, activeCount)
  }

  setDensity(density: number) {
    this._density = density
  }

  dispose() {
    this.scene.remove(this.points)
    this.geometry.dispose()
    ;(this.points.material as THREE.Material).dispose()
  }
}
