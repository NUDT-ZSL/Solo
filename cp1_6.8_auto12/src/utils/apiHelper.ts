import type { Letter, CreateLetterPayload } from '../types'

const API_BASE = '/api/letters'

export async function fetchLetters(): Promise<Letter[]> {
  const res = await fetch(API_BASE)
  if (!res.ok) throw new Error('Failed to fetch letters')
  return res.json()
}

export async function fetchLetterById(id: string): Promise<Letter> {
  const res = await fetch(`${API_BASE}/${id}`)
  if (!res.ok) throw new Error('Failed to fetch letter')
  return res.json()
}

export async function createLetter(payload: CreateLetterPayload): Promise<Letter> {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error('Failed to create letter')
  return res.json()
}
