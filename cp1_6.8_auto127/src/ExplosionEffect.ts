import * as THREE from 'three'

const EXPLOSION_PARTICLE_COUNT = 60
const EXPLOSION_DURATION = 1.5
const MAX_EXPLOSIONS = 8

const explosionVertexShader = `
  attribute float aAlpha;
  attribute float aSize;
  attribute vec3 aExpColor;
  varying float vAlpha;
  varying vec3 vExpColor;
  void main() {
    vAlpha = aAlpha;
    vExpColor = aExpColor;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (150.0 / -mvPosition.z);
    gl_PointSize = max(gl_PointSize, 0.5);
    gl_Position = projectionMatrix * mvPosition;
  }
`

const explosionFragmentShader = `
  varying float vAlpha;
  varying vec3 vExpColor;
  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.5) discard;
    float glow = 1.0 - smoothstep(0.0, 0.5, d);
    float core = 1.0 - smoothstep(0.0, 0.1, d);
    vec3 col = mix(vExpColor, vec3(1.0), core * 0.8);
    gl_FragColor = vec4(col, vAlpha * glow);
  }
`

interface Explosion {
  id: string
  position: THREE.Vector3
  particles: {
    velocity: THREE.Vector3
    baseSize: number
  }[]
  elapsed: number
  color: THREE.Color
  bufferIndex: number
}

export class ExplosionEffect {
  private explosions: Explosion[] = []
  private points: THREE.Points
  private material: THREE.ShaderMaterial
  private group: THREE.Group
  private idCounter = 0
  private nextBufferIndex = 0

  constructor() {
    this.group = new THREE.Group()
    this.material = new THREE.ShaderMaterial({
      vertexShader: explosionVertexShader,
      fragmentShader: explosionFragmentShader,
      uniforms: {},
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    this.points = this.createParticleSystem()
    this.group.add(this.points)
  }

  private createParticleSystem(): THREE.Points {
    const totalParticles = MAX_EXPLOSIONS * EXPLOSION_PARTICLE_COUNT
    const positions = new Float32Array(totalParticles * 3)
    const alphas = new Float32Array(totalParticles)
    const sizes = new Float32Array(totalParticles)
    const colors = new Float32Array(totalParticles * 3)
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1))
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
    geo.setAttribute('aExpColor', new THREE.BufferAttribute(colors, 3))
    geo.setDrawRange(0, 0)
    return new THREE.Points(geo, this.material)
  }

  spawnExplosion(position: THREE.Vector3, color: THREE.Color) {
    if (this.explosions.length >= MAX_EXPLOSIONS) {
      const oldest = this.explosions.shift()
      if (oldest) {
        this.clearBufferSlot(oldest.bufferIndex)
      }
    }

    const id = `explosion_${this.idCounter++}`
    const bufferIndex = this.nextBufferIndex
    this.nextBufferIndex = (this.nextBufferIndex + 1) % MAX_EXPLOSIONS

    const particles = []
    for (let i = 0; i < EXPLOSION_PARTICLE_COUNT; i++) {
      const dir = new THREE.Vector3(
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
        Math.random() * 2 - 1
      ).normalize()
      const speed = 8 + Math.random() * 20
      dir.multiplyScalar(speed)
      particles.push({
        velocity: dir,
        baseSize: 1.5 + Math.random() * 3,
      })
    }

    this.explosions.push({
      id,
      position: position.clone(),
      particles,
      elapsed: 0,
      color: color.clone(),
      bufferIndex,
    })
  }

  private clearBufferSlot(bufferIndex: number) {
    const geo = this.points.geometry
    const posAttr = geo.getAttribute('position') as THREE.BufferAttribute
    const alphaAttr = geo.getAttribute('aAlpha') as THREE.BufferAttribute
    const sizeAttr = geo.getAttribute('aSize') as THREE.BufferAttribute
    const colorAttr = geo.getAttribute('aExpColor') as THREE.BufferAttribute
    const base = bufferIndex * EXPLOSION_PARTICLE_COUNT
    for (let i = 0; i < EXPLOSION_PARTICLE_COUNT; i++) {
      const gi = base + i
      posAttr.setXYZ(gi, 0, 0, 0)
      alphaAttr.setX(gi, 0)
      sizeAttr.setX(gi, 0)
      colorAttr.setXYZ(gi, 0, 0, 0)
    }
    posAttr.needsUpdate = true
    alphaAttr.needsUpdate = true
    sizeAttr.needsUpdate = true
    colorAttr.needsUpdate = true
  }

  update(delta: number) {
    const geo = this.points.geometry
    const posAttr = geo.getAttribute('position') as THREE.BufferAttribute
    const alphaAttr = geo.getAttribute('aAlpha') as THREE.BufferAttribute
    const sizeAttr = geo.getAttribute('aSize') as THREE.BufferAttribute
    const colorAttr = geo.getAttribute('aExpColor') as THREE.BufferAttribute

    let hasActive = false

    for (let ei = this.explosions.length - 1; ei >= 0; ei--) {
      const explosion = this.explosions[ei]
      explosion.elapsed += delta

      if (explosion.elapsed >= EXPLOSION_DURATION) {
        this.clearBufferSlot(explosion.bufferIndex)
        this.explosions.splice(ei, 1)
        continue
      }

      hasActive = true
      const progress = explosion.elapsed / EXPLOSION_DURATION
      const fadeOut = 1.0 - progress
      const flash = progress < 0.2 ? (0.2 - progress) / 0.2 : 0
      const base = explosion.bufferIndex * EXPLOSION_PARTICLE_COUNT

      for (let i = 0; i < EXPLOSION_PARTICLE_COUNT; i++) {
        const p = explosion.particles[i]
        const gi = base + i
        const t = explosion.elapsed
        const decel = 1.0 / (1.0 + t * 2.0)
        const px = explosion.position.x + p.velocity.x * t * decel
        const py = explosion.position.y + p.velocity.y * t * decel
        const pz = explosion.position.z + p.velocity.z * t * decel
        posAttr.setXYZ(gi, px, py, pz)
        const alpha = fadeOut * (0.6 + flash * 0.4) * (0.5 + Math.random() * 0.1)
        alphaAttr.setX(gi, alpha)
        const sz = p.baseSize * (fadeOut * 0.7 + 0.3) * (1.0 + flash * 2.0)
        sizeAttr.setX(gi, sz)
        const cBlend = progress
        colorAttr.setXYZ(
          gi,
          explosion.color.r * (1 - cBlend) + 1.0 * cBlend * fadeOut,
          explosion.color.g * (1 - cBlend) + 0.9 * cBlend * fadeOut,
          explosion.color.b * (1 - cBlend) + 0.7 * cBlend * fadeOut
        )
      }
    }

    posAttr.needsUpdate = true
    alphaAttr.needsUpdate = true
    sizeAttr.needsUpdate = true
    colorAttr.needsUpdate = true

    const totalParticles = MAX_EXPLOSIONS * EXPLOSION_PARTICLE_COUNT
    geo.setDrawRange(0, hasActive ? totalParticles : 0)
  }

  reset() {
    this.explosions.forEach((e) => this.clearBufferSlot(e.bufferIndex))
    this.explosions = []
    this.idCounter = 0
    this.nextBufferIndex = 0
  }

  getObject(): THREE.Group {
    return this.group
  }

  dispose() {
    this.points.geometry.dispose()
    this.material.dispose()
  }
}
