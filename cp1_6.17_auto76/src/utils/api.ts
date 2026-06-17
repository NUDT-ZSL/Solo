import axios from 'axios'
import type { MarkerPoint, RouteData, BudgetData } from '../store'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000
})

export async function calculateRoute(markers: MarkerPoint[]): Promise<RouteData> {
  const response = await api.post<RouteData>('/route', { markers })
  return response.data
}

export async function estimateBudget(
  markers: MarkerPoint[],
  totalDistanceKm: number,
  totalHours: number
): Promise<BudgetData> {
  const response = await api.post<BudgetData>('/budget', {
    markers,
    totalDistanceKm,
    totalHours
  })
  return response.data
}
