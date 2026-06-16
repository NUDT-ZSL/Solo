export interface Activity {
  id: string
  name: string
  description: string
  date: string
  time: string
  location: string
  category: '讲座' | '工作坊' | '户外活动'
  capacity: number
  registeredCount: number
  organizer: string
  organizerInfo: string
  checkInCode: string
}

export interface Registration {
  id: string
  activityId: string
  name: string
  email: string
  phone: string
  registeredAt: string
  checkedIn: boolean
  checkedInAt: string | null
}

export interface Pagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export type Page = 'list' | 'detail' | 'checkin' | 'admin' | 'admin-login'

export interface AppState {
  currentPage: Page
  selectedActivityId: string | null
  isLoggedIn: boolean
  userInfo: {
    name: string
    email: string
    phone: string
  } | null
}
