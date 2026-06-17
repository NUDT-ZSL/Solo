import axios from 'axios'
import type { MarkerPoint, RouteData } from '../store'

export interface RouteRequest {
  markers: Array<{
    id: string
    lat: number
    lng: number
    duration: number
  }>
}

export interface BudgetRequest {
  totalDistance: number
  totalHours: number
  markerCount: number
}

export interface BudgetResponse {
  transportCost: number
  accommodationCost: number
  foodCost: number
  totalBudget: number
}

const api = axios.create({
  baseURL: '/api',
  timeout: 10000
})

export const generateRoute = async (markers: MarkerPoint[]): Promise<RouteData> => {
  const requestData: RouteRequest = {
    markers: markers.map((m) => ({
      id: m.id,
      lat: m.lat,
      lng: m.lng,
      duration: m.duration
    }))
  }
  const response = await api.post<RouteData>('/route', requestData)
  return response.data
}

export const estimateBudget = async (
  totalDistance: number,
  totalHours: number,
  markerCount: number
): Promise<BudgetResponse> => {
  const requestData: BudgetRequest = {
    totalDistance,
    totalHours,
    markerCount
  }
  const response = await api.post<BudgetResponse>('/budget', requestData)
  return response.data
}
