import { PaletteVersion, ComparisonResult } from '../types'

const API_BASE = '/api'

export async function getVersions(): Promise<{ versions: PaletteVersion[], baselineId: string | null }> {
  const response = await fetch(`${API_BASE}/versions`)
  if (!response.ok) throw new Error('Failed to fetch versions')
  return response.json()
}

export async function createVersion(name: string, colors: { r: number; g: number; b: number }[]): Promise<PaletteVersion> {
  const response = await fetch(`${API_BASE}/versions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, colors })
  })
  if (!response.ok) throw new Error('Failed to create version')
  return response.json()
}

export async function deleteVersion(id: string): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE}/versions/${id}`, {
    method: 'DELETE'
  })
  if (!response.ok) throw new Error('Failed to delete version')
  return response.json()
}

export async function compareVersions(id1: string, id2: string): Promise<ComparisonResult> {
  const response = await fetch(`${API_BASE}/versions/compare?id1=${id1}&id2=${id2}`)
  if (!response.ok) throw new Error('Failed to compare versions')
  return response.json()
}

export async function setBaseline(id: string): Promise<{ success: boolean; baselineId: string }> {
  const response = await fetch(`${API_BASE}/versions/${id}/baseline`, {
    method: 'PUT'
  })
  if (!response.ok) throw new Error('Failed to set baseline')
  return response.json()
}

export async function reorderVersions(order: string[]): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE}/versions/reorder`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ order })
  })
  if (!response.ok) throw new Error('Failed to reorder versions')
  return response.json()
}
