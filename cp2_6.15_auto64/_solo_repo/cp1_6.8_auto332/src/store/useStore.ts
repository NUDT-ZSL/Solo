import { create } from 'zustand'
import { VoiceMessage, EchoConnection } from '@/types'

interface AppState {
  anonymousId: string
  currentVoice: VoiceMessage | null
  connections: EchoConnection[]
  isPlaying: boolean
  isRecording: boolean
  showResponsePanel: boolean
  showConnectionList: boolean
  setAnonymousId: (id: string) => void
  setCurrentVoice: (voice: VoiceMessage | null) => void
  setConnections: (connections: EchoConnection[]) => void
  addConnection: (connection: EchoConnection) => void
  setIsPlaying: (playing: boolean) => void
  setIsRecording: (recording: boolean) => void
  setShowResponsePanel: (show: boolean) => void
  setShowConnectionList: (show: boolean) => void
}

const getOrCreateAnonymousId = (): string => {
  const stored = localStorage.getItem('echo_anonymous_id')
  if (stored) return stored
  const newId = 'echo_' + Math.random().toString(36).substring(2, 10)
  localStorage.setItem('echo_anonymous_id', newId)
  return newId
}

const loadLocalConnections = (): EchoConnection[] => {
  const stored = localStorage.getItem('echo_connections')
  if (stored) {
    try { return JSON.parse(stored) } catch { return [] }
  }
  return []
}

const saveLocalConnections = (connections: EchoConnection[]) => {
  localStorage.setItem('echo_connections', JSON.stringify(connections))
}

export const useStore = create<AppState>((set, get) => ({
  anonymousId: getOrCreateAnonymousId(),
  currentVoice: null,
  connections: loadLocalConnections(),
  isPlaying: false,
  isRecording: false,
  showResponsePanel: false,
  showConnectionList: false,
  setAnonymousId: (id) => {
    localStorage.setItem('echo_anonymous_id', id)
    set({ anonymousId: id })
  },
  setCurrentVoice: (voice) => set({ currentVoice: voice }),
  setConnections: (connections) => {
    saveLocalConnections(connections)
    set({ connections })
  },
  addConnection: (connection) => {
    const updated = [...get().connections, connection]
    saveLocalConnections(updated)
    set({ connections: updated })
  },
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setIsRecording: (recording) => set({ isRecording: recording }),
  setShowResponsePanel: (show) => set({ showResponsePanel: show }),
  setShowConnectionList: (show) => set({ showConnectionList: show }),
}))
