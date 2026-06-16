export interface Photo {
  id: string
  title: string
  style: 'portrait' | 'landscape' | 'commercial' | 'wedding'
  price: number
  shootDate: string
  height: number
}

export interface Package {
  id: string
  name: 'basic' | 'standard' | 'premium'
  price: number
  editedPhotos: number
  duration: number
  outfits: number
  color: string
}

export type TimeSlot = 'morning' | 'afternoon'

export interface Booking {
  id: string
  date: string
  timeSlot: TimeSlot
  name: string
  phone: string
  email: string
  packageId: string
  notes?: string
  status: 'pending' | 'confirmed' | 'completed'
  createdAt: string
}

export interface BookingFormData {
  name: string
  phone: string
  email: string
  date: string
  timeSlot: TimeSlot
  notes: string
}

export interface AddOnService {
  id: string
  name: string
  price: number
}

export function sortPhotos(photos: Photo[], sortBy: 'date' | 'price' = 'date'): Photo[] {
  const sorted = [...photos]
  if (sortBy === 'date') {
    return sorted.sort((a, b) => new Date(b.shootDate).getTime() - new Date(a.shootDate).getTime())
  }
  return sorted.sort((a, b) => a.price - b.price)
}

export function filterByStyle(photos: Photo[], style: Photo['style'] | 'all'): Photo[] {
  if (style === 'all') return photos
  return photos.filter(photo => photo.style === style)
}

export function filterByPriceRange(photos: Photo[], minPrice: number, maxPrice: number): Photo[] {
  return photos.filter(photo => photo.price >= minPrice && photo.price <= maxPrice)
}

export function filterByDateRange(photos: Photo[], startDate: string, endDate: string): Photo[] {
  const start = startDate ? new Date(startDate).getTime() : 0
  const end = endDate ? new Date(endDate).getTime() : Infinity
  return photos.filter(photo => {
    const photoDate = new Date(photo.shootDate).getTime()
    return photoDate >= start && photoDate <= end
  })
}

export function detectConflict(bookingDate: string, timeSlot: TimeSlot, existingBookings: Booking[]): boolean {
  const targetDate = new Date(bookingDate).toDateString()
  return existingBookings.some(booking => {
    const bookingDateObj = new Date(booking.date).toDateString()
    return bookingDateObj === targetDate && booking.timeSlot === timeSlot
  })
}

export function calculatePackagePrice(
  basePrice: number,
  addOns: AddOnService[] = [],
  discountPercent: number = 0
): number {
  if (basePrice < 0) {
    throw new Error('basePrice cannot be negative')
  }
  if (discountPercent > 100) {
    throw new Error('discountPercent cannot exceed 100')
  }
  if (discountPercent < 0) {
    throw new Error('discountPercent cannot be negative')
  }
  const addOnsTotal = addOns.reduce((sum, addOn) => sum + Math.max(0, addOn.price), 0)
  const subtotal = basePrice + addOnsTotal
  const discount = subtotal * (discountPercent / 100)
  return Math.round(subtotal - discount)
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function validatePhone(phone: string): boolean {
  const phoneRegex = /^1[3-9]\d{9}$/
  return phoneRegex.test(phone)
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

export function getPriceRange(photos: Photo[]): [number, number] {
  if (photos.length === 0) return [0, 0]
  const prices = photos.map(p => p.price)
  return [Math.min(...prices), Math.max(...prices)]
}

export function getMonthlyBookingsCount(bookings: Booking[]): number {
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()
  return bookings.filter(booking => {
    const bookingDate = new Date(booking.createdAt)
    return bookingDate.getMonth() === currentMonth && bookingDate.getFullYear() === currentYear
  }).length
}

export function getPendingBookingsCount(bookings: Booking[]): number {
  return bookings.filter(booking => booking.status === 'pending').length
}

export function getCompletedBookingsCount(bookings: Booking[]): number {
  return bookings.filter(booking => booking.status === 'completed').length
}
