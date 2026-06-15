export type EventCategory = 'academic' | 'club' | 'sports' | 'art' | 'volunteer'

export interface Event {
  _id?: string
  title: string
  category: EventCategory
  date: string
  location: string
  capacity: number
  description: string
  organizer: string
  registeredCount: number
  createdAt: string
}

export interface Registration {
  _id?: string
  eventId: string
  name: string
  studentId: string
  email: string
  checkinCode: string
  checkedIn: boolean
  registeredAt: string
  checkedInAt?: string
}

export interface CreateEventRequest {
  title: string
  category: EventCategory
  date: string
  location: string
  capacity: number
  description: string
  organizer: string
}

export interface RegisterRequest {
  name: string
  studentId: string
  email: string
}

export interface CheckinRequest {
  checkinCode: string
}

export const CATEGORY_LABELS: Record<EventCategory, string> = {
  academic: '学术',
  club: '社团',
  sports: '体育',
  art: '文艺',
  volunteer: '志愿'
}

export const CATEGORY_COLORS: Record<EventCategory, string> = {
  academic: '#bfdbfe',
  club: '#e9d5ff',
  sports: '#bbf7d0',
  art: '#fecaca',
  volunteer: '#fed7aa'
}
