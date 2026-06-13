import axios from 'axios'
import type { Event, Registration, CreateEventRequest, RegisterRequest } from './types'

const api = axios.create({
  baseURL: '/api',
  timeout: 5000
})

export interface RegistrationsResponse {
  data: Registration[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export const eventsApi = {
  getEvents: (category?: string) => {
    const params = category ? { category } : {}
    return api.get<Event[]>('/events', { params }).then(res => res.data)
  },

  getEvent: (id: string) => {
    return api.get<Event>(`/events/${id}`).then(res => res.data)
  },

  createEvent: (eventData: CreateEventRequest) => {
    return api.post<Event>('/events', eventData).then(res => res.data)
  },

  getRegistrations: (eventId: string, page: number = 1, pageSize: number = 10) => {
    return api
      .get<RegistrationsResponse>(`/events/${eventId}/registrations`, {
        params: { page, pageSize }
      })
      .then(res => res.data)
  },

  register: (eventId: string, data: RegisterRequest) => {
    return api.post<Registration>(`/events/${eventId}/register`, data).then(res => res.data)
  },

  checkin: (eventId: string, checkinCode: string) => {
    return api
      .patch<Registration>(`/events/${eventId}/checkin`, { checkinCode })
      .then(res => res.data)
  }
}

export default api
