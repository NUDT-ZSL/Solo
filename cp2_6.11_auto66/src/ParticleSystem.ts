import * as THREE from 'three'

export type MotionMode = 'spiral' | 'wave' | 'random'

export interface Particle {
  position: THREE.Vector3
  velocity: THREE.Vector3
  basePosition: THREE.Vector3
  color: THREE.Color
  isSecondary: boolean
  phase: number
  speed: number
  size: number
  targetPosition: THREE.Vector3
  currentMode: MotionMode
  transitionProgress: number
}

export class ParticleSystem {
  public particles: Particle[] = []
  public group: THREE.Group
  public points: THREE.Points
  private geometry: THREE.BufferGeometry
  private material: THREE.PointsMaterial
  private primaryColor: THREE.Color
  private secondaryColor: THREE.Color
  private mode: MotionMode = 'spiral'
  private speed: number = 1
  private count: number = 200
  private gridSize: number = 10
  private time: number = 0
  private transitionDuration: number = 1
  private isTransitioning: boolean = false
  private transitionStart: number = 0
  private previousMode: MotionMode = 'spiral'

  constructor(
    count: number,
    primaryColor: THREE.Color,
    secondaryColor: THREE.Color,
    gridSize: number = 10
  ) {
    this.count = count
    this.primaryColor = primaryColor.clone()
    this.secondaryColor = secondaryColor.clone()
    this.gridSize = gridSize
    this.group = new THREE.Group()

    this.geometry = new THREE.BufferGeometry()
    this.material = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })

    this.points = new THREE.Points(this.geometry, this.material)
    this.group.add(this.points)

    this.initParticles()
    this.updateGeometry()
  }

  private initParticles(): void {
    this.particles = []
    const secondaryCount = Math.floor(this.count * 0.3)

    for (let i = 0; i < this.count; i++) {
      const basePos = new THREE.Vector3(
        (Math.random() - 0.5) * this.gridSize,
        (Math.random() - 0.5) * this.gridSize,
        (Math.random() - 0.5) * this.gridSize
      )

      const isSecondary = i < secondaryCount
      const color = isSecondary
        ? this.secondaryColor.clone()
        : this.primaryColor.clone()

      const particle: Particle = {
        position: basePos.clone(),
        velocity: new THREE.Vector3(),
        basePosition: basePos.clone(),
        color,
        isSecondary,
        phase: Math.random() * Math.PI * 2,
        speed: 0.5 + Math.random() * 0.5,
        size: 0.06 + Math.random() * 0.04,
        targetPosition: basePos.clone(),
        currentMode: this.mode,
        transitionProgress: 1,
      }

      this.particles.push(particle)
    }
  }

  private updateGeometry(): void {
    const positions = new Float32Array(this.count * 3)
    const colors = new Float32Array(this.count * 3)
    const sizes = new Float32Array(this.count)

    for (let i = 0; i < this.count; i++) {
      const p = this.particles[i]
      positions[i * 3] = p.position.x
      positions[i * 3 + 1] = p.position.y
      positions[i * 3 + 2] = p.position.z

      colors[i * 3] = p.color.r
      colors[i * 3 + 1] = p.color.g
      colors[i * 3 + 2] = p.color.b

      sizes[i] = p.size
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    this.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
    this.geometry.attributes.position.needsUpdate = true
    this.geometry.attributes.color.needsUpdate = true
  }

  private getSpiralPosition(particle: Particle, time: number): THREE.Vector3 {
    const base = particle.basePosition
    const radius = base.length() * 0.5 + 1
    const angle = time * particle.speed * this.speed + particle.phase
    const height = base.y + Math.sin(time * 0.5 * particle.speed * this.speed + particle.phase) * 1.5

    return new THREE.Vector3(
      Math.cos(angle) * radius + base.x * 0.3,
      height,
      Math.sin(angle) * radius + base.z * 0.3
    )
  }

  private getWavePosition(particle: Particle, time: number): THREE.Vector3 {
    const base = particle.basePosition
    const waveX = Math.sin(time * particle.speed * this.speed + base.y * 0.5 + particle.phase) * 1.5
    const waveY = Math.cos(time * 0.7 * particle.speed * this.speed + base.x * 0.5 + particle.phase) * 1.2
    const waveZ = Math.sin(time * 0.5 * particle.speed * this.speed + base.x * 0.3 + particle.phase) * 1

    return new THREE.Vector3(
      base.x + waveX,
      base.y + waveY,
      base.z + waveZ
    )
  }

  private getRandomPosition(particle: Particle, time: number): THREE.Vector3 {
    const base = particle.basePosition
    const noiseScale = 2

    const nx = Math.sin(time * 0.3 * particle.speed * this.speed + particle.phase) *
      Math.cos(time * 0.2 * particle.speed * this.speed + base.y * 0.3)
    const ny = Math.cos(time * 0.25 * particle.speed * this.speed + particle.phase * 1.3) *
      Math.sin(time * 0.35 * particle.speed * this.speed + base.z * 0.3)
    const nz = Math.sin(time * 0.35 * particle.speed * this.speed + particle.phase * 0.7) *
      Math.cos(time * 0.2 * particle.speed * this.speed + base.x * 0.3)

    return new THREE.Vector3(
      base.x + nx * noiseScale,
      base.y + ny * noiseScale,
      base.z + nz * noiseScale
    )
  }

  private getTargetPosition(particle: Particle, mode: MotionMode, time: number): THREE.Vector3 {
    switch (mode) {
      case 'spiral':
        return this.getSpiralPosition(particle, time)
      case 'wave':
        return this.getWavePosition(particle, time)
      case 'random':
        return this.getRandomPosition(particle, time)
      default:
        return this.getSpiralPosition(particle, time)
    }
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
  }

  public update(deltaTime: number): void {
    this.time += deltaTime

    if (this.isTransitioning) {
      const elapsed = this.time - this.transitionStart
      const progress = Math.min(elapsed / this.transitionDuration, 1)
      const easedProgress = this.easeInOutCubic(progress)

      if (progress >= 1) {
        this.isTransitioning = false
        this.mode = this.previousMode === this.mode ? this.mode : this.mode
      }

      for (let i = 0; i < this.count; i++) {
        const p = this.particles[i]
        const prevPos = this.getTargetPosition(p, this.previousMode, this.time)
        const targetPos = this.getTargetPosition(p, this.mode, this.time)

        p.position.lerpVectors(prevPos, targetPos, easedProgress)
      }
    } else {
      for (let i = 0; i < this.count; i++) {
        const p = this.particles[i]
        const targetPos = this.getTargetPosition(p, this.mode, this.time)
        p.position.copy(targetPos)
      }
    }

    const positions = this.geometry.attributes.position.array as Float32Array
    for (let i = 0; i < this.count; i++) {
      const p = this.particles[i]
      positions[i * 3] = p.position.x
      positions[i * 3 + 1] = p.position.y
      positions[i * 3 + 2] = p.position.z
    }
    this.geometry.attributes.position.needsUpdate = true
  }

  public setMode(mode: MotionMode): void {
    if (this.mode === mode && !this.isTransitioning) return

    this.previousMode = this.mode
    this.mode = mode
    this.isTransitioning = true
    this.transitionStart = this.time
  }

  public setPrimaryColor(color: THREE.Color): void {
    this.primaryColor.copy(color)
    this.updateParticleColors()
  }

  public setSecondaryColor(color: THREE.Color): void {
    this.secondaryColor.copy(color)
    this.updateParticleColors()
  }

  private updateParticleColors(): void {
    const colors = this.geometry.attributes.color.array as Float32Array

    for (let i = 0; i < this.count; i++) {
      const p = this.particles[i]
      const color = p.isSecondary ? this.secondaryColor : this.primaryColor
      p.color.copy(color)
      colors[i * 3] = color.r
      colors[i * 3 + 1] = color.g
      colors[i * 3 + 2] = color.b
    }
    this.geometry.attributes.color.needsUpdate = true
  }

  public setSpeed(speed: number): void {
    this.speed = speed
  }

  public getSpeed(): number {
    return this.speed
  }

  public setCount(count: number): void {
    if (count === this.count) return
    this.count = count
    this.initParticles()
    this.updateGeometry()
  }

  public getCount(): number {
    return this.count
  }

  public getMode(): MotionMode {
    return this.mode
  }

  public getPrimaryColor(): THREE.Color {
    return this.primaryColor.clone()
  }

  public getSecondaryColor(): THREE.Color {
    return this.secondaryColor.clone()
  }

  public applyHoverEffect(worldPosition: THREE.Vector3, radius: number = 2): void {
    const colors = this.geometry.attributes.color.array as Float32Array

    for (let i = 0; i < this.count; i++) {
      const p = this.particles[i]
      const distance = p.position.distanceTo(worldPosition)

      if (distance < radius) {
        const intensity = 1 - distance / radius
        const complement = this.getComplementaryColor(p.color)
        const blended = p.color.clone().lerp(complement, intensity * 0.8)

        colors[i * 3] = blended.r
        colors[i * 3 + 1] = blended.g
        colors[i * 3 + 2] = blended.b
      }
    }
    this.geometry.attributes.color.needsUpdate = true
  }

  public resetColors(): void {
    this.updateParticleColors()
  }

  private getComplementaryColor(color: THREE.Color): THREE.Color {
    const hsl = { h: 0, s: 0, l: 0 }
    color.getHSL(hsl)
    hsl.h = (hsl.h + 0.5) % 1
    const complement = new THREE.Color()
    complement.setHSL(hsl.h, hsl.s, hsl.l)
    return complement
  }
}
