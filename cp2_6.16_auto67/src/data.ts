import type { Plant, User, CareLog } from './types'

const API_BASE = '/api'

export async function getPlants(): Promise<Plant[]> {
  const res = await fetch(`${API_BASE}/plants`)
  return res.json()
}

export async function getPlant(id: string): Promise<Plant> {
  const res = await fetch(`${API_BASE}/plants/${id}`)
  return res.json()
}

export async function adoptPlant(plantId: string, userId: string): Promise<Plant> {
  const res = await fetch(`${API_BASE}/adopt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plantId, userId }),
  })
  return res.json()
}

export async function getCurrentUser(): Promise<User> {
  const res = await fetch(`${API_BASE}/user/current`)
  return res.json()
}

export async function getCareLogs(plantId: string): Promise<CareLog[]> {
  const res = await fetch(`${API_BASE}/logs?plantId=${plantId}`)
  return res.json()
}

export async function addCareLog(
  plantId: string,
  userId: string,
  content: string,
  healthScore: number,
  photoFile?: File
): Promise<{ log: CareLog; user: User }> {
  const formData = new FormData()
  formData.append('plantId', plantId)
  formData.append('userId', userId)
  formData.append('content', content)
  formData.append('healthScore', String(healthScore))
  if (photoFile) {
    formData.append('photo', photoFile)
  }
  const res = await fetch(`${API_BASE}/log`, {
    method: 'POST',
    body: formData,
  })
  return res.json()
}

export async function getUserAdoptedPlants(userId: string): Promise<Plant[]> {
  const res = await fetch(`${API_BASE}/user/${userId}/plants`)
  return res.json()
}
