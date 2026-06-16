import type {
  Movie,
  Schedule,
  ScheduleItem,
  VoteResult,
} from '@/types'

const API_BASE_URL = '/api'

async function request<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  return response.json()
}

export function fetchMovies(): Promise<Movie[]> {
  return request<Movie[]>('/movies')
}

export function createSchedule(items: ScheduleItem[]): Promise<Schedule> {
  return request<Schedule>('/schedules', {
    method: 'POST',
    body: JSON.stringify({ items }),
  })
}

export function getSchedule(id: string): Promise<Schedule> {
  return request<Schedule>(`/schedules/${id}`)
}

export function updateSchedule(
  id: string,
  items: ScheduleItem[],
): Promise<Schedule> {
  return request<Schedule>(`/schedules/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ items }),
  })
}

export function closeSchedule(id: string): Promise<Schedule> {
  return request<Schedule>(`/schedules/${id}/close`, {
    method: 'POST',
  })
}

export function getVotes(scheduleId: string): Promise<VoteResult[]> {
  return request<VoteResult[]>(`/schedules/${scheduleId}/votes`)
}

export function submitVote(
  scheduleId: string,
  voterId: string,
  movieIds: string[],
): Promise<void> {
  return request<void>(`/schedules/${scheduleId}/votes`, {
    method: 'POST',
    body: JSON.stringify({ voterId, movieIds }),
  })
}
