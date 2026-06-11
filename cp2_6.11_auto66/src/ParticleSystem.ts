import * as THREE from 'three'

export type MotionMode = 'spiral' | 'wave' | 'random'

export interface Particle {
  position: THREE.Vector3
  basePosition: THREE.Vector3
  color: THREE.Color
  isSecondary: boolean
  phase: number
  speed: number
  size: number
  hoverIntensity: number
  targetHoverIntensity: number
}

export class ParticleSystem {
  public particles: Particle[] = []
  public group: THREE.Group
  public points: THREE.Points
  private geometry: THREE.BufferGeometry
  private material: THREE.PointsMaterial

  private count: number = 200
  private gridSize: number = 10
  private speed: number = 1

  private primaryHSL: { h: number; s: number; l: number } = { h: 0, s: 0, l: 0 }
  private secondaryHSL: { h: number; s: number; l: number } = { h: 0, s: 0, l: 0 }
  private primaryColor: THREE.Color = new THREE.Color()
  private secondaryColor: THREE.Color = new THREE.Color()

  private mode: MotionMode = 'spiral'
  private previousMode: MotionMode = 'spiral'
  private isTransitioning: boolean = false
  private transitionProgress: number = 1
  private transitionDuration: number = 1
  private time: number = 0

  private positions!: Float32Array
  private colors!: Float32Array
  private sizes!: Float32Array

  private oldPositions!: Float32Array
  private newPositions!: Float32Array

  private tempColor: THREE.Color = new THREE.Color()

  private hoverDuration: number = 1.5

  constructor(
    count: number,
    primaryColor: THREE.Color,
    secondaryColor: THREE.Color,
    gridSize: number = 10
  ) {
    this.count = count
    this.gridSize = gridSize
    this.group = new THREE.Group()

    this.primaryColor.copy(primaryColor)
    primaryColor.getHSL(this.primaryHSL)
    this.secondaryColor.copy(secondaryColor)
    secondaryColor.getHSL(this.secondaryHSL)

    this.initParticles()

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

    this.initBuffers()
  }

  private initParticles(): void {
    this.particles = []
    const secondaryCount = Math.floor(this.count * 0.3)

    for (let i = 0; i < this.count; i++) {
      const baseX = (Math.random() - 0.5) * this.gridSize
      const baseY = (Math.random() - 0.5) * this.gridSize
      const baseZ = (Math.random() - 0.5) * this.gridSize

      const isSecondary = i < secondaryCount
      const hsl = isSecondary ? this.secondaryHSL : this.primaryHSL
      const color = new THREE.Color()
      color.setHSL(hsl.h, hsl.s, hsl.l)

      const particle: Particle = {
        position: new THREE.Vector3(baseX, baseY, baseZ),
        basePosition: new THREE.Vector3(baseX, baseY, baseZ),
        color,
        isSecondary,
        phase: Math.random() * Math.PI * 2,
        speed: 0.5 + Math.random() * 0.5,
        size: 0.06 + Math.random() * 0.04,
        hoverIntensity: 0,
        targetHoverIntensity: 0,
      }

      this.particles.push(particle)
    }
  }

