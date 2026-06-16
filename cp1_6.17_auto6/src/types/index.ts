export interface Participant {
  id: string
  name: string
  phone: string
  registeredAt: string
  checkedIn: boolean
  checkedInAt?: string
}

export interface Event {
  id: string
  title: string
  date: string
  description: string
  maxParticipants: number
  participants: Participant[]
}

export interface EventStats {
  eventId: string
  title: string
  registeredCount: number
  checkedInCount: number
  registerRate: number
}

export interface ApiResponse<T> {
  data?: T
  error?: string
}

export interface CreateEventDto {
  title: string
  date: string
  description: string
  maxParticipants: number
}

export interface RegisterDto {
  name: string
  phone: string
}

export interface CheckInDto {
  participantId: string
}

export interface User {
  id: string
  name: string
  isAdmin: boolean
}
