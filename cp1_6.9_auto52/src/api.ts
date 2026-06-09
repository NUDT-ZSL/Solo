import type { MoodRecord } from './types'

const BASE_URL = '/api/moods'

export async function fetchMoods(): Promise<MoodRecord[]> {
  const res = await fetch(BASE_URL)
  if (!res.ok) throw new Error('Failed to fetch moods')
  return res.json()
}

export async function createMood(
  data: Omit<MoodRecord, 'id' | 'timestamp'>,
): Promise<MoodRecord[]> {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to create mood')
  return res.json()
}

export async function deleteLatestMood(): Promise<MoodRecord[]> {
  const res = await fetch(`${BASE_URL}/latest`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error('Failed to delete latest mood')
  return res.json()
}
