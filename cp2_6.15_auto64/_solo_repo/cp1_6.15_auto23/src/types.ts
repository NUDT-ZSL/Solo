export interface SupplyAllocation {
  name: string
  total: number
  allocated: number
}

export interface Activity {
  id: string
  name: string
  date: string
  maxParticipants: number
  signupCount: number
  supplies: SupplyAllocation[]
}

export interface Signup {
  id: string
  activityId: string
  nickname: string
  phone: string
  registeredAt: string
  confirmed: boolean
  supplies: string[]
}

export type FilterStatus = 'all' | 'confirmed' | 'pending'
