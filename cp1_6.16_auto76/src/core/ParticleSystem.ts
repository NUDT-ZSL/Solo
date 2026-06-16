import * as THREE from 'three'
import type { Particle, ParticleConfig } from '../types'

const COLORS = [
  new THREE.Color('#00FF88'),
  new THREE.Color('#8A2BE2'),
  new THREE.Color('#4169E1'),
]

export class ParticleSystem {
  private particles: Particle[] = []
  private positions: Float32Array
  private colors: Float32Array
  private maxCount: number
  private activeCount: number

  constructor(maxCount: number) {
    this.maxCount = maxCount
    this.activeCount = Math.floor(maxCount / 2)
    this.positions = new Float32Array(maxCount * 6)
    this.colors = new Float32Array(maxCount * 6)
    this.initializeParticles()
  }

  private initializeParticles(): void {
    for (let i = 0; i < this.maxCount; i++) {
      this.particles.push(this.createParticle(i))
    }
  }

  private createParticle(id: number): Particle {
    const startX = (Math.random() - 0.5) * 60
    const startY = 5 + Math.random() * 15
    const startZ = (Math.random() - 0.5) * 40

    const endX = startX + (Math.random() - 0.5) * 30
    const endY = startY + (Math.random() - 0.5) * 10
    const endZ = startZ + (Math.random() - 0.5) * 20

    const cp1X = startX + (Math.random() - 0.5) * 20
    const cp1Y = startY + 5 + Math.random() * 10
    const cp1Z = startZ + (Math.random() - 0.5) * 15

    const cp2X = endX + (Math.random() - 0.5) * 20
    const cp2Y = endY + 5 + Math.random() * 10
    const cp2Z = endZ + (Math.random() - 0.5) * 15

    const curve = new THREE.CubicBezierCurve3(
      new THREE.Vector3(startX, startY, startZ),
      new THREE.Vector3(cp1X, cp1Y, cp1Z),
      new THREE.Vector3(cp2X, cp2Y, cp2Z),
      new THREE.Vector3(endX, endY, endZ)
    )

    return {
      id,
      curve,
      progress: Math.random(),
      speed: 0.3 + Math.random() * 0.4,
      period: 0.5 + Math.random() * 1.0,
      length: 1.0 + Math.random() * 0.5,
      colorOffset: Math.random() * Math.PI * 2,
      brightnessPhase: Math.random() * Math.PI * 2,
      baseY: startY,
      amplitude: 2 + Math.random() * 3,
    }
  }

  private getInterpolatedColor(time: number, colorOffset: number): THREE.Color {
    const t = (time * 0.1 + colorOffset) % 3
    const index = Math.floor(t) % 3
    const nextIndex = (index + 1) % 3
    const localT = t - Math.floor(t)

    const color1 = COLORS[index]
    const color2 = COLORS[nextIndex]

    return new THREE.Color().lerpColors(color1, color2, localT)
  }

  private getBrightness(time: number, phase: number): number {
    const wave = Math.sin(time * 0.5 + phase) * 0.5 + 0.5
    return 0.4 + wave * 0.6
  }

  public update(deltaTime: number, config: ParticleConfig): void {
    const { speed: configSpeed, length: configLength, colorOffset: configHue, audioVolume } = config

    const baseCount = 1000
    const maxAdditional = 2000
    this.activeCount = Math.min(
      this.maxCount,
      Math.floor(baseCount + audioVolume * maxAdditional)
    )

    const speedMultiplier = 1 + audioVolume * 0.5

    const time = performance.now() / 1000

    for (let i = 0; i < this.activeCount; i++) {
      const p = this.particles[i]

      p.progress += deltaTime * p.speed * configSpeed * speedMultiplier / p.period
      if (p.progress > 1) {
        p.progress = 0
        Object.assign(p, this.createParticle(p.id))
      }

      const t1 = p.progress
      const t2 = Math.min(1, p.progress + 0.02 * p.length * configLength)

      const pos1 = p.curve.getPointAt(t1)
      const pos2 = p.curve.getPointAt(t2)

      const waveOffset = Math.sin(time * 0.8 + p.id * 0.1) * 0.5
      pos1.y += Math.sin(time * 0.3 + p.brightnessPhase) * p.amplitude * 0.3
      pos2.y += Math.sin(time * 0.3 + p.brightnessPhase + 0.1) * p.amplitude * 0.3

      this.positions[i * 6] = pos1.x
      this.positions[i * 6 + 1] = pos1.y + waveOffset
      this.positions[i * 6 + 2] = pos1.z
      this.positions[i * 6 + 3] = pos2.x
      this.positions[i * 6 + 4] = pos2.y + waveOffset
      this.positions[i * 6 + 5] = pos2.z

      const baseColor = this.getInterpolatedColor(time, p.colorOffset)
      const hue = (baseColor.getHSL({ h: 0, s: 0, l: 0 }).h * 360 + configHue) % 360 / 360
      const color = new THREE.Color().setHSL(hue, 0.8, 0.55)
      const brightness = this.getBrightness(time, p.brightnessPhase)
      color.multiplyScalar(brightness * (0.7 + audioVolume * 0.3))

      this.colors[i * 6] = color.r
      this.colors[i * 6 + 1] = color.g
      this.colors[i * 6 + 2] = color.b
      this.colors[i * 6 + 3] = color.r * 0.8
      this.colors[i * 6 + 4] = color.g * 0.8
      this.colors[i * 6 + 5] = color.b * 0.8
    }

    for (let i = this.activeCount; i < this.maxCount; i++) {
      for (let j = 0; j < 6; j++) {
        this.colors[i * 6 + j] = 0
      }
    }
  }

  public getPositions(): Float32Array {
    return this.positions
  }

  public getColors(): Float32Array {
    return this.colors
  }

  public getActiveCount(): number {
    return this.activeCount
  }

  public getMaxCount(): number {
    return this.maxCount
  }

  public setActiveCount(count: number): void {
    this.activeCount = Math.min(this.maxCount, Math.max(0, count))
  }
}
