export interface Particle {
  id: number
  curve: THREE.CubicBezierCurve3
  progress: number
  speed: number
  period: number
  length: number
  colorOffset: number
  brightnessPhase: number
  baseY: number
  amplitude: number
}

export interface ParticleConfig {
  count: number
  speed: number
  length: number
  colorOffset: number
  audioVolume: number
}

export interface AudioData {
  volume: number
  frequencyData: Uint8Array
  isActive: boolean
  error: string | null
}

export interface SceneConfig {
  skyTopColor: string
  skyBottomColor: string
  groundColor: string
  groundOpacity: number
}

export interface UIControls {
  colorOffset: number
  particleLength: number
  particleCount: number
}
