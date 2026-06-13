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
