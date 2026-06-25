export interface User {
  id: string
  username: string
  email: string
  role: 'admin' | 'user'
}

export interface Stall {
  id: string
  marketId: string
  stallNumber: string
  category: string
  price: number
  status: 'available' | 'booked' | 'cancelled'
  bookedBy?: string
  bookedAt?: string
}

export interface Market {
  id: string
  name: string
  date: string
  location: string
  description: string
  totalStalls: number
  availableStalls: number
  stalls: Stall[]
  createdAt: string
}

export interface Feedback {
  id: string
  marketId: string
  userId: string
  username: string
  rating: number
  comment: string
  createdAt: string
}

export interface MarketStats {
  totalMarkets: number
  totalStalls: number
  bookedStalls: number
  totalRevenue: number
  averageRating: number
  feedbackCount: number
}

export interface BookingHistory {
  id: string
  marketId: string
  marketName: string
  stallNumber: string
  category: string
  price: number
  status: 'booked' | 'cancelled'
  bookedAt: string
  cancelledAt?: string
}

interface LoginResponse {
  token: string
  user: User
}

const BASE_URL = '/api'

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${BASE_URL}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.message || `请求失败: ${response.status}`)
  }

  return response.json()
}

export function showToast(message: string, type: 'success' | 'error' = 'success') {
  const existingToast = document.getElementById('toast-message')
  if (existingToast) {
    existingToast.remove()
  }

  const toast = document.createElement('div')
  toast.id = 'toast-message'
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 24px;
    border-radius: 8px;
    color: white;
    font-size: 14px;
    z-index: 9999;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    transition: opacity 0.3s ease;
    background-color: ${type === 'success' ? '#52c41a' : '#ff4d4f'};
  `
  toast.textContent = message
  document.body.appendChild(toast)

  setTimeout(() => {
    toast.style.opacity = '0'
    setTimeout(() => {
      if (toast.parentNode) {
        toast.remove()
      }
    }, 300)
  }, 2000)
}

export async function getMarkets(): Promise<Market[]> {
  return request<Market[]>('/markets')
}

export async function getMarket(id: string): Promise<Market> {
  return request<Market>(`/markets/${id}`)
}

export async function createMarket(data: Omit<Market, 'id' | 'createdAt' | 'stalls' | 'availableStalls'>): Promise<Market> {
  return request<Market>('/markets', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function bookStall(marketId: string, stallId: string): Promise<Stall> {
  return request<Stall>(`/markets/${marketId}/stalls/${stallId}/book`, {
    method: 'POST',
  })
}

export async function cancelStall(marketId: string, stallId: string): Promise<Stall> {
  return request<Stall>(`/markets/${marketId}/stalls/${stallId}/cancel`, {
    method: 'POST',
  })
}

export async function submitFeedback(marketId: string, data: Omit<Feedback, 'id' | 'userId' | 'username' | 'createdAt'>): Promise<Feedback> {
  return request<Feedback>(`/markets/${marketId}/feedback`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function getFeedback(marketId: string): Promise<Feedback[]> {
  return request<Feedback[]>(`/markets/${marketId}/feedback`)
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  return request<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
}

export async function getUserHistory(): Promise<BookingHistory[]> {
  return request<BookingHistory[]>('/user/history')
}

export async function getMarketStats(): Promise<MarketStats> {
  return request<MarketStats>('/stats')
}
