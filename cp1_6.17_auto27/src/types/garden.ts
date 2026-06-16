export interface User {
  id: string
  username: string
  role: 'manager' | 'member'
  points: number
  avatar: string
}

export interface Region {
  id: string
  name: string
  crop: string
  growDays: number
  lastWateredAt: string | null
  gardenId: string
}

export interface RegionDetail {
  id: string
  name: string
  crop: string
  growDays: number
  lastWateredAt: string | null
  gardenId: string
  logs: ObservationLog[]
  tasks: Task[]
}

export interface ObservationLog {
  id: string
  regionId: string
  authorId: string
  authorName: string
  content: string
  photoUrl: string | null
  createdAt: string
}

export interface Task {
  id: string
  regionId: string
  assigneeId: string
  assigneeName: string
  type: string
  completed: boolean
  createdAt: string
}

export interface Garden {
  id: string
  name: string
  regions: Region[]
}

export interface Member {
  id: string
  username: string
  role: 'manager' | 'member'
  points: number
  avatar: string
}
