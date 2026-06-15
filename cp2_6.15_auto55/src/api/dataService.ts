import type { GeologyLayer, ParticleData, QueryResult, ApiResponse } from '@/types'

async function fetchData<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }
  const result: ApiResponse<T> = await response.json()
  return result.data
}

export function getLayers(): Promise<GeologyLayer[]> {
  return fetchData<GeologyLayer[]>('/api/layers')
}

export function getParticles(time: number): Promise<ParticleData[]> {
  return fetchData<ParticleData[]>(`/api/particles?time=${time}`)
}

export function queryPoint(x: number, y: number, z: number): Promise<QueryResult> {
  return fetchData<QueryResult>(`/api/query?x=${x}&y=${y}&z=${z}`)
}
