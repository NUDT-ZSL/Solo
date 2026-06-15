import * as THREE from 'three'

const SPARK_COUNT = 600
const SMOKE_COUNT = 200
const ERUPTION_COUNT = 400
const TOTAL_COUNT = SPARK_COUNT + SMOKE_COUNT + ERUPTION_COUNT

const PARTICLE_VERTEX = `
  attribute float aLife;
  attribute float aSize;
  attribute vec3 aColor;
  varying float vLife;
  varying vec3 vColor;
  void main() {
    vLife = aLife;
    vColor = aColor;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (200.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`

const PARTICLE_FRAGMENT = `
  varying float vLife;
  varying vec3 vColor;
  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;
    float alpha = smoothstep(0.5, 0.0, dist) * vLife;
    gl_FragColor = vec4(vColor * (1.0 + vLife * 0.5), alpha);
  }
`

interface ParticleData {
  position: Float32Array
  velocity: Float32Array
  life: Float32Array
  maxLife: Float32Array
  size: Float32Array
  color: Float32Array
}

export class ParticleSystem {
  private geometry: THREE.BufferGeometry
  private material: THREE.ShaderMaterial
  private points: THREE.Points
  private data: ParticleData
  private scene: THREE.Scene
  private eruptionOrigin: THREE.Vector3 | null = null
  private eruptionActive: boolean = false
  private eruptionTimer: number = 0

  constructor(scene: THREE.Scene) {
    this.scene = scene

    const position = new Float32Array(TOTAL_COUNT * 3)
    const velocity = new Float32Array(TOTAL_COUNT * 3)
    const life = new Float32Array(TOTAL_COUNT)
    const maxLife = new Float32Array(TOTAL_COUNT)
    const size = new Float32Array(TOTAL_COUNT)
    const color = new Float32Array(TOTAL_COUNT * 3)

    for (let i = 0; i < TOTAL_COUNT; i++) {
      const i3 = i * 3
      position[i3] = 0
      position[i3 + 1] = -100
      position[i3 + 2] = 0
      velocity[i3] = 0
      velocity[i3 + 1] = 0
      velocity[i3 + 2] = 0
      life[i] = 0
      maxLife[i] = 1
      size[i] = 0

      if (i < SPARK_COUNT) {
        color[i3] = 1.0
        color[i3 + 1] = 0.6
        color[i3 + 2] = 0.1
      } else if (i < SPARK_COUNT + SMOKE_COUNT) {
        color[i3] = 0.35
        color[i3 + 1] = 0.3
        color[i3 + 2] = 0.25
      } else {
        color[i3] = 1.0
        color[i3 + 1] = 0.8
        color[i3 + 2] = 0.2
      }
    }

    this.data = { position, velocity, life, maxLife, size, color }

    this.geometry = new THREE.BufferGeometry()
    this.geometry.setAttribute('position', new THREE.BufferAttribute(position, 3))
    this.geometry.setAttribute('aLife', new THREE.BufferAttribute(life, 1))
    this.geometry.setAttribute('aSize', new THREE.BufferAttribute(size, 1))
    this.geometry.setAttribute('aColor', new THREE.BufferAttribute(color, 3))

    this.material = new THREE.ShaderMaterial({
      vertexShader: PARTICLE_VERTEX,
      fragmentShader: PARTICLE_FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })

    this.points = new THREE.Points(this.geometry, this.material)
    this.scene.add(this.points)
  }

  triggerEruption(origin: THREE.Vector3) {
    this.eruptionOrigin = origin.clone()
    this.eruptionActive = true
    this.eruptionTimer = 1.5

    for (let i = SPARK_COUNT + SMOKE_COUNT; i < TOTAL_COUNT; i++) {
      this.emitEruptionParticle(i, origin)
    }
  }

  private emitEruptionParticle(idx: number, origin: THREE.Vector3) {
    const i3 = idx * 3
    this.data.position[i3] = origin.x + (Math.random() - 0.5) * 0.3
    this.data.position[i3 + 1] = origin.y
    this.data.position[i3 + 2] = origin.z + (Math.random() - 0.5) * 0.3

    const speed = 3 + Math.random() * 5
    const theta = Math.random() * Math.PI * 2
    const phi = Math.random() * Math.PI * 0.4
    this.data.velocity[i3] = Math.sin(phi) * Math.cos(theta) * speed
    this.data.velocity[i3 + 1] = Math.cos(phi) * speed
    this.data.velocity[i3 + 2] = Math.sin(phi) * Math.sin(theta) * speed

    this.data.life[idx] = 1.0
    this.data.maxLife[idx] = 0.8 + Math.random() * 1.0
    this.data.size[idx] = 2.0 + Math.random() * 4.0

    this.data.color[i3] = 1.0
    this.data.color[i3 + 1] = 0.7 + Math.random() * 0.3
    this.data.color[i3 + 2] = 0.1 + Math.random() * 0.3
  }

