import { create } from 'zustand'

interface AudioParams {
  frequency: number
  waveform: string
  duration: number
  attack: number
  decay: number
  sustain: number
  release: number
}

interface Emotion {
  id: string
  user_id: string
  text: string
  emoji: string
  color: string
  audio_params: AudioParams
  created_at: string
  resonance_count: number
}

interface Resonance {
  id: string
  emotion_id: string
  user_id: string
  tag: string
  created_at: string
}

interface User {
  user_id: string
  username: string
}

interface StoreState {
  user: User | null
  emotions: Emotion[]
  myEmotions: Emotion[]
  selectedEmotion: Emotion | null
  resonances: Resonance[]
  isRecordModalOpen: boolean
  editingEmotion: Emotion | null
  setUser: (user: User | null) => void
  fetchEmotions: () => Promise<void>
  fetchMyEmotions: () => Promise<void>
  createEmotion: (data: Omit<Emotion, 'id' | 'user_id' | 'created_at' | 'resonance_count'>) => Promise<void>
  updateEmotion: (id: string, data: Partial<Omit<Emotion, 'id' | 'user_id' | 'created_at' | 'resonance_count'>>) => Promise<void>
  deleteEmotion: (id: string) => Promise<void>
  selectEmotion: (emotion: Emotion | null) => void
  fetchResonances: (emotionId: string) => Promise<void>
  giveResonance: (emotionId: string, tag: string) => Promise<void>
  openRecordModal: () => void
  closeRecordModal: () => void
  setEditingEmotion: (emotion: Emotion | null) => void
  register: (username: string) => Promise<void>
  login: (userId: string) => Promise<void>
}

const getStoredUserId = (): string | null => {
  return localStorage.getItem('user-id')
}

const setStoredUserId = (id: string) => {
  localStorage.setItem('user-id', id)
}

const removeStoredUserId = () => {
  localStorage.removeItem('user-id')
}

export const useStore = create<StoreState>((set, get) => ({
  user: null,
  emotions: [],
  myEmotions: [],
  selectedEmotion: null,
  resonances: [],
  isRecordModalOpen: false,
  editingEmotion: null,

  setUser: (user) => set({ user }),

  fetchEmotions: async () => {
    const res = await fetch('/api/emotions')
    const data = await res.json()
    set({ emotions: data })
  },

  fetchMyEmotions: async () => {
    const { user } = get()
    if (!user) return
    const res = await fetch(`/api/emotions?user_id=${user.user_id}`)
    const data = await res.json()
    set({ myEmotions: data })
  },

  createEmotion: async (data) => {
    const { user } = get()
    if (!user) return
    const res = await fetch('/api/emotions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, user_id: user.user_id }),
    })
    const emotion = await res.json()
    set((state) => ({
      emotions: [emotion, ...state.emotions],
      myEmotions: [emotion, ...state.myEmotions],
    }))
  },

  updateEmotion: async (id, data) => {
    const res = await fetch(`/api/emotions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const updated = await res.json()
    set((state) => ({
      emotions: state.emotions.map((e) => (e.id === id ? updated : e)),
      myEmotions: state.myEmotions.map((e) => (e.id === id ? updated : e)),
      selectedEmotion: state.selectedEmotion?.id === id ? updated : state.selectedEmotion,
      editingEmotion: null,
    }))
  },

  deleteEmotion: async (id) => {
    await fetch(`/api/emotions/${id}`, { method: 'DELETE' })
    set((state) => ({
      emotions: state.emotions.filter((e) => e.id !== id),
      myEmotions: state.myEmotions.filter((e) => e.id !== id),
      selectedEmotion: state.selectedEmotion?.id === id ? null : state.selectedEmotion,
    }))
  },

  selectEmotion: (emotion) => set({ selectedEmotion: emotion }),

  fetchResonances: async (emotionId) => {
    const res = await fetch(`/api/emotions/${emotionId}/resonances`)
    const data = await res.json()
    set({ resonances: data })
  },

  giveResonance: async (emotionId, tag) => {
    const { user } = get()
    if (!user) return
    const res = await fetch(`/api/emotions/${emotionId}/resonances`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.user_id, tag }),
    })
    const resonance = await res.json()
    set((state) => ({
      resonances: [...state.resonances, resonance],
      emotions: state.emotions.map((e) =>
        e.id === emotionId ? { ...e, resonance_count: e.resonance_count + 1 } : e
      ),
      myEmotions: state.myEmotions.map((e) =>
        e.id === emotionId ? { ...e, resonance_count: e.resonance_count + 1 } : e
      ),
      selectedEmotion:
        state.selectedEmotion?.id === emotionId
          ? { ...state.selectedEmotion, resonance_count: state.selectedEmotion.resonance_count + 1 }
          : state.selectedEmotion,
    }))
  },

  openRecordModal: () => set({ isRecordModalOpen: true, editingEmotion: null }),

  closeRecordModal: () => set({ isRecordModalOpen: false, editingEmotion: null }),

  setEditingEmotion: (emotion) => set({ editingEmotion: emotion, isRecordModalOpen: true }),

  register: async (username) => {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    })
    const user = await res.json()
    setStoredUserId(user.user_id)
    set({ user })
  },

  login: async (userId) => {
    const res = await fetch(`/api/users/${userId}`)
    const user = await res.json()
    setStoredUserId(user.user_id)
    set({ user })
  },
}))

export type { Emotion, Resonance, User, AudioParams }
