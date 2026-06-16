export interface Course {
  id: string
  studentName: string
  studentAvatar: string
  time: string
  piece: string
  studentId: string
  dayOfWeek: number
  startTime: string
  endTime: string
}

export interface PlayLog {
  id: string
  studentId: string
  date: string
  piece: string
  duration: number
  note: string
}

export interface TimeSlot {
  dayOfWeek: number
  startTime: string
  endTime: string
}

export interface Conflict {
  courseName: string
  time: string
}

export interface WeeklyStat {
  date: string
  totalMinutes: number
}

export interface Student {
  id: string
  name: string
  attendanceRate: number
}

export interface PieceItem {
  id: string
  name: string
  tags: string[]
}

export interface ParentData {
  attendanceRate: number
  weeklyLogs: WeeklyStat[]
}
