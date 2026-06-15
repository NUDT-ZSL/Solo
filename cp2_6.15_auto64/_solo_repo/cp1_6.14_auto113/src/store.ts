import { create } from 'zustand'
import http from '@/http'

export interface Habit {
  id: string
  name: string
  tag: 'health' | 'study' | 'creative' | 'life'
  dailyGoal: number
  completedCount: number
  completed: boolean
  order: number
}

export interface UserProfile {
  id: string
  name: string
  exp: number
  level: number
  createdAt: string
}

export interface HabitStat {
  name: string
  tag: string
  completionRate: number
}

export interface RadarData {
  physical: number
  intelligence: number
  creativity: number
  social: number
  discipline: number
  emotion: number
}

export interface StatsData {
  weekly: HabitStat[]
  monthly: HabitStat[]
  radar: RadarData
}

interface AppState {
  habits: Habit[]
  profile: UserProfile | null
  stats: StatsData | null
  loading: boolean
  fetchHabits: () => Promise<void>
  addHabit: (habit: Partial<Habit>) => Promise<void>
  updateHabit: (id: string, data: Partial<Habit>) => Promise<void>
  deleteHabit: (id: string) => Promise<void>
  fetchProfile: () => Promise<void>
  updateProfile: (data: Partial<UserProfile>) => Promise<void>
  fetchStats: () => Promise<void>
}

export const useStore = create<AppState>((set) => ({
  habits: [],
  profile: null,
  stats: null,
  loading: false,

  fetchHabits: async () => {
    set({ loading: true })
    try {
      const res = await http.get<unknown, { success: boolean; data: Habit[] }>('/habits')
      if (res.success) set({ habits: res.data })
    } finally {
      set({ loading: false })
    }
  },

  addHabit: async (habit) => {
    const res = await http.post<unknown, { success: boolean; data: Habit }>('/habits', habit)
    if (res.success) {
      set((state) => ({ habits: [...state.habits, res.data] }))
    }
  },

  updateHabit: async (id, data) => {
    const res = await http.patch<unknown, { success: boolean; data: Habit }>(`/habits/${id}`, data)
    if (res.success) {
      set((state) => ({
        habits: state.habits.map((h) => (h.id === id ? res.data : h)),
      }))
    }
  },

  deleteHabit: async (id) => {
    await http.delete(`/habits/${id}`)
    set((state) => ({ habits: state.habits.filter((h) => h.id !== id) }))
  },

  fetchProfile: async () => {
    const res = await http.get<unknown, { success: boolean; data: UserProfile }>('/profile')
    if (res.success) set({ profile: res.data })
  },

  updateProfile: async (data) => {
    const res = await http.patch<unknown, { success: boolean; data: UserProfile }>('/profile', data)
    if (res.success) set({ profile: res.data })
  },

  fetchStats: async () => {
    const res = await http.get<unknown, { success: boolean; data: StatsData }>('/stats')
    if (res.success) set({ stats: res.data })
  },
}))
