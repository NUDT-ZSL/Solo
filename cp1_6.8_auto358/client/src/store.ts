import { create } from 'zustand'
import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

export interface Mystery {
  id: string
  audio_url: string
  type: string
  answer: string
  keywords: string
  created_at: string
  creator_id: string
}

export interface Connection {
  id: string
  mystery_id: string
  creator_id: string
  guesser_id: string
  created_at: string
  expires_at: string
  status: string
}

function getOrCreateUserId(): string {
  const stored = localStorage.getItem('mystery_radio_user_id')
  if (stored) return stored
  const id = crypto.randomUUID()
  localStorage.setItem('mystery_radio_user_id', id)
  return id
}

interface RadioStore {
  userId: string
  currentMystery: Mystery | null
  connections: Connection[]
  isRecording: boolean
  isPlaying: boolean
  fetchRandomMystery: () => Promise<void>
  submitMystery: (audioBlob: Blob, type: string, answer: string, keywords: string) => Promise<void>
  submitGuess: (mysteryId: string, answer: string) => Promise<{ correct: boolean; connection?: Connection }>
  fetchConnections: () => Promise<void>
}

export const useRadioStore = create<RadioStore>((set, get) => ({
  userId: getOrCreateUserId(),
  currentMystery: null,
  connections: [],
  isRecording: false,
  isPlaying: false,

  fetchRandomMystery: async () => {
    try {
      const { userId } = get()
      const res = await api.get<Mystery>('/mysteries/random', {
        params: { creator_id: userId },
      })
      set({ currentMystery: res.data })
    } catch {
      set({ currentMystery: null })
    }
  },

  submitMystery: async (audioBlob, type, answer, keywords) => {
    const { userId } = get()
    const form = new FormData()
    form.append('audio', audioBlob, 'mystery.webm')
    form.append('type', type)
    form.append('answer', answer)
    form.append('keywords', keywords)
    form.append('creator_id', userId)
    await api.post('/mysteries', form)
  },

  submitGuess: async (mysteryId, answer) => {
    const { userId } = get()
    const res = await api.post<{ correct: boolean; connection?: Connection }>('/guess', {
      mystery_id: mysteryId,
      answer,
      guesser_id: userId,
    })
    return res.data
  },

  fetchConnections: async () => {
    try {
      const { userId } = get()
      const res = await api.get<Connection[]>('/connections', {
        params: { user_id: userId },
      })
      set({ connections: res.data })
    } catch {
      set({ connections: [] })
    }
  },
}))
