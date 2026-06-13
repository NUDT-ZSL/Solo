import axios from 'axios'

export interface Track {
  _id: string
  name: string
  instrument: string
  member: string
  color: string
  muted: boolean
  solo: boolean
  volume: number
  pan: number
  order: number
  waveformData: number[]
  duration: number
}

export interface Message {
  _id: string
  type: 'text' | 'voice'
  content: string
  sender: string
  timestamp: number
  duration?: number
  waveformData?: number[]
}

const api = axios.create({ baseURL: '/api' })

export async function fetchTracks(): Promise<Track[]> {
  const res = await api.get('/tracks')
  return res.data
}

export async function updateTrack(id: string, data: Partial<Track>): Promise<Track> {
  const res = await api.put(`/tracks/${id}`, data)
  return res.data
}

export async function deleteTrack(id: string): Promise<void> {
  await api.delete(`/tracks/${id}`)
}

export async function reorderTracks(orders: { id: string; order: number }[]): Promise<Track[]> {
  const res = await api.put('/tracks/reorder', { orders })
  return res.data
}

export async function fetchMessages(): Promise<Message[]> {
  const res = await api.get('/messages')
  return res.data
}

export async function postMessage(message: Omit<Message, '_id' | 'timestamp'>): Promise<Message> {
  const res = await api.post('/messages', message)
  return res.data
}
