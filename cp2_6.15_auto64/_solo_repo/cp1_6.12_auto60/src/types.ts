export interface HSLColor {
  h: number
  s: number
  l: number
}

export interface InkBlob {
  id: string
  x: number
  y: number
  size: number
  color: HSLColor
  shape: 'circle' | 'ellipse' | 'polygon'
  rotation: number
  points?: number[]
  createdAt: number
  diffusionProgress: number
  pulsePhase: number
}

export interface MoodPalette {
  id: string
  name: string
  emoji: string
  gradient: string
  colors: HSLColor[]
}

export type TonePreset = 'piano' | 'strings' | 'synth'

export interface MusicControls {
  start: () => void
  stop: () => void
  setTempo: (tempo: number) => void
  setTone: (preset: TonePreset) => void
  isPlaying: () => boolean
  onNoteTrigger: (callback: (blobIndex: number) => void) => void
}
