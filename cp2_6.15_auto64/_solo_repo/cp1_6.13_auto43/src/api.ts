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

interface CacheItem<T> {
  data: T
  timestamp: number
}

const eventsListCache = new Map<string, CacheItem<Event[]>>()
const eventDetailCache = new Map<string, CacheItem<Event>>()
const CACHE_TTL = 30 * 1000

function getFromCache<T>(cache: Map<string, CacheItem<T>>, key: string): T | null {
  const item = cache.get(key)
  if (item && Date.now() - item.timestamp < CACHE_TTL) {
    return item.data
  }
  return null
}

function setCache<T>(cache: Map<string, CacheItem<T>>, key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() })
}

function clearEventsListCache(): void {
  eventsListCache.clear()
}

function clearEventDetailCache(eventId?: string): void {
  if (eventId) {
    eventDetailCache.delete(eventId)
  } else {
    eventDetailCache.clear()
  }
}

export const eventsApi = {
  getEvents: (category?: string) => {
    const cacheKey = category || 'all'
    const cached = getFromCache(eventsListCache, cacheKey)
    if (cached) {
      return Promise.resolve(cached)
    }
    const params = category ? { category } : {}
    return api.get<Event[]>('/events', { params }).then(res => {
      setCache(eventsListCache, cacheKey, res.data)
      return res.data
    })
  },

  getEvent: (id: string) => {
    const cached = getFromCache(eventDetailCache, id)
    if (cached) {
      return Promise.resolve(cached)
    }
    return api.get<Event>(`/events/${id}`).then(res => {
      setCache(eventDetailCache, id, res.data)
      return res.data
    })
  },

  createEvent: (eventData: CreateEventRequest) => {
    return api.post<Event>('/events', eventData).then(res => {
      clearEventsListCache()
      return res.data
    })
  },

  getRegistrations: (eventId: string, page: number = 1, pageSize: number = 10) => {
    return api
      .get<RegistrationsResponse>(`/events/${eventId}/registrations`, {
        params: { page, pageSize }
      })
      .then(res => res.data)
  },

  register: (eventId: string, data: RegisterRequest) => {
    return api.post<Registration>(`/events/${eventId}/register`, data).then(res => {
      clearEventsListCache()
      clearEventDetailCache(eventId)
      return res.data
    })
  },

  checkin: (eventId: string, checkinCode: string) => {
    return api
      .patch<Registration>(`/events/${eventId}/checkin`, { checkinCode })
      .then(res => {
        clearEventsListCache()
        clearEventDetailCache(eventId)
        return res.data
      })
  }
}

export default api
