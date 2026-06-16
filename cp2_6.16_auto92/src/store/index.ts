import { create } from 'zustand'
import type { Movie, ScheduleItem } from '@/types'
import { fetchMovies as fetchMoviesApi } from '@/utils/api'

interface MovieState {
  movies: Movie[]
  scheduleItems: ScheduleItem[]
  addMovieToSchedule: (movieId: string) => void
  removeMovieFromSchedule: (movieId: string) => void
  reorderSchedule: (fromIndex: number, toIndex: number) => void
  clearSchedule: () => void
  setMovies: (movies: Movie[]) => void
  fetchMovies: () => Promise<void>
}

export const useMovieStore = create<MovieState>((set, get) => ({
  movies: [],
  scheduleItems: [],

  addMovieToSchedule: (movieId: string) => {
    const { scheduleItems } = get()
    if (scheduleItems.some((item) => item.movieId === movieId)) return
    set({
      scheduleItems: [
        ...scheduleItems,
        { movieId, order: scheduleItems.length },
      ],
    })
  },

  removeMovieFromSchedule: (movieId: string) => {
    const { scheduleItems } = get()
    const filtered = scheduleItems
      .filter((item) => item.movieId !== movieId)
      .map((item, index) => ({ ...item, order: index }))
    set({ scheduleItems: filtered })
  },

  reorderSchedule: (fromIndex: number, toIndex: number) => {
    const { scheduleItems } = get()
    const items = [...scheduleItems]
    const [removed] = items.splice(fromIndex, 1)
    items.splice(toIndex, 0, removed)
    const reordered = items.map((item, index) => ({ ...item, order: index }))
    set({ scheduleItems: reordered })
  },

  clearSchedule: () => {
    set({ scheduleItems: [] })
  },

  setMovies: (movies: Movie[]) => {
    set({ movies })
  },

  fetchMovies: async () => {
    try {
      const movies = await fetchMoviesApi()
      set({ movies })
    } catch (error) {
      console.error('Failed to fetch movies:', error)
    }
  },
}))
