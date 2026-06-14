export interface SoundSource {
  id: string
  name: string
  emoji: string
  category: string
  frequency: string
}

export interface SoundTrackItem {
  id: string
  soundId: string
  name: string
  emoji: string
  volume: number
  muted: boolean
  solo: boolean
  eq?: {
    low: number
    mid: number
    high: number
  }
}

export interface PresetItem {
  id: string
  name: string
  description: string
  tracks: SoundTrackItem[]
  masterVolume: number
  createdAt: string
  updatedAt: string
  shareToken?: string
  trackCount?: number
}

export interface AppState {
  tracks: SoundTrackItem[]
  masterVolume: number
  isPlaying: boolean
  currentPreset: PresetItem | null
}

export type AppAction =
  | { type: 'ADD_TRACK'; payload: SoundTrackItem }
  | { type: 'REMOVE_TRACK'; payload: string }
  | { type: 'SET_TRACK_VOLUME'; payload: { id: string; volume: number } }
  | { type: 'TOGGLE_MUTE'; payload: string }
  | { type: 'TOGGLE_SOLO'; payload: string }
  | { type: 'SET_MASTER_VOLUME'; payload: number }
  | { type: 'TOGGLE_PLAY' }
  | { type: 'SET_PLAYING'; payload: boolean }
  | { type: 'SET_PRESET'; payload: PresetItem | null }
  | { type: 'LOAD_PRESET'; payload: PresetItem }
  | { type: 'CLEAR_TRACKS' }
  | { type: 'SET_TRACK_EQ'; payload: { id: string; eq: { low: number; mid: number; high: number } } }
