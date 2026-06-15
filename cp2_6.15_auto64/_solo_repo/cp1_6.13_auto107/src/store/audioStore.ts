import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'

export interface Track {
  id: string
  name: string
  audioUrl: string | null
  volume: number
  pan: number
  lowPass: number
  highPass: number
  muted: boolean
  selected: boolean
}

export interface Reverb {
  enabled: boolean
  wet: number
  roomSize: 'small' | 'medium' | 'large'
}

export interface AudioState {
  tracks: Track[]
  reverb: Reverb
  isPlaying: boolean
  currentTime: number
  selectedTrackId: string | null
  addTrack: () => void
  removeTrack: (id: string) => void
  updateTrack: (id: string, updates: Partial<Track>) => void
  setTrackAudio: (id: string, url: string, name: string) => void
  selectTrack: (id: string | null) => void
  setReverb: (reverb: Partial<Reverb>) => void
  setPlaying: (playing: boolean) => void
  setCurrentTime: (time: number) => void
  resetAll: () => void
  loadFromStorage: () => void
}

const createDefaultTrack = (index: number): Track => ({
  id: uuidv4(),
  name: `音轨 ${index + 1}`,
  audioUrl: null,
  volume: 80,
  pan: 0,
  lowPass: 20000,
  highPass: 20,
  muted: false,
  selected: false,
})

const defaultState = {
  tracks: Array.from({ length: 4 }, (_, i) => createDefaultTrack(i)),
  reverb: {
    enabled: false,
    wet: 0.3,
    roomSize: 'medium' as const,
  },
  isPlaying: false,
  currentTime: 0,
  selectedTrackId: null,
}

const STORAGE_KEY = 'wavstudio_state'

const persistState = (state: Partial<AudioState>) => {
  try {
    const persistable = {
      tracks: state.tracks?.map(({ id, name, volume, pan, lowPass, highPass, muted }) => ({
        id, name, volume, pan, lowPass, highPass, muted,
      })),
      reverb: state.reverb,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persistable))
  } catch (e) {
    // ignore
  }
}

export const useAudioStore = create<AudioState>((set, get) => ({
  ...defaultState,

  addTrack: () => set((state) => {
    if (state.tracks.length >= 4) return state
    const newTrack = createDefaultTrack(state.tracks.length)
    const newState = { ...state, tracks: [...state.tracks, newTrack] }
    persistState(newState)
    return newState
  }),

  removeTrack: (id: string) => set((state) => {
    const newState = { ...state, tracks: state.tracks.filter((t) => t.id !== id) }
    persistState(newState)
    return newState
  }),

  updateTrack: (id: string, updates: Partial<Track>) => set((state) => {
    const newState = {
      ...state,
      tracks: state.tracks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    }
    persistState(newState)
    return newState
  }),

  setTrackAudio: (id: string, url: string, name: string) => set((state) => ({
    ...state,
    tracks: state.tracks.map((t) => (t.id === id ? { ...t, audioUrl: url, name } : t)),
  })),

  selectTrack: (id: string | null) => set((state) => ({
    ...state,
    selectedTrackId: id,
    tracks: state.tracks.map((t) => ({ ...t, selected: t.id === id })),
  })),

  setReverb: (reverb: Partial<Reverb>) => set((state) => {
    const newState = { ...state, reverb: { ...state.reverb, ...reverb } }
    persistState(newState)
    return newState
  }),

  setPlaying: (playing: boolean) => set({ isPlaying: playing }),

  setCurrentTime: (time: number) => set({ currentTime: time }),

  resetAll: () => {
    const newTracks = Array.from({ length: 4 }, (_, i) => createDefaultTrack(i))
    const newState = {
      tracks: newTracks,
      reverb: { enabled: false, wet: 0.3, roomSize: 'medium' as const },
      isPlaying: false,
      currentTime: 0,
      selectedTrackId: null,
    }
    set(newState)
    persistState(newState)
  },

  loadFromStorage: () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (!saved) return
      const parsed = JSON.parse(saved)
      if (parsed.tracks && parsed.reverb) {
        const mergedTracks = defaultState.tracks.map((dt, i) => {
          const saved = parsed.tracks[i]
          if (saved) {
            return { ...dt, ...saved, selected: false }
          }
          return dt
        })
        set({
          tracks: mergedTracks,
          reverb: { ...defaultState.reverb, ...parsed.reverb },
        })
      }
    } catch (e) {
      // ignore
    }
  },
}))