  private emitSpark(idx: number, lavaPositions: THREE.Vector3[]) {
    if (lavaPositions.length === 0) return
    const src = lavaPositions[Math.floor(Math.random() * lavaPositions.length)]
    const i3 = idx * 3
    this.data.position[i3] = src.x + (Math.random() - 0.5) * 0.3
    this.data.position[i3 + 1] = src.y + 0.1
    this.data.position[i3 + 2] = src.z + (Math.random() - 0.5) * 0.3

    this.data.velocity[i3] = (Math.random() - 0.5) * 1.5
    this.data.velocity[i3 + 1] = 1.0 + Math.random() * 3.0
    this.data.velocity[i3 + 2] = (Math.random() - 0.5) * 1.5

    this.data.life[idx] = 1.0
    this.data.maxLife[idx] = 0.4 + Math.random() * 0.8
    this.data.size[idx] = 1.0 + Math.random() * 2.0
  }

  private emitSmoke(idx: number, lavaPositions: THREE.Vector3[]) {
    if (lavaPositions.length === 0) return
    const src = lavaPositions[Math.floor(Math.random() * lavaPositions.length)]
    const i3 = idx * 3
    this.data.position[i3] = src.x + (Math.random() - 0.5) * 1.0
    this.data.position[i3 + 1] = src.y + 0.5
    this.data.position[i3 + 2] = src.z + (Math.random() - 0.5) * 1.0

    this.data.velocity[i3] = (Math.random() - 0.5) * 0.3
    this.data.velocity[i3 + 1] = 0.3 + Math.random() * 0.5
    this.data.velocity[i3 + 2] = (Math.random() - 0.5) * 0.3

    this.data.life[idx] = 1.0
    this.data.maxLife[idx] = 2.0 + Math.random() * 3.0
    this.data.size[idx] = 3.0 + Math.random() * 5.0

    this.data.color[i3] = 0.3 + Math.random() * 0.15
    this.data.color[i3 + 1] = 0.25 + Math.random() * 0.1
    this.data.color[i3 + 2] = 0.2 + Math.random() * 0.1
  }

  update(delta: number, lavaPositions: THREE.Vector3[]) {
    if (this.eruptionActive) {
      this.eruptionTimer -= delta
      if (this.eruptionTimer <= 0) {
        this.eruptionActive = false
      }
    }

    for (let i = 0; i < TOTAL_COUNT; i++) {
      const i3 = i * 3
      this.data.life[i] -= delta / this.data.maxLife[i]

      if (this.data.life[i] <= 0) {
        if (i < SPARK_COUNT) {
          if (Math.random() < 0.3) this.emitSpark(i, lavaPositions)
        } else if (i < SPARK_COUNT + SMOKE_COUNT) {
          if (Math.random() < 0.1) this.emitSmoke(i, lavaPositions)
        } else {
          this.data.position[i3 + 1] = -100
          this.data.life[i] = 0
        }
        continue
      }

      this.data.position[i3] += this.data.velocity[i3] * delta
      this.data.position[i3 + 1] += this.data.velocity[i3 + 1] * delta
      this.data.position[i3 + 2] += this.data.velocity[i3 + 2] * delta

      if (i < SPARK_COUNT || i >= SPARK_COUNT + SMOKE_COUNT) {
        this.data.velocity[i3 + 1] -= 4.0 * delta
      }

      if (i >= SPARK_COUNT && i < SPARK_COUNT + SMOKE_COUNT) {
        this.data.velocity[i3] *= 0.98
        this.data.velocity[i3 + 2] *= 0.98
        this.data.size[i] += delta * 0.5
      }
    }

    this.geometry.attributes.position.needsUpdate = true
    this.geometry.attributes.aLife.needsUpdate = true
    this.geometry.attributes.aSize.needsUpdate = true
    this.geometry.attributes.aColor.needsUpdate = true
  }

  dispose() {
    this.scene.remove(this.points)
    this.geometry.dispose()
    this.material.dispose()
  }
}
