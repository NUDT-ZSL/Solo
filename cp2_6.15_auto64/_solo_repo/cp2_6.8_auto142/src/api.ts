import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 5000,
})

export interface JournalEntry {
  emotion: 'happy' | 'sad' | 'anxious' | 'calm' | 'excited'
  activities: string[]
  text: string
  timestamp?: string
}

export interface HeatmapData {
  day: string
  hour: number
  emotion: string | null
}

export interface RadarData {
  activity: string
  count: number
}

export interface TrendsResponse {
  heatmap: HeatmapData[]
  radar: RadarData[]
}

export const submitJournal = async (entry: JournalEntry) => {
  const response = await api.post('/journal', {
    ...entry,
    timestamp: new Date().toISOString(),
  })
  return response.data
}

export const getTrends = async (startDate: string, endDate: string) => {
  const response = await api.get<TrendsResponse>('/journal/trends', {
    params: {
      start_date: startDate,
      end_date: endDate,
    },
  })
  return response.data
}

export default api
