import type { Event, EventStats, Participant, CreateEventDto, RegisterDto, CheckInDto, ApiResponse } from '../types'

const BASE_URL = '/api/events'

async function handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
  try {
    const data = await response.json()
    if (!response.ok) {
      return { error: data.error || '请求失败' }
    }
    return { data: data.data }
  } catch {
    return { error: '网络错误' }
  }
}

export async function getEvents(): Promise<ApiResponse<Event[]>> {
  try {
    const response = await fetch(BASE_URL)
    return handleResponse<Event[]>(response)
  } catch {
    return { error: '网络错误' }
  }
}

export async function getEvent(id: string): Promise<ApiResponse<Event>> {
  try {
    const response = await fetch(`${BASE_URL}/${id}`)
    return handleResponse<Event>(response)
  } catch {
    return { error: '网络错误' }
  }
}

export async function createEvent(event: CreateEventDto): Promise<ApiResponse<Event>> {
  try {
    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(event)
    })
    return handleResponse<Event>(response)
  } catch {
    return { error: '网络错误' }
  }
}

export async function updateEvent(id: string, event: CreateEventDto): Promise<ApiResponse<Event>> {
  try {
    const response = await fetch(`${BASE_URL}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(event)
    })
    return handleResponse<Event>(response)
  } catch {
    return { error: '网络错误' }
  }
}

export async function deleteEvent(id: string): Promise<ApiResponse<{ success: boolean }>> {
  try {
    const response = await fetch(`${BASE_URL}/${id}`, {
      method: 'DELETE'
    })
    return handleResponse<{ success: boolean }>(response)
  } catch {
    return { error: '网络错误' }
  }
}

export async function registerEvent(id: string, data: RegisterDto): Promise<ApiResponse<Participant>> {
  try {
    const response = await fetch(`${BASE_URL}/${id}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })
    return handleResponse<Participant>(response)
  } catch {
    return { error: '网络错误' }
  }
}

export async function checkInEvent(id: string, data: CheckInDto): Promise<ApiResponse<Participant>> {
  try {
    const response = await fetch(`${BASE_URL}/${id}/checkin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })
    return handleResponse<Participant>(response)
  } catch {
    return { error: '网络错误' }
  }
}

export async function getStats(): Promise<ApiResponse<EventStats[]>> {
  try {
    const response = await fetch(`${BASE_URL}/stats`)
    return handleResponse<EventStats[]>(response)
  } catch {
    return { error: '网络错误' }
  }
}
