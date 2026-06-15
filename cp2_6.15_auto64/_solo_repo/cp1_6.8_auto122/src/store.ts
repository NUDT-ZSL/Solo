import { create } from 'zustand'
import type { MoodRecord, MoodStats, WeatherType } from './MoodEngine'
import { calculateStats } from './MoodEngine'
import * as api from './api'

interface MoodState {
  records: MoodRecord[]
  stats: MoodStats
  currentYear: number
  currentMonth: number
  selectedRecord: MoodRecord | null
  isModalOpen: boolean
  isFormOpen: boolean
  editingRecord: MoodRecord | null
  filterWeather: WeatherType | null
  loading: boolean
  error: string | null

  setCurrentMonth: (year: number, month: number) => void
  loadRecords: () => Promise<void>
  addRecord: (data: { date: string; weather: WeatherType; diary: string; intensity: number }) => Promise<void>
  updateRecord: (id: string, data: { date: string; weather: WeatherType; diary: string; intensity: number }) => Promise<void>
  deleteRecord: (id: string) => Promise<void>
  selectRecord: (record: MoodRecord | null) => void
  openModal: (record: MoodRecord) => void
  closeModal: () => void
  openForm: (record?: MoodRecord) => void
  closeForm: () => void
  setFilterWeather: (weather: WeatherType | null) => void
}

export const useMoodStore = create<MoodState>((set, get) => ({
  records: [],
  stats: { sunny: 0, cloudy: 0, rainy: 0, snowy: 0, stormy: 0 },
  currentYear: new Date().getFullYear(),
  currentMonth: new Date().getMonth(),
  selectedRecord: null,
  isModalOpen: false,
  isFormOpen: false,
  editingRecord: null,
  filterWeather: null,
  loading: false,
  error: null,

  setCurrentMonth: (year, month) => {
    set({ currentYear: year, currentMonth: month })
    get().loadRecords()
  },

  loadRecords: async () => {
    const { currentYear, currentMonth } = get()
    set({ loading: true, error: null })
    try {
      const records = await api.fetchMoods(currentYear, currentMonth + 1)
      const stats = calculateStats(records)
      set({ records, stats, loading: false })
    } catch (err) {
      const localRecords = getLocalRecords(currentYear, currentMonth + 1)
      const stats = calculateStats(localRecords)
      set({ records: localRecords, stats, loading: false })
      if (localRecords.length === 0) {
        set({ error: err instanceof Error ? err.message : 'Failed to load' })
      }
    }
  },

  addRecord: async (data) => {
    try {
      const record = await api.addMood(data)
      set(state => {
        const records = [...state.records, record]
        return { records, stats: calculateStats(records) }
      })
    } catch {
      const record: MoodRecord = {
        id: Date.now().toString(36) + Math.random().toString(36).substring(2, 9),
        ...data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      saveLocalRecord(record)
      set(state => {
        const records = [...state.records, record]
        return { records, stats: calculateStats(records) }
      })
    }
  },

  updateRecord: async (id, data) => {
    try {
      const updated = await api.updateMood(id, data)
      set(state => {
        const records = state.records.map(r => r.id === id ? updated : r)
        return { records, stats: calculateStats(records) }
      })
    } catch {
      const updated: MoodRecord = {
        id,
        ...data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      saveLocalRecord(updated)
      set(state => {
        const records = state.records.map(r => r.id === id ? updated : r)
        return { records, stats: calculateStats(records) }
      })
    }
  },

  deleteRecord: async (id) => {
    try {
      await api.deleteMood(id)
    } catch {
      removeLocalRecord(id)
    }
    set(state => {
      const records = state.records.filter(r => r.id !== id)
      return { records, stats: calculateStats(records) }
    })
  },

  selectRecord: (record) => set({ selectedRecord: record }),

  openModal: (record) => set({ selectedRecord: record, isModalOpen: true }),
  closeModal: () => set({ isModalOpen: false, selectedRecord: null }),
  openForm: (record) => set({ isFormOpen: true, editingRecord: record ?? null }),
  closeForm: () => set({ isFormOpen: false, editingRecord: null }),

  setFilterWeather: (weather) => {
    const current = get().filterWeather
    set({ filterWeather: current === weather ? null : weather })
  },
}))

const LOCAL_KEY = 'mood_records'

function getLocalRecords(year: number, month: number): MoodRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    if (!raw) return []
    const all: MoodRecord[] = JSON.parse(raw)
    return all.filter(r => {
      const d = new Date(r.date)
      return d.getFullYear() === year && d.getMonth() + 1 === month
    })
  } catch {
    return []
  }
}

function saveLocalRecord(record: MoodRecord) {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    const all: MoodRecord[] = raw ? JSON.parse(raw) : []
    const idx = all.findIndex(r => r.id === record.id)
    if (idx >= 0) all[idx] = record
    else all.push(record)
    localStorage.setItem(LOCAL_KEY, JSON.stringify(all))
  } catch { /* ignore */ }
}

function removeLocalRecord(id: string) {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    if (!raw) return
    const all: MoodRecord[] = JSON.parse(raw)
    const filtered = all.filter(r => r.id !== id)
    localStorage.setItem(LOCAL_KEY, JSON.stringify(filtered))
  } catch { /* ignore */ }
}