  private initBuffers(): void {
    const bufferSize = this.count * 3
    this.positions = new Float32Array(bufferSize)
    this.colors = new Float32Array(bufferSize)
    this.sizes = new Float32Array(this.count)
    this.oldPositions = new Float32Array(bufferSize)
    this.newPositions = new Float32Array(bufferSize)

    for (let i = 0; i < this.count; i++) {
      const p = this.particles[i]
      this.positions[i * 3] = p.position.x
      this.positions[i * 3 + 1] = p.position.y
      this.positions[i * 3 + 2] = p.position.z

      this.colors[i * 3] = p.color.r
      this.colors[i * 3 + 1] = p.color.g
      this.colors[i * 3 + 2] = p.color.b

      this.sizes[i] = p.size
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3))
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3))
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1))
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
  }

  private writeSpiralPosition(index: number, particle: Particle, time: number, out: Float32Array): void {
    const base = particle.basePosition
    const radius = Math.sqrt(base.x * base.x + base.z * base.z) * 0.5 + 1
    const speedFactor = particle.speed * this.speed
    const angle = time * speedFactor + particle.phase
    const height = base.y + Math.sin(time * 0.5 * speedFactor + particle.phase) * 1.5

    const cosAngle = Math.cos(angle)
    const sinAngle = Math.sin(angle)

    const i = index * 3
    out[i] = cosAngle * radius + base.x * 0.3
    out[i + 1] = height
    out[i + 2] = sinAngle * radius + base.z * 0.3
  }

  private writeWavePosition(index: number, particle: Particle, time: number, out: Float32Array): void {
    const base = particle.basePosition
    const speedFactor = particle.speed * this.speed
    const phase = particle.phase

    const waveX = Math.sin(time * speedFactor + base.y * 0.5 + phase) * 1.5
    const waveY = Math.cos(time * 0.7 * speedFactor + base.x * 0.5 + phase) * 1.2
    const waveZ = Math.sin(time * 0.5 * speedFactor + base.x * 0.3 + base.z * 0.2 + phase) * 1.0

    const i = index * 3
    out[i] = base.x + waveX
    out[i + 1] = base.y + waveY
    out[i + 2] = base.z + waveZ
  }

  private writeRandomPosition(index: number, particle: Particle, time: number, out: Float32Array): void {
    const base = particle.basePosition
    const speedFactor = particle.speed * this.speed
    const phase = particle.phase
    const noiseScale = 2.5

    const nx = Math.sin(time * 0.3 * speedFactor + phase) * Math.cos(time * 0.2 * speedFactor + base.y * 0.3) +
               Math.sin(time * 0.5 * speedFactor + base.x * 0.2) * 0.5
    const ny = Math.cos(time * 0.25 * speedFactor + phase * 1.3) * Math.sin(time * 0.35 * speedFactor + base.z * 0.3) +
               Math.cos(time * 0.4 * speedFactor + base.y * 0.2) * 0.5
    const nz = Math.sin(time * 0.35 * speedFactor + phase * 0.7) * Math.cos(time * 0.2 * speedFactor + base.x * 0.3) +
               Math.sin(time * 0.45 * speedFactor + base.z * 0.2) * 0.5

    const i = index * 3
    out[i] = base.x + nx * noiseScale
    out[i + 1] = base.y + ny * noiseScale
    out[i + 2] = base.z + nz * noiseScale
  }

  private writePositionByMode(index: number, particle: Particle, mode: MotionMode, time: number, out: Float32Array): void {
    switch (mode) {
      case 'spiral':
        this.writeSpiralPosition(index, particle, time, out)
        break
      case 'wave':
        this.writeWavePosition(index, particle, time, out)
        break
      case 'random':
        this.writeRandomPosition(index, particle, time, out)
        break
      default:
        this.writeSpiralPosition(index, particle, time, out)
    }
  }

  private getComplementaryHSL(h: number): number {
    return (h + 0.5) % 1
  }

  private updateParticleColor(index: number, particle: Particle): void {
    const baseHSL = particle.isSecondary ? this.secondaryHSL : this.primaryHSL
    const hover = particle.hoverIntensity

    if (hover > 0) {
      const complementH = this.getComplementaryHSL(baseHSL.h)
      const h = baseHSL.h + (complementH - baseHSL.h) * hover * 0.8
      const s = baseHSL.s * (1 + hover * 0.3)
      const l = baseHSL.l * (1 + hover * 0.2)

      this.tempColor.setHSL(h, s, l)
    } else {
      this.tempColor.setHSL(baseHSL.h, baseHSL.s, baseHSL.l)
    }

    particle.color.copy(this.tempColor)

    const i = index * 3
    this.colors[i] = this.tempColor.r
    this.colors[i + 1] = this.tempColor.g
    this.colors[i + 2] = this.tempColor.b
  }

  public updateHover(deltaTime: number): void {
    const fadeRate = deltaTime / this.hoverDuration
    let needsColorUpdate = false

    for (let i = 0; i < this.count; i++) {
      const p = this.particles[i]
      const target = p.targetHoverIntensity
      const current = p.hoverIntensity

      if (Math.abs(target - current) > 0.001) {
        if (target > current) {
          p.hoverIntensity = Math.min(current + fadeRate * 2, target)
        } else {
          p.hoverIntensity = Math.max(current - fadeRate, target)
        }
        needsColorUpdate = true
        this.updateParticleColor(i, p)
      }
    }

    if (needsColorUpdate) {
      this.geometry.attributes.color.needsUpdate = true
    }
  }

  public update(deltaTime: number): void {
    this.time += deltaTime

    if (this.isTransitioning) {
      this.transitionProgress += deltaTime / this.transitionDuration
      if (this.transitionProgress >= 1) {
        this.transitionProgress = 1
        this.isTransitioning = false
      }
    }

    const easedT = this.easeInOutCubic(this.transitionProgress)
    const needsTransition = this.isTransitioning

    for (let i = 0; i < this.count; i++) {
      const p = this.particles[i]
      const i3 = i * 3

      if (needsTransition) {
        this.writePositionByMode(i, p, this.previousMode, this.time, this.oldPositions)
        this.writePositionByMode(i, p, this.mode, this.time, this.newPositions)

        this.positions[i3] = this.oldPositions[i3] + (this.newPositions[i3] - this.oldPositions[i3]) * easedT
        this.positions[i3 + 1] = this.oldPositions[i3 + 1] + (this.newPositions[i3 + 1] - this.oldPositions[i3 + 1]) * easedT
        this.positions[i3 + 2] = this.oldPositions[i3 + 2] + (this.newPositions[i3 + 2] - this.oldPositions[i3 + 2]) * easedT
      } else {
        this.writePositionByMode(i, p, this.mode, this.time, this.positions)
      }

      p.position.x = this.positions[i3]
      p.position.y = this.positions[i3 + 1]
      p.position.z = this.positions[i3 + 2]
    }

    this.geometry.attributes.position.needsUpdate = true

    this.updateHover(deltaTime)
  }

  public setMode(mode: MotionMode): void {
    if (this.mode === mode && !this.isTransitioning) return

    this.previousMode = this.mode
    this.mode = mode
    this.isTransitioning = true
    this.transitionProgress = 0
  }

  public setPrimaryColor(color: THREE.Color): void {
    this.primaryColor.copy(color)
    color.getHSL(this.primaryHSL)
    this.updateAllParticleColors()
  }

  public setSecondaryColor(color: THREE.Color): void {
    this.secondaryColor.copy(color)
    color.getHSL(this.secondaryHSL)
    this.updateAllParticleColors()
  }

  private updateAllParticleColors(): void {
    for (let i = 0; i < this.count; i++) {
      const p = this.particles[i]
      this.updateParticleColor(i, p)
    }
    this.geometry.attributes.color.needsUpdate = true
  }

  public setSpeed(speed: number): void {
    this.speed = speed
  }

  public setCount(count: number): void {
    if (count === this.count) return
    this.count = count
    this.initParticles()
    this.initBuffers()
  }

  public applyHoverEffect(worldPosition: THREE.Vector3, intensity: number, radius: number = 2.5): void {
    const radiusSq = radius * radius

    for (let i = 0; i < this.count; i++) {
      const p = this.particles[i]
      const pos = p.position

      const dx = pos.x - worldPosition.x
      const dy = pos.y - worldPosition.y
      const dz = pos.z - worldPosition.z
      const distSq = dx * dx + dy * dy + dz * dz

      if (distSq < radiusSq) {
        const dist = Math.sqrt(distSq)
        const falloff = 1 - dist / radius
        p.targetHoverIntensity = Math.min(1, falloff * intensity)
      }
    }
  }

  public resetHover(): void {
    for (let i = 0; i < this.count; i++) {
      this.particles[i].targetHoverIntensity = 0
    }
  }

  public resetColors(): void {
    this.resetHover()
  }

  public getSpeed(): number {
    return this.speed
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

  public getPositionBuffer(): Float32Array {
    return this.positions
  }

  public getColorBuffer(): Float32Array {
    return this.colors
  }
}
