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

export class ParticleSystem {
  private count: number
  private geometry: THREE.BufferGeometry
  private material: THREE.PointsMaterial
  private points: THREE.Points
  private particles: ParticleData[] = []
  private mode: ParticleMode = 'spiral'
  private rotationSpeed = 0.02
  private highlightedIndex: number | null = null
  private highlightTime = 0
  private isTransitioning = false
  private transitionProgress = 0
  private transitionDuration = 2
  private repelCenter: THREE.Vector3 | null = null
  private repelRadius = 20
  private repelStrength = 0

  constructor(count: number) {
    this.count = count
    this.geometry = new THREE.BufferGeometry()
    this.material = new THREE.PointsMaterial({
      size: 6,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    })
    this.points = new THREE.Points(this.geometry, this.material)
    this.points.frustumCulled = true
    this.points.matrixAutoUpdate = false

    this.initParticles()
    this.generateSpiral()
    this.updateGeometry()
  }

  private initParticles(): void {
    for (let i = 0; i < this.count; i++) {
      this.particles.push({
        id: i,
        basePosition: new THREE.Vector3(),
        targetPosition: new THREE.Vector3(),
        currentPosition: new THREE.Vector3(),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.1,
          (Math.random() - 0.5) * 0.1,
          (Math.random() - 0.5) * 0.1
        ),
        baseSize: 2 + Math.random() * 4,
        baseColor: new THREE.Color(),
        wobbleOffset: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.5 + Math.random() * 1.5,
        wobbleRadius: 0.2 + Math.random() * 0.5
      })
    }
  }

  private generateSpiral(): void {
    const arms = 4
    const armSpread = 0.5
    const coreRadius = 5
    const maxRadius = 40

    for (let i = 0; i < this.count; i++) {
      const particle = this.particles[i]
      const t = i / this.count
      const arm = Math.floor(Math.random() * arms)
      const armAngle = (arm / arms) * Math.PI * 2
      
      const radiusFactor = Math.pow(t, 0.7)
      const radius = coreRadius + radiusFactor * (maxRadius - coreRadius)
      const spiralAngle = radius * 0.15 + armAngle
      
      const spread = (1 - t) * 0.3 + armSpread * t
      const offsetAngle = (Math.random() - 0.5) * spread
      const offsetRadius = (Math.random() - 0.5) * 2

      const finalRadius = radius + offsetRadius
      const finalAngle = spiralAngle + offsetAngle
      const height = (Math.random() - 0.5) * 8 * (1 - t * 0.8)

      particle.targetPosition.set(
        Math.cos(finalAngle) * finalRadius,
        height,
        Math.sin(finalAngle) * finalRadius
      )

      particle.basePosition.copy(particle.targetPosition)
      particle.currentPosition.copy(particle.targetPosition)

      const distanceFactor = radius / maxRadius
      particle.baseSize = 6 - distanceFactor * 4
      particle.baseColor.setHSL(0.15 - distanceFactor * 0.25, 0.9, 0.5 + distanceFactor * 0.2)
    }
  }

  private generateSphere(): void {
    const maxRadius = 35

    for (let i = 0; i < this.count; i++) {
      const particle = this.particles[i]
      const t = i / this.count
      
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
      particle.baseSize = 6 - distanceFactor * 4
      particle.baseColor.setHSL(0.15 - distanceFactor * 0.25, 0.9, 0.5 + distanceFactor * 0.2)
    }
  }

  private generateExplosion(): void {
    const maxRadius = 45

    for (let i = 0; i < this.count; i++) {
      const particle = this.particles[i]
      
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const radius = Math.random() * maxRadius

      particle.targetPosition.set(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi)
      )

      particle.basePosition.copy(particle.targetPosition)
      particle.currentPosition.copy(particle.targetPosition)

      const distanceFactor = radius / maxRadius
      particle.baseSize = 2 + Math.random() * 4
      particle.baseColor.setHSL(0.05 - distanceFactor * 0.1, 0.95, 0.5 + distanceFactor * 0.15)
    }
  }

  private generateRandom(): void {
    const range = 50

    for (let i = 0; i < this.count; i++) {
      const particle = this.particles[i]

      particle.targetPosition.set(
        (Math.random() - 0.5) * range * 2,
        (Math.random() - 0.5) * range * 2,
        (Math.random() - 0.5) * range * 2
      )

      particle.basePosition.copy(particle.targetPosition)
      particle.currentPosition.copy(particle.targetPosition)

      const distance = particle.targetPosition.length()
      const distanceFactor = Math.min(distance / 50, 1)
      particle.baseSize = 6 - distanceFactor * 4
      particle.baseColor.setHSL(Math.random() * 0.6 + 0.1, 0.85, 0.6)
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

  highlightParticle(index: number): void {
    if (this.highlightedIndex === index) return
    this.highlightedIndex = index
    this.highlightTime = 0.2
    this.repelCenter = this.particles[index].currentPosition.clone()
    this.repelStrength = 1
  }

  resetHighlight(): void {
    this.highlightedIndex = null
    this.repelStrength = 0
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

    this.material.size = 40 * (cameraDistance / 50)

    if (this.isTransitioning) {
      this.transitionProgress += delta / this.transitionDuration
      if (this.transitionProgress >= 1) {
        this.transitionProgress = 1
        this.isTransitioning = false
      }
    }

    if (this.highlightTime > 0) {
      this.highlightTime -= delta
      if (this.highlightTime <= 0) {
        this.highlightedIndex = null
      }
    }

    if (this.repelStrength > 0 && !this.repelCenter) {
      this.repelStrength = Math.max(0, this.repelStrength - delta * 3)
    }

    const positions = new Float32Array(this.count * 3)
    const colors = new Float32Array(this.count * 3)
    const sizes = new Float32Array(this.count)

    for (let i = 0; i < this.count; i++) {
      const particle = this.particles[i]

      if (this.isTransitioning) {
        const t = this.transitionProgress
        const waveOffset = (i / this.count) * Math.PI * 4
        const waveT = (t + waveOffset) % 1
        const easeT = Math.sin(waveT * Math.PI)
        particle.currentPosition.lerpVectors(
          particle.basePosition,
          particle.targetPosition,
          Math.min(1, Math.max(0, t + (easeT - 0.5) * 0.3))
        )
      } else {
        const wobbleAngle = time * particle.wobbleSpeed + particle.wobbleOffset
        const wobbleX = Math.cos(wobbleAngle) * particle.wobbleRadius
        const wobbleY = Math.sin(wobbleAngle * 0.7) * particle.wobbleRadius * 0.5
        const wobbleZ = Math.sin(wobbleAngle * 1.3) * particle.wobbleRadius * 0.5

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
        const diff = particle.currentPosition.clone().sub(this.repelCenter)
        const dist = diff.length()
        if (dist < this.repelRadius && dist > 0.1) {
          const force = (1 - dist / this.repelRadius) * this.repelStrength * 2
          diff.normalize().multiplyScalar(force)
          particle.currentPosition.add(diff)
        }
      }

      const finalPos = particle.currentPosition
      positions[i * 3] = finalPos.x
      positions[i * 3 + 1] = finalPos.y
      positions[i * 3 + 2] = finalPos.z

      let size = particle.baseSize
      let color = particle.baseColor

      if (this.highlightedIndex === i) {
        size *= 1.5
        color = new THREE.Color(0xffffff)
      }

      sizes[i] = size
      colors[i * 3] = color.r
      colors[i * 3 + 1] = color.g
      colors[i * 3 + 2] = color.b
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    this.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
    this.geometry.attributes.position.needsUpdate = true
    this.geometry.attributes.color.needsUpdate = true
    this.geometry.attributes.size.needsUpdate = true

    this.points.updateMatrix()
  }

  private updateGeometry(): void {
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
