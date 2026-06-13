import { create } from 'zustand'
import type { Track, Message } from './api'

interface StudioState {
  tracks: Track[]
  messages: Message[]
  isPlaying: boolean
  currentTime: number
  duration: number
  selectedTrackId: string | null
  isRecording: boolean
  setTracks: (tracks: Track[]) => void
  updateTrackInList: (id: string, data: Partial<Track>) => void
  setMessages: (messages: Message[]) => void
  addMessage: (message: Message) => void
  setIsPlaying: (playing: boolean) => void
  setCurrentTime: (time: number) => void
  setSelectedTrackId: (id: string | null) => void
  setIsRecording: (recording: boolean) => void
  reorderTracks: (startIndex: number, endIndex: number) => void
}

export const useStudioStore = create<StudioState>((set) => ({
  tracks: [],
  messages: [],
  isPlaying: false,
  currentTime: 0,
  duration: 120,
  selectedTrackId: null,
  isRecording: false,

  setTracks: (tracks) => set({ tracks }),

  updateTrackInList: (id, data) =>
    set((state) => ({
      tracks: state.tracks.map((t) => (t._id === id ? { ...t, ...data } : t)),
    })),

  setMessages: (messages) => set({ messages }),

  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),

  setIsPlaying: (isPlaying) => set({ isPlaying }),

  setCurrentTime: (currentTime) => set({ currentTime }),

  setSelectedTrackId: (selectedTrackId) => set({ selectedTrackId }),

  setIsRecording: (isRecording) => set({ isRecording }),

  reorderTracks: (startIndex, endIndex) =>
    set((state) => {
      const newTracks = [...state.tracks]
      const [removed] = newTracks.splice(startIndex, 1)
      newTracks.splice(endIndex, 0, removed)
      return {
        tracks: newTracks.map((t, i) => ({ ...t, order: i })),
      }
    }),
}))
