import * as THREE from 'three'

export type ParticleMode = 'spiral' | 'sphere' | 'explosion' | 'random'

interface ParticleData {
  id: number
  basePosition: THREE.Vector3
  targetPosition: THREE.Vector3
  currentPosition: THREE.Vector3
  velocity: THREE.Vector3
  baseSize: number
  baseColor: THREE.Color
  wobbleOffset: number
  wobbleSpeed: number
  wobbleRadius: number
}

const vertexShader = `
  attribute float size;
  attribute vec3 color;
  varying vec3 vColor;
  varying float vSize;

  void main() {
    vColor = color;
    vSize = size;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`

const fragmentShader = `
  varying vec3 vColor;
  varying float vSize;

  void main() {
    vec2 center = gl_PointCoord - vec2(0.5);
    float dist = length(center);
    if (dist > 0.5) discard;
    
    float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
    alpha = pow(alpha, 1.5);
    
    float glow = (1.0 - dist * 2.0) * 0.5;
    vec3 finalColor = vColor + glow * vColor;
    
    gl_FragColor = vec4(finalColor, alpha);
  }
`

export class ParticleSystem {
  private count: number
  private geometry: THREE.BufferGeometry
  private material: THREE.ShaderMaterial
  private points: THREE.Points
  private particles: ParticleData[] = []
  private mode: ParticleMode = 'spiral'
  private rotationSpeed = 0.02
  private highlightedIndex: number | null = null
  private isTransitioning = false
  private transitionProgress = 0
  private transitionDuration = 2
  private repelCenter: THREE.Vector3 | null = null
  private repelRadius = 20
  private repelStrength = 0
  private sizeScale = 1

