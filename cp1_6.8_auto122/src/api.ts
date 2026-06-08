import type { MoodRecord, MoodStats, WeatherType } from './MoodEngine'

const API_BASE = 'http://localhost:8000/api'

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    throw new Error(`API Error: ${res.status} ${res.statusText}`)
  }
  return res.json()
}

export async function fetchMoods(year?: number, month?: number): Promise<MoodRecord[]> {
  const params = new URLSearchParams()
  if (year !== undefined) params.set('year', String(year))
  if (month !== undefined) params.set('month', String(month))
  const query = params.toString() ? `?${params.toString()}` : ''
  return request<MoodRecord[]>(`/moods${query}`)
}

export async function addMood(data: { date: string; weather: WeatherType; diary: string; intensity: number }): Promise<MoodRecord> {
  return request<MoodRecord>('/moods', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateMood(id: string, data: { date: string; weather: WeatherType; diary: string; intensity: number }): Promise<MoodRecord> {
  return request<MoodRecord>(`/moods/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deleteMood(id: string): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/moods/${id}`, {
    method: 'DELETE',
  })
}

export async function fetchStats(year?: number, month?: number): Promise<MoodStats> {
  const params = new URLSearchParams()
  if (year !== undefined) params.set('year', String(year))
  if (month !== undefined) params.set('month', String(month))
  const query = params.toString() ? `?${params.toString()}` : ''
  return request<MoodStats>(`/moods/stats${query}`)
}
