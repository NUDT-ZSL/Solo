export interface ItineraryItem {
  id: string
  time: string
  location: string
  description: string
  photos: string[]
  date: string
}

export interface Expense {
  id: string
  category: 'transport' | 'food' | 'accommodation' | 'ticket'
  amount: number
  note: string
  date: string
}

export interface Trip {
  id: string
  destination: string
  startDate: string
  endDate: string
  budget: number
  mood: string
  createdAt: string
  itinerary: ItineraryItem[]
  expenses: Expense[]
}

export interface CreateTripInput {
  destination: string
  startDate: string
  endDate: string
  budget: number
  mood: string
}

const API_BASE = '/api'

async function request<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || `Request failed with status ${response.status}`)
  }

  if (response.status === 204) {
    return {} as T
  }

  return response.json()
}

export function getTrips(): Promise<Trip[]> {
  return request<Trip[]>('/trips')
}

export function createTrip(data: CreateTripInput): Promise<Trip> {
  return request<Trip>('/trips', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function getTripById(id: string): Promise<Trip> {
  return request<Trip>(`/trips/${id}`)
}

export function updateTrip(id: string, data: Partial<Trip>): Promise<Trip> {
  return request<Trip>(`/trips/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export function deleteTrip(id: string): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/trips/${id}`, {
    method: 'DELETE',
  })
}
