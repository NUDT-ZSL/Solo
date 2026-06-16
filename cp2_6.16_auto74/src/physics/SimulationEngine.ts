import type { SimulationParams, ParticleState, SimulationOutput } from '../types'

const EARTH_CENTER = { x: 0, y: 2, z: 0 }
const ENERGY_ATTENUATION = 0.98
const BASE_VELOCITY = 2.0
const P_WAVE_SPEED_RATIO = 1.0
const S_WAVE_SPEED_RATIO = 0.6

function multiplyMatrixVector(matrix: number[][], vector: number[]): number[] {
  return [
    matrix[0][0] * vector[0] + matrix[0][1] * vector[1] + matrix[0][2] * vector[2],
    matrix[1][0] * vector[0] + matrix[1][1] * vector[1] + matrix[1][2] * vector[2],
    matrix[2][0] * vector[0] + matrix[2][1] * vector[1] + matrix[2][2] * vector[2],
  ]
}

function vectorLength(v: number[]): number {
  return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2])
}

function normalizeVector(v: number[]): number[] {
  const len = vectorLength(v)
  if (len === 0) return [0, 0, 0]
  return [v[0] / len, v[1] / len, v[2] / len]
}

function lerpColor(t: number): [number, number, number] {
  const clampedT = Math.max(0, Math.min(1, (t - 1.0) / 2.0))
  const r = clampedT
  const g = 0.2 * (1 - clampedT)
  const b = 1.0 - clampedT
  return [r, g, b]
}

export class SimulationEngine {
  private particleCount: number = 2000
  private particleVelocities: Float32Array
  private particleBirthTimes: Float32Array
  private particleEnergies: Float32Array
  private particleDirections: Float32Array
  private particleState: ParticleState
  private anisotropyTensor: number[][]
  private currentTime: number = 0
  private lastPulseTime: number = 0
  private pulseInterval: number = 1.0
  private currentAnisotropyStrength: number = 1.0

  constructor(initialCount: number = 2000) {
    this.particleCount = initialCount
    this.particleVelocities = new Float32Array(initialCount * 3)
    this.particleBirthTimes = new Float32Array(initialCount)
    this.particleEnergies = new Float32Array(initialCount)
    this.particleDirections = new Float32Array(initialCount * 3)

    this.particleState = {
      position: new Float32Array(initialCount * 3),
      color: new Float32Array(initialCount * 3),
      opacity: new Float32Array(initialCount),
      size: new Float32Array(initialCount),
    }

    this.anisotropyTensor = [
      [1.0, 0.3, 0.3],
      [0.3, 1.2, 0.3],
      [0.3, 0.3, 0.8],
    ]

    this.initializeParticles()
  }

  private initializeParticles(): void {
    for (let i = 0; i < this.particleCount; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const dirX = Math.sin(phi) * Math.cos(theta)
      const dirY = Math.sin(phi) * Math.sin(theta)
      const dirZ = Math.cos(phi)

      const dir = [dirX, dirY, dirZ]
      const transformedDir = multiplyMatrixVector(this.anisotropyTensor, dir)
      const velocityMag = vectorLength(transformedDir) * BASE_VELOCITY
      const normalizedDir = normalizeVector(transformedDir)

      this.particleDirections[i * 3] = normalizedDir[0]
      this.particleDirections[i * 3 + 1] = normalizedDir[1]
      this.particleDirections[i * 3 + 2] = normalizedDir[2]

      this.particleVelocities[i * 3] = normalizedDir[0] * velocityMag
      this.particleVelocities[i * 3 + 1] = normalizedDir[1] * velocityMag
      this.particleVelocities[i * 3 + 2] = normalizedDir[2] * velocityMag

      const phaseOffset = (i / this.particleCount) * this.pulseInterval

      this.particleBirthTimes[i] = -this.pulseInterval + phaseOffset
      this.particleEnergies[i] = 0
      this.resetParticle(i)
    }
  }

