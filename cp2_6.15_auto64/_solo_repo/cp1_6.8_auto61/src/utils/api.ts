export interface Bottle {
  id: string
  content: string
  tag: string
  color: string
  resonances: number
  createdAt: string
  userId: string
  resonatedBy: string[]
}

export interface CreateBottleRequest {
  content: string
  tag: string
  userId: string
}

export interface ResonateRequest {
  bottleId: string
  userId: string
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

const API_BASE = '/api'

async function request<T>(url: string, options?: RequestInit): Promise<ApiResponse<T>> {
  try {
    const resp = await fetch(`${API_BASE}${url}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    })
    const data = await resp.json()
    return data
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

export async function fetchAllBottles(): Promise<ApiResponse<Bottle[]>> {
  return request<Bottle[]>('/bottles')
}

export async function fetchUserBottles(userId: string): Promise<ApiResponse<Bottle[]>> {
  return request<Bottle[]>(`/bottles?userId=${encodeURIComponent(userId)}`)
}

export async function createBottle(payload: CreateBottleRequest): Promise<ApiResponse<Bottle>> {
  return request<Bottle>('/bottles', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function resonateBottle(payload: ResonateRequest): Promise<ApiResponse<Bottle>> {
  return request<Bottle>('/resonate', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function fetchMyBottles(userId: string): Promise<ApiResponse<{ sent: Bottle[]; resonated: Bottle[] }>> {
  return request<{ sent: Bottle[]; resonated: Bottle[] }>(`/my-bottles?userId=${encodeURIComponent(userId)}`)
}

export const SCENT_TAGS = [
  { label: '雨后泥土', color: '#8B6914' },
  { label: '老樟木箱', color: '#C4A35A' },
  { label: '海风咸味', color: '#4A9BD9' },
  { label: '桂花甜香', color: '#FFD700' },
  { label: '旧书墨香', color: '#8B7355' },
  { label: '晨露草青', color: '#6B8E23' },
  { label: '焦糖暖意', color: '#D2691E' },
  { label: '雪松清冷', color: '#5F9EA0' },
  { label: '柚子酸涩', color: '#FF8C00' },
  { label: '烟火人间', color: '#CD5C5C' },
] as const

export type ScentTag = (typeof SCENT_TAGS)[number]['label']

export function getTagColor(tag: string): string {
  const found = SCENT_TAGS.find(t => t.label === tag)
  return found ? found.color : '#4A9BD9'
}

export function formatTime(isoString: string): string {
  const d = new Date(isoString)
  const month = d.getMonth() + 1
  const day = d.getDate()
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${month}月${day}日 ${hours}:${minutes}`
}
