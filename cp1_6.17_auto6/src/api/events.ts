import axios from 'axios'
import type { Event, EventStats, Participant, CreateEventDto, RegisterDto, CheckInDto, ApiResponse } from '../types'

const BASE_URL = '/api/events'

async function handleRequest<T>(request: Promise<any>): Promise<ApiResponse<T>> {
  try {
    const response = await request
    return { data: response.data.data }
  } catch (error: any) {
    if (axios.isAxiosError(error) && error.response) {
      return { error: error.response.data.error || '请求失败' }
    }
    return { error: '网络错误' }
  }
}

export async function getEvents(): Promise<ApiResponse<Event[]>> {
  return handleRequest<Event[]>(axios.get(BASE_URL))
}

export async function getEvent(id: string): Promise<ApiResponse<Event>> {
  return handleRequest<Event>(axios.get(`${BASE_URL}/${id}`))
}

export async function createEvent(event: CreateEventDto): Promise<ApiResponse<Event>> {
  return handleRequest<Event>(axios.post(BASE_URL, event))
}

export async function updateEvent(id: string, event: CreateEventDto): Promise<ApiResponse<Event>> {
  return handleRequest<Event>(axios.put(`${BASE_URL}/${id}`, event))
}

export async function deleteEvent(id: string): Promise<ApiResponse<{ success: boolean }>> {
  return handleRequest<{ success: boolean }>(axios.delete(`${BASE_URL}/${id}`))
}

export async function registerEvent(id: string, data: RegisterDto): Promise<ApiResponse<Participant>> {
  return handleRequest<Participant>(axios.post(`${BASE_URL}/${id}/register`, data))
}

export async function checkInEvent(id: string, data: CheckInDto): Promise<ApiResponse<Participant>> {
  return handleRequest<Participant>(axios.post(`${BASE_URL}/${id}/checkin`, data))
}

export async function getStats(): Promise<ApiResponse<EventStats[]>> {
  return handleRequest<EventStats[]>(axios.get(`${BASE_URL}/stats`))
}
