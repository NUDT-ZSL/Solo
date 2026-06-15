export interface ParticleLayer {
  freqBand: 'low' | 'mid' | 'high'
  radius: number
  speed: number
  color: string
  particleCount: number
  energyData: number[]
}

export interface Amber {
  id: string
  audio: string
  audioDuration: number
  layers: ParticleLayer[]
  createdAt: number
  position: { x: number; y: number; z: number }
}

export interface RecorderProps {
  onRecordingComplete: (audioBlob: Blob) => void
  isUploading: boolean
  uploadProgress: number
}

export interface ArenaProps {
  ambers: Amber[]
  maxVisibleAmbers: number
  onAmberClick: (amber: Amber) => void
  focusedAmberId: string | null
  onFocusAmber: (id: string | null) => void
  newAmberId: string | null
}

export type RecordingState = 'idle' | 'recording' | 'uploading' | 'ready'
