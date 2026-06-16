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

export interface FilterOptions {
  category?: string
  startDate?: string
  endDate?: string
  sortBy?: 'date' | 'name' | 'capacity'
  sortOrder?: 'asc' | 'desc'
}

export interface CheckInStats {
  totalRegistered: number
  totalCheckedIn: number
  checkInRate: number
  notCheckedInCount: number
}

export const filterAndSortActivities = (
  activities: Activity[],
  options: FilterOptions = {}
): Activity[] => {
  let result = [...activities]

  if (options.category && options.category !== 'all') {
    result = result.filter(a => a.category === options.category)
  }

  if (options.startDate) {
    result = result.filter(a => a.date >= options.startDate!)
  }

  if (options.endDate) {
    result = result.filter(a => a.date <= options.endDate!)
  }

  const sortBy = options.sortBy || 'date'
  const sortOrder = options.sortOrder || 'asc'

  result.sort((a, b) => {
    let comparison = 0

    switch (sortBy) {
      case 'date':
        comparison = new Date(a.date).getTime() - new Date(b.date).getTime()
        break
      case 'name':
        comparison = a.name.localeCompare(b.name)
        break
      case 'capacity':
        comparison = a.capacity - b.capacity
        break
    }

    return sortOrder === 'asc' ? comparison : -comparison
  })

  return result
}

export const hasRegistrationConflict = (
  registrations: Registration[],
  activityId: string,
  email: string,
  phone: string
): boolean => {
  return registrations.some(
    r => r.activityId === activityId && (r.email === email || r.phone === phone)
  )
}

export const calculateCheckInStats = (
  registrations: Registration[]
): CheckInStats => {
  const totalRegistered = registrations.length
  const totalCheckedIn = registrations.filter(r => r.checkedIn).length
  const notCheckedInCount = totalRegistered - totalCheckedIn
  const checkInRate = totalRegistered > 0 ? (totalCheckedIn / totalRegistered) * 100 : 0

  return {
    totalRegistered,
    totalCheckedIn,
    checkInRate: Math.round(checkInRate * 100) / 100,
    notCheckedInCount
  }
}

export const getAvailableSpots = (activity: Activity): number => {
  return Math.max(0, activity.capacity - activity.registeredCount)
}

export const isActivityFull = (activity: Activity): boolean => {
  return activity.registeredCount >= activity.capacity
}

export const isActivityUpcoming = (activity: Activity): boolean => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const activityDate = new Date(activity.date)
  return activityDate >= today
}

export const isActivityToday = (activity: Activity): boolean => {
  const today = new Date().toISOString().split('T')[0]
  return activity.date === today
}

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  }
  return date.toLocaleDateString('zh-CN', options)
}

export const getCategoryColor = (category: string): string => {
  const colors: Record<string, string> = {
    '讲座': '#3498DB',
    '工作坊': '#9B59B6',
    '户外活动': '#27AE60'
  }
  return colors[category] || '#95A5A6'
}

export const getCategoryBgColor = (category: string): string => {
  const colors: Record<string, string> = {
    '讲座': '#EBF5FB',
    '工作坊': '#F5EEF8',
    '户外活动': '#EAFAF1'
  }
  return colors[category] || '#F4F6F6'
}

export const generateCheckInCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^1[3-9]\d{9}$/
  return phoneRegex.test(phone)
}

export const validateName = (name: string): boolean => {
  return name.trim().length >= 2 && name.trim().length <= 50
}

export const paginateArray = <T>(
  array: T[],
  page: number,
  pageSize: number
): { data: T[]; total: number; totalPages: number } => {
  const total = array.length
  const totalPages = Math.ceil(total / pageSize)
  const start = (page - 1) * pageSize
  const end = start + pageSize
  const data = array.slice(start, end)

  return { data, total, totalPages }
}

export const filterRegistrationsByStatus = (
  registrations: Registration[],
  status: 'all' | 'checkedIn' | 'notCheckedIn'
): Registration[] => {
  switch (status) {
    case 'checkedIn':
      return registrations.filter(r => r.checkedIn)
    case 'notCheckedIn':
      return registrations.filter(r => !r.checkedIn)
    default:
      return registrations
  }
}