  constructor(count: number) {
    this.count = count
    this.geometry = new THREE.BufferGeometry()

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      uniforms: {}
    })

    this.points = new THREE.Points(this.geometry, this.material)
    this.points.frustumCulled = false

    this.initParticles()
    this.generateMode('spiral')
    this.commitGeometry()
  }

  private initParticles(): void {
    for (let i = 0; i < this.count; i++) {
      this.particles.push({
        id: i,
        basePosition: new THREE.Vector3(),
        targetPosition: new THREE.Vector3(),
        currentPosition: new THREE.Vector3(),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.01,
          (Math.random() - 0.5) * 0.01,
          (Math.random() - 0.5) * 0.01
        ),
        baseSize: 1,
        baseColor: new THREE.Color(),
        wobbleOffset: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.5 + Math.random() * 1.5,
        wobbleRadius: 0.3 + Math.random() * 0.8
      })
    }
  }

  private generateSpiral(): void {
    const arms = 4
    const armSpread = 0.6
    const coreRadius = 3
    const maxRadius = 35

    for (let i = 0; i < this.count; i++) {
      const particle = this.particles[i]
      const t = i / this.count
      const arm = Math.floor(Math.random() * arms)
      const armAngle = (arm / arms) * Math.PI * 2

      const radiusFactor = Math.pow(t, 0.65)
      const radius = coreRadius + radiusFactor * (maxRadius - coreRadius)
      const spiralAngle = radius * 0.18 + armAngle

      const spread = (1 - t) * 0.2 + armSpread * t
      const offsetAngle = (Math.random() - 0.5) * spread
      const offsetRadius = (Math.random() - 0.5) * 1.5

      const finalRadius = radius + offsetRadius
      const finalAngle = spiralAngle + offsetAngle
      const height = (Math.random() - 0.5) * 6 * (1 - t * 0.85)

      particle.targetPosition.set(
        Math.cos(finalAngle) * finalRadius,
        height,
        Math.sin(finalAngle) * finalRadius
      )

      particle.basePosition.copy(particle.targetPosition)
      particle.currentPosition.copy(particle.targetPosition)

      const distanceFactor = radius / maxRadius
      particle.baseSize = 6 - distanceFactor * 4
      particle.baseColor.setHSL(0.12 - distanceFactor * 0.22, 0.95, 0.55 + distanceFactor * 0.15)
    }
  }

  private generateSphere(): void {
    const maxRadius = 30

    for (let i = 0; i < this.count; i++) {
      const particle = this.particles[i]

      const u = Math.random()
      const v = Math.random()
      const theta = 2 * Math.PI * u
      const phi = Math.acos(2 * v - 1)

      const radiusFactor = Math.pow(Math.random(), 1 / 3)
      const radius = radiusFactor * maxRadius

      particle.targetPosition.set(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi)
      )

      particle.basePosition.copy(particle.targetPosition)
      particle.currentPosition.copy(particle.targetPosition)

      const distanceFactor = radius / maxRadius
      particle.baseSize = 5.5 - distanceFactor * 3.5
      particle.baseColor.setHSL(0.12 - distanceFactor * 0.22, 0.9, 0.55 + distanceFactor * 0.15)
    }
  }

  private generateExplosion(): void {
    const maxRadius = 40

    for (let i = 0; i < this.count; i++) {
      const particle = this.particles[i]

      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const radius = Math.pow(Math.random(), 0.5) * maxRadius

      particle.targetPosition.set(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi)
      )

      particle.basePosition.copy(particle.targetPosition)
      particle.currentPosition.copy(particle.targetPosition)

      const distanceFactor = radius / maxRadius
      particle.baseSize = 2 + Math.random() * 3
      particle.baseColor.setHSL(0.03 + (1 - distanceFactor) * 0.08, 1, 0.5 + distanceFactor * 0.15)
    }
  }

  private generateRandom(): void {
    const range = 40

    for (let i = 0; i < this.count; i++) {
      const particle = this.particles[i]

      particle.targetPosition.set(
        (Math.random() - 0.5) * range * 2,
        (Math.random() - 0.5) * range * 0.6,
        (Math.random() - 0.5) * range * 2
      )

      particle.basePosition.copy(particle.targetPosition)
      particle.currentPosition.copy(particle.targetPosition)

      const distance = particle.targetPosition.length()
      const distanceFactor = Math.min(distance / 50, 1)
      particle.baseSize = 5 - distanceFactor * 2.5
      particle.baseColor.setHSL(Math.random() * 0.55 + 0.05, 0.85, 0.6)
    }
  }

  private generateMode(mode: ParticleMode): void {
    switch (mode) {
      case 'spiral':
        this.generateSpiral()
        break
      case 'sphere':
        this.generateSphere()
        break
      case 'explosion':
        this.generateExplosion()
        break
      case 'random':
        this.generateRandom()
        break
    }
  }

  switchMode(mode: ParticleMode): void {
    if (this.mode === mode) return

    this.mode = mode
    this.isTransitioning = true
    this.transitionProgress = 0

    for (const particle of this.particles) {
      particle.basePosition.copy(particle.currentPosition)
    }

    this.generateMode(mode)
  }

  highlightParticle(index: number): void {
    this.highlightedIndex = index
  }

  resetHighlight(): void {
    this.highlightedIndex = null
  }

  setRepelCenter(position: THREE.Vector3 | null): void {
    if (position) {
      this.repelCenter = position.clone()
      this.repelStrength = 1
    } else {
      this.repelStrength = 0
    }
  }

  getParticleData(index: number): { id: number; position: THREE.Vector3; velocity: THREE.Vector3 } | null {
    if (index < 0 || index >= this.particles.length) return null
    const particle = this.particles[index]
    return {
      id: particle.id,
      position: particle.currentPosition.clone(),
      velocity: particle.velocity.clone()
    }
  }

  update(delta: number, cameraDistance: number): void {
    const time = performance.now() * 0.001

    this.sizeScale = cameraDistance / 50

    if (this.isTransitioning) {
      this.transitionProgress += delta / this.transitionDuration
      if (this.transitionProgress >= 1) {
        this.transitionProgress = 1
        this.isTransitioning = false
      }
    }

    if (this.repelStrength > 0 && !this.repelCenter) {
      this.repelStrength = Math.max(0, this.repelStrength - delta * 2)
    }

    const positions = this.geometry.attributes.position.array as Float32Array
    const colors = this.geometry.attributes.color.array as Float32Array
    const sizes = this.geometry.attributes.size.array as Float32Array

    for (let i = 0; i < this.count; i++) {
      const particle = this.particles[i]

      if (this.isTransitioning) {
        const t = this.transitionProgress
        const waveOffset = (i / this.count) * Math.PI * 6
        const waveT = Math.min(1, Math.max(0, t * 1.2 - waveOffset * 0.08))
        const easeT = Math.sin(waveT * Math.PI)
        const progress = easeT

        particle.currentPosition.lerpVectors(
          particle.basePosition,
          particle.targetPosition,
          progress
        )
      } else {
        const wobbleAngle = time * particle.wobbleSpeed + particle.wobbleOffset
        const wobbleX = Math.cos(wobbleAngle) * particle.wobbleRadius
        const wobbleY = Math.sin(wobbleAngle * 0.7) * particle.wobbleRadius * 0.4
        const wobbleZ = Math.sin(wobbleAngle * 1.2) * particle.wobbleRadius * 0.4

        particle.currentPosition.copy(particle.targetPosition)
        particle.currentPosition.x += wobbleX
        particle.currentPosition.y += wobbleY
        particle.currentPosition.z += wobbleZ

        const rotationAngle = this.rotationSpeed * delta
        const cos = Math.cos(rotationAngle)
        const sin = Math.sin(rotationAngle)
        const x = particle.currentPosition.x
        const z = particle.currentPosition.z
        particle.currentPosition.x = x * cos - z * sin
        particle.currentPosition.z = x * sin + z * cos
      }

      if (this.repelCenter && this.repelStrength > 0) {
        const dx = particle.currentPosition.x - this.repelCenter.x
        const dy = particle.currentPosition.y - this.repelCenter.y
        const dz = particle.currentPosition.z - this.repelCenter.z
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)

        if (dist < this.repelRadius && dist > 0.1) {
          const force = (1 - dist / this.repelRadius) * this.repelStrength * 3
          const invDist = 1 / dist
          particle.currentPosition.x += dx * invDist * force
          particle.currentPosition.y += dy * invDist * force
          particle.currentPosition.z += dz * invDist * force
        }
      }

      positions[i * 3] = particle.currentPosition.x
      positions[i * 3 + 1] = particle.currentPosition.y
      positions[i * 3 + 2] = particle.currentPosition.z

      let size = particle.baseSize * this.sizeScale
      let colorR = particle.baseColor.r
      let colorG = particle.baseColor.g
      let colorB = particle.baseColor.b

      if (this.highlightedIndex === i) {
        size *= 1.8
        colorR = 1
        colorG = 1
        colorB = 1
      }

      sizes[i] = size
      colors[i * 3] = colorR
      colors[i * 3 + 1] = colorG
      colors[i * 3 + 2] = colorB
    }

    this.geometry.attributes.position.needsUpdate = true
    this.geometry.attributes.color.needsUpdate = true
    this.geometry.attributes.size.needsUpdate = true
  }

  private commitGeometry(): void {
    const positions = new Float32Array(this.count * 3)
    const colors = new Float32Array(this.count * 3)
    const sizes = new Float32Array(this.count)

    for (let i = 0; i < this.count; i++) {
      const particle = this.particles[i]
      positions[i * 3] = particle.currentPosition.x
      positions[i * 3 + 1] = particle.currentPosition.y
      positions[i * 3 + 2] = particle.currentPosition.z
      colors[i * 3] = particle.baseColor.r
      colors[i * 3 + 1] = particle.baseColor.g
      colors[i * 3 + 2] = particle.baseColor.b
      sizes[i] = particle.baseSize
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    this.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
  }

  getPoints(): THREE.Points {
    return this.points
  }

  getCount(): number {
    return this.count
  }

  getMode(): ParticleMode {
    return this.mode
  }

  getGeometry(): THREE.BufferGeometry {
    return this.geometry
  }

  dispose(): void {
    this.geometry.dispose()
    this.material.dispose()
  }
}
