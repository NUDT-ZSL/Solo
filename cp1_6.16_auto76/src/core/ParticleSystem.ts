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
    const bandAngle = Math.random() * Math.PI * 2
    const bandRadius = 15 + Math.random() * 25
    const bandWidth = (Math.random() - 0.5) * 8

    const startX = Math.cos(bandAngle) * bandRadius + bandWidth
    const startY = 0.5 + Math.random() * 3
    const startZ = Math.sin(bandAngle) * bandRadius + bandWidth * 0.5

    const riseAngle = bandAngle + (Math.random() - 0.5) * 0.5
    const riseHeight = 15 + Math.random() * 20
    const riseDrift = 3 + Math.random() * 8

    const endX = startX + Math.cos(riseAngle) * riseDrift
    const endY = startY + riseHeight
    const endZ = startZ + Math.sin(riseAngle) * riseDrift

    const bendAmount = 4 + Math.random() * 8
    const bendAngle = bandAngle + Math.PI / 2 + (Math.random() - 0.5) * 0.8

    const cp1X = startX + Math.cos(bendAngle) * bendAmount * 0.6
    const cp1Y = startY + riseHeight * 0.35
    const cp1Z = startZ + Math.sin(bendAngle) * bendAmount * 0.6

    const cp2X = endX - Math.cos(bendAngle) * bendAmount * 0.4
    const cp2Y = startY + riseHeight * 0.7
    const cp2Z = endZ - Math.sin(bendAngle) * bendAmount * 0.4

    const curve = new THREE.CubicBezierCurve3(
      new THREE.Vector3(startX, startY, startZ),
      new THREE.Vector3(cp1X, cp1Y, cp1Z),
      new THREE.Vector3(cp2X, cp2Y, cp2Z),
      new THREE.Vector3(endX, endY, endZ)
    )

    return {
      id,
      curve,
      progress: Math.random() * 0.3,
      speed: 0.25 + Math.random() * 0.35,
      period: 1.0 + Math.random() * 2.0,
      length: 0.8 + Math.random() * 0.6,
      colorOffset: Math.random() * Math.PI * 2,
      brightnessPhase: Math.random() * Math.PI * 2,
      baseY: startY,
      amplitude: 1.5 + Math.random() * 2,
    }
  }

  private getInterpolatedColor(time: number, colorOffset: number): THREE.Color {
    const t = (time * 0.08 + colorOffset) % 3
    const index = Math.floor(t) % 3
    const nextIndex = (index + 1) % 3
    const localT = t - Math.floor(t)

    const color1 = COLORS[index]
    const color2 = COLORS[nextIndex]

    return new THREE.Color().lerpColors(color1, color2, localT)
  }

  private getHeightBasedAlpha(progress: number, startY: number, endY: number): number {
    const currentY = startY + (endY - startY) * progress
    const totalHeight = endY - startY
    const heightAboveStart = currentY - startY
    const normalizedHeight = Math.max(0, Math.min(1, heightAboveStart / totalHeight))

    if (normalizedHeight < 0.15) {
      return normalizedHeight / 0.15
    } else if (normalizedHeight > 0.7) {
      const fadeStart = 0.7
      const fadeRange = 0.3
      return Math.max(0, 1 - (normalizedHeight - fadeStart) / fadeRange)
    } else {
      return 1.0
    }
  }

  private getBrightness(time: number, phase: number): number {
    const wave = Math.sin(time * 0.4 + phase) * 0.5 + 0.5
    return 0.5 + wave * 0.5
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
    const step = 0.008

    for (let i = 0; i < this.activeCount; i++) {
      const p = this.particles[i]

      p.progress += deltaTime * p.speed * configSpeed * speedMultiplier / p.period
      if (p.progress > 1) {
        p.progress = 0
        Object.assign(p, this.createParticle(p.id))
      }

      const t1 = p.progress
      const t2 = Math.min(1, p.progress + step * p.length * configLength)

      const rawPos1 = p.curve.getPointAt(t1)
      const rawPos2 = p.curve.getPointAt(t2)

      const tangent = p.curve.getTangentAt(t1).normalize()

      const waveX = Math.sin(time * 0.6 + p.id * 0.08) * 0.8
      const waveZ = Math.cos(time * 0.5 + p.id * 0.12) * 0.8
      const waveY = Math.sin(time * 0.3 + p.brightnessPhase) * p.amplitude * 0.4

      const pos1 = new THREE.Vector3(
        rawPos1.x + waveX,
        rawPos1.y + waveY,
        rawPos1.z + waveZ
      )
      const pos2 = new THREE.Vector3(
        rawPos2.x + waveX,
        rawPos2.y + waveY,
        rawPos2.z + waveZ
      )

      const stripLength = 0.6 * p.length * configLength
      const perp1 = new THREE.Vector3().copy(tangent).multiplyScalar(-stripLength * 0.5)
      const perp2 = new THREE.Vector3().copy(tangent).multiplyScalar(stripLength * 0.5)

      const finalStart = new THREE.Vector3().addVectors(pos1, perp1)
      const finalEnd = new THREE.Vector3().addVectors(pos1, perp2)

      this.positions[i * 6] = finalStart.x
      this.positions[i * 6 + 1] = finalStart.y
      this.positions[i * 6 + 2] = finalStart.z
      this.positions[i * 6 + 3] = finalEnd.x
      this.positions[i * 6 + 4] = finalEnd.y
      this.positions[i * 6 + 5] = finalEnd.z

      const baseColor = this.getInterpolatedColor(time, p.colorOffset)
      const hue = (baseColor.getHSL({ h: 0, s: 0, l: 0 }).h * 360 + configHue) % 360 / 360
      const color = new THREE.Color().setHSL(hue, 0.85, 0.55)

      const startY = p.curve.v0.y
      const endY = p.curve.v3.y
      const alpha1 = this.getHeightBasedAlpha(t1, startY, endY)
      const alpha2 = this.getHeightBasedAlpha(t2, startY, endY)

      const brightness = this.getBrightness(time, p.brightnessPhase)
      const audioBoost = 0.7 + audioVolume * 0.3
      const lightnessBoost = 0.9 + Math.sin(time * 0.25 + p.id * 0.05) * 0.1

      const colorStart = color.clone().multiplyScalar(brightness * alpha1 * audioBoost * lightnessBoost)
      const colorEnd = color.clone().multiplyScalar(brightness * alpha2 * audioBoost * lightnessBoost * 0.85)

      this.colors[i * 6] = colorStart.r
      this.colors[i * 6 + 1] = colorStart.g
      this.colors[i * 6 + 2] = colorStart.b
      this.colors[i * 6 + 3] = colorEnd.r
      this.colors[i * 6 + 4] = colorEnd.g
      this.colors[i * 6 + 5] = colorEnd.b
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