  private resetParticle(index: number): void {
    const i3 = index * 3
    this.particleState.position[i3] = EARTH_CENTER.x
    this.particleState.position[i3 + 1] = EARTH_CENTER.y
    this.particleState.position[i3 + 2] = EARTH_CENTER.z

    this.particleState.color[i3] = 0
    this.particleState.color[i3 + 1] = 0.2
    this.particleState.color[i3 + 2] = 1.0

    this.particleState.opacity[index] = 0
    this.particleState.size[index] = 1.2 + Math.random() * 1.8

    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    const dirX = Math.sin(phi) * Math.cos(theta)
    const dirY = Math.sin(phi) * Math.sin(theta)
    const dirZ = Math.cos(phi)

    const dir = [dirX, dirY, dirZ]
    const transformedDir = multiplyMatrixVector(this.anisotropyTensor, dir)
    const velocityMag = vectorLength(transformedDir)
    const normalizedDir = normalizeVector(transformedDir)

    this.particleDirections[i3] = normalizedDir[0]
    this.particleDirections[i3 + 1] = normalizedDir[1]
    this.particleDirections[i3 + 2] = normalizedDir[2]

    this.particleVelocities[i3] = normalizedDir[0] * velocityMag
    this.particleVelocities[i3 + 1] = normalizedDir[1] * velocityMag
    this.particleVelocities[i3 + 2] = normalizedDir[2] * velocityMag

    this.particleEnergies[index] = 1.0
  }

  private updateAnisotropyTensor(strength: number): void {
    const baseDiag = [1.0, 1.2, 0.8]
    const offDiag = 0.3 * strength

    this.anisotropyTensor = [
      [baseDiag[0], offDiag, offDiag],
      [offDiag, baseDiag[1], offDiag],
      [offDiag, offDiag, baseDiag[2]],
    ]

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3
      const currentDir = [
        this.particleDirections[i3],
        this.particleDirections[i3 + 1],
        this.particleDirections[i3 + 2],
      ]
      const transformedDir = multiplyMatrixVector(this.anisotropyTensor, currentDir)
      const velocityMag = vectorLength(transformedDir)
      const normalizedDir = normalizeVector(transformedDir)

      this.particleVelocities[i3] = normalizedDir[0] * velocityMag
      this.particleVelocities[i3 + 1] = normalizedDir[1] * velocityMag
      this.particleVelocities[i3 + 2] = normalizedDir[2] * velocityMag
    }

    this.currentAnisotropyStrength = strength
  }

  public setParticleCount(count: number): void {
    if (count === this.particleCount) return

    this.particleCount = count
    this.particleVelocities = new Float32Array(count * 3)
    this.particleBirthTimes = new Float32Array(count)
    this.particleEnergies = new Float32Array(count)
    this.particleDirections = new Float32Array(count * 3)

    this.particleState = {
      position: new Float32Array(count * 3),
      color: new Float32Array(count * 3),
      opacity: new Float32Array(count),
      size: new Float32Array(count),
    }

    this.initializeParticles()
  }

  public update(deltaTime: number, params: SimulationParams): SimulationOutput {
    if (params.anisotropyStrength !== this.currentAnisotropyStrength) {
      this.updateAnisotropyTensor(params.anisotropyStrength)
    }

    this.pulseInterval = 1.0 / params.frequency

    const speedRatio = params.waveType === 'P' ? P_WAVE_SPEED_RATIO : S_WAVE_SPEED_RATIO

    if (params.isRunning) {
      this.currentTime += deltaTime

      if (this.currentTime - this.lastPulseTime >= this.pulseInterval) {
        this.lastPulseTime = this.currentTime
      }
    }

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3

      const age = this.currentTime - this.particleBirthTimes[i]
      const pulsePhase = age % this.pulseInterval

      if (params.isRunning && pulsePhase < deltaTime) {
        this.particleBirthTimes[i] = this.currentTime
        this.particleEnergies[i] = 1.0
        this.resetParticle(i)
        continue
      }

      if (this.particleEnergies[i] <= 0.01) {
        this.particleState.opacity[i] = 0
        continue
      }

      const velScale = speedRatio * deltaTime

      this.particleState.position[i3] += this.particleVelocities[i3] * velScale
      this.particleState.position[i3 + 1] += this.particleVelocities[i3 + 1] * velScale
      this.particleState.position[i3 + 2] += this.particleVelocities[i3 + 2] * velScale

      if (params.isRunning) {
        this.particleEnergies[i] *= Math.pow(ENERGY_ATTENUATION, deltaTime * 60)
      }

      const energy = this.particleEnergies[i]
      const opacity = 0.1 + 0.7 * energy
      this.particleState.opacity[i] = opacity

      const velocityRatio = vectorLength([
        this.particleVelocities[i3],
        this.particleVelocities[i3 + 1],
      ]) / BASE_VELOCITY

      const color = lerpColor(velocityRatio)
      this.particleState.color[i3] = color[0]
      this.particleState.color[i3 + 1] = color[1]
      this.particleState.color[i3 + 2] = color[2]
    }

    return {
      particles: this.particleState,
      particleCount: this.particleCount,
    }
  }

  public getParticleCount(): number {
    return this.particleCount
  }
}
