export interface SimulationParams {
  frequency: number
  anisotropyStrength: number
  waveType: 'P' | 'S'
  isRunning: boolean
}

export interface ParticleState {
  position: Float32Array
  color: Float32Array
  opacity: Float32Array
  size: Float32Array
}

export interface SimulationOutput {
  particles: ParticleState
  particleCount: number
}

export interface AnisotropyTensor {
  matrix: number[][]
}

export interface AppConfig {
  baseFrequency: number
  sampleRate: number
}
