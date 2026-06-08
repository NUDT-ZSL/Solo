import { create } from 'zustand'
import { HistoricalEvent, historicalEvents } from './data'

interface FilterState {
  centuries: number[]
  categories: string[]
}

interface TimelineStore {
  events: HistoricalEvent[]
  filteredEvents: HistoricalEvent[]
  selectedEvent: HistoricalEvent | null
  hoveredEvent: HistoricalEvent | null
  filters: FilterState
  setFilters: (filters: Partial<FilterState>) => void
  selectEvent: (event: HistoricalEvent | null) => void
  hoverEvent: (event: HistoricalEvent | null) => void
}

function applyFilters(events: HistoricalEvent[], filters: FilterState): HistoricalEvent[] {
  return events.filter((e) => {
    const centuryMatch = filters.centuries.length === 0 || filters.centuries.includes(e.century)
    const categoryMatch = filters.categories.length === 0 || filters.categories.includes(e.category)
    return centuryMatch && categoryMatch
  })
}

const allCenturies = [...new Set(historicalEvents.map((e) => e.century))].sort((a, b) => a - b)

export const useTimelineStore = create<TimelineStore>((set, get) => ({
  events: historicalEvents,
  filteredEvents: historicalEvents,
  selectedEvent: null,
  hoveredEvent: null,
  filters: {
    centuries: [],
    categories: [],
  },
  setFilters: (newFilters) => {
    const filters = { ...get().filters, ...newFilters }
    const filteredEvents = applyFilters(get().events, filters)
    set({ filters, filteredEvents })
  },
  selectEvent: (event) => set({ selectedEvent: event }),
  hoverEvent: (event) => set({ hoveredEvent: event }),
}))

export { allCenturies }
