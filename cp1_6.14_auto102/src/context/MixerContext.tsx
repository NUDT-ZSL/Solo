import React, { createContext, useContext, useReducer, useCallback } from 'react'
import type { MixerState, MixerAction, TrackState, EQSettings } from '../types'

const initialState: MixerState = {
  tracks: [],
  masterVolume: 80,
  isPlaying: false,
  soloTrackId: null,
}

const mixerReducer = (state: MixerState, action: MixerAction): MixerState => {
  switch (action.type) {
    case 'ADD_TRACK': {
      const exists = state.tracks.some((t) => t.soundId === action.payload.soundId)
      if (exists) return state
      return {
        ...state,
        tracks: [...state.tracks, action.payload],
      }
    }
    case 'REMOVE_TRACK': {
      const newTracks = state.tracks.filter((t) => t.id !== action.payload)
      const newSoloId = state.soloTrackId === action.payload ? null : state.soloTrackId
      return {
        ...state,
        tracks: newTracks,
        soloTrackId: newSoloId,
      }
    }
    case 'SET_TRACK_VOLUME':
      return {
        ...state,
        tracks: state.tracks.map((t) =>
          t.id === action.payload.id ? { ...t, volume: action.payload.volume } : t
        ),
      }
    case 'TOGGLE_MUTE':
      return {
        ...state,
        tracks: state.tracks.map((t) =>
          t.id === action.payload ? { ...t, muted: !t.muted } : t
        ),
      }
    case 'TOGGLE_SOLO': {
      const clickedTrack = state.tracks.find((t) => t.id === action.payload)
      if (!clickedTrack) return state
      const newSoloId = state.soloTrackId === action.payload ? null : action.payload
      const newTracks = state.tracks.map((t) => ({
        ...t,
        solo: t.id === newSoloId,
      }))
      return {
        ...state,
        tracks: newTracks,
        soloTrackId: newSoloId,
      }
    }
    case 'SET_MASTER_VOLUME':
      return {
        ...state,
        masterVolume: action.payload,
      }
    case 'TOGGLE_PLAY':
      return {
        ...state,
        isPlaying: !state.isPlaying,
      }
    case 'SET_TRACK_EQ':
      return {
        ...state,
        tracks: state.tracks.map((t) =>
          t.id === action.payload.id
            ? { ...t, eq: { ...t.eq, ...action.payload.eq } }
            : t
        ),
      }
    case 'LOAD_PRESET':
      return {
        ...state,
        tracks: action.payload,
        soloTrackId: null,
      }
    case 'CLEAR_TRACKS':
      return {
        ...state,
        tracks: [],
        soloTrackId: null,
      }
    default:
      return state
  }
}

interface MixerContextType {
  state: MixerState
  addTrack: (soundId: string, name: string, emoji: string) => void
  removeTrack: (id: string) => void
  setTrackVolume: (id: string, volume: number) => void
  toggleMute: (id: string) => void
  toggleSolo: (id: string) => void
  setMasterVolume: (volume: number) => void
  togglePlay: () => void
  setTrackEQ: (id: string, eq: Partial<EQSettings>) => void
  loadPreset: (tracks: TrackState[]) => void
  clearTracks: () => void
}

const MixerContext = createContext<MixerContextType | null>(null)

export const MixerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(mixerReducer, initialState)

  const addTrack = useCallback((soundId: string, name: string, emoji: string) => {
    const id = `${soundId}-${Date.now()}`
    const newTrack: TrackState = {
      id,
      soundId,
      name,
      emoji,
      volume: 70,
      muted: false,
      solo: false,
      eq: { low: 0, mid: 0, high: 0 },
    }
    dispatch({ type: 'ADD_TRACK', payload: newTrack })
  }, [])

  const removeTrack = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_TRACK', payload: id })
  }, [])

  const setTrackVolume = useCallback((id: string, volume: number) => {
    dispatch({ type: 'SET_TRACK_VOLUME', payload: { id, volume } })
  }, [])

  const toggleMute = useCallback((id: string) => {
    dispatch({ type: 'TOGGLE_MUTE', payload: id })
  }, [])

  const toggleSolo = useCallback((id: string) => {
    dispatch({ type: 'TOGGLE_SOLO', payload: id })
  }, [])

  const setMasterVolume = useCallback((volume: number) => {
    dispatch({ type: 'SET_MASTER_VOLUME', payload: volume })
  }, [])

  const togglePlay = useCallback(() => {
    dispatch({ type: 'TOGGLE_PLAY' })
  }, [])

  const setTrackEQ = useCallback((id: string, eq: Partial<EQSettings>) => {
    dispatch({ type: 'SET_TRACK_EQ', payload: { id, eq } })
  }, [])

  const loadPreset = useCallback((tracks: TrackState[]) => {
    dispatch({ type: 'LOAD_PRESET', payload: tracks })
  }, [])

  const clearTracks = useCallback(() => {
    dispatch({ type: 'CLEAR_TRACKS' })
  }, [])

  const value: MixerContextType = {
    state,
    addTrack,
    removeTrack,
    setTrackVolume,
    toggleMute,
    toggleSolo,
    setMasterVolume,
    togglePlay,
    setTrackEQ,
    loadPreset,
    clearTracks,
  }

  return <MixerContext.Provider value={value}>{children}</MixerContext.Provider>
}

export const useMixer = () => {
  const context = useContext(MixerContext)
  if (!context) {
    throw new Error('useMixer must be used within a MixerProvider')
  }
  return context
}
