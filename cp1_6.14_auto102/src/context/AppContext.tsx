import React, { createContext, useContext, useReducer, ReactNode } from 'react'
import { AppState, AppAction, SoundTrackItem } from '../types'

const initialState: AppState = {
  tracks: [],
  masterVolume: 80,
  isPlaying: false,
  currentPreset: null,
  soloTrackId: null,
}

const appReducer = (state: AppState, action: AppAction): AppState => {
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
      const newSoloId = state.soloTrackId === action.payload ? null : state.soloTrackId
      return {
        ...state,
        tracks: state.tracks.filter((t) => t.id !== action.payload),
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
      const newSoloId = state.soloTrackId === action.payload ? null : action.payload
      return {
        ...state,
        tracks: state.tracks.map((t) => ({
          ...t,
          solo: t.id === newSoloId,
        })),
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
    case 'SET_PLAYING':
      return {
        ...state,
        isPlaying: action.payload,
      }
    case 'SET_PRESET':
      return {
        ...state,
        currentPreset: action.payload,
      }
    case 'LOAD_PRESET':
      return {
        ...state,
        tracks: action.payload.tracks.map((t) => ({
          ...t,
          eq: t.eq || { low: 0, mid: 0, high: 0 },
        })),
        masterVolume: action.payload.masterVolume,
        currentPreset: action.payload,
        soloTrackId: null,
      }
    case 'CLEAR_TRACKS':
      return {
        ...state,
        tracks: [],
        currentPreset: null,
        soloTrackId: null,
      }
    case 'SET_TRACK_EQ':
      return {
        ...state,
        tracks: state.tracks.map((t) =>
          t.id === action.payload.id ? { ...t, eq: action.payload.eq } : t
        ),
      }
    default:
      return state
  }
}

interface AppContextType {
  state: AppState
  dispatch: React.Dispatch<AppAction>
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState)

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = (): AppContextType => {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
}

export default AppContext
