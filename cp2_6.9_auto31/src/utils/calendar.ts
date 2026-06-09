import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns'
import { zhCN } from 'date-fns/locale'

export interface EmotionRecord {
  date: string
  emojiIndex: number
  timestamp: string
  note?: string
}

export interface EmotionInfo {
  emoji: string
  name: string
  hue: number
}

export const EMOTIONS: EmotionInfo[] = [
  { emoji: '😡', name: '愤怒', hue: 0 },
  { emoji: '😤', name: '生气', hue: 10 },
  { emoji: '😠', name: '不满', hue: 20 },
  { emoji: '😐', name: '中立', hue: 30 },
  { emoji: '🙄', name: '无奈', hue: 40 },
  { emoji: '😕', name: '困惑', hue: 50 },
  { emoji: '😟', name: '担忧', hue: 60 },
  { emoji: '😢', name: '难过', hue: 180 },
  { emoji: '😭', name: '哭泣', hue: 190 },
  { emoji: '😞', name: '失望', hue: 200 },
  { emoji: '😔', name: '忧郁', hue: 210 },
  { emoji: '🙁', name: '不悦', hue: 220 },
  { emoji: '😣', name: '烦躁', hue: 230 },
  { emoji: '😩', name: '疲惫', hue: 240 },
  { emoji: '😫', name: '厌倦', hue: 250 },
  { emoji: '😒', name: '无聊', hue: 260 },
  { emoji: '😶', name: '沉默', hue: 270 },
  { emoji: '🫤', name: '犹豫', hue: 280 },
  { emoji: '😬', name: '紧张', hue: 290 },
  { emoji: '😯', name: '惊讶', hue: 300 },
  { emoji: '😦', name: '惊愕', hue: 310 },
  { emoji: '😮', name: '意外', hue: 320 },
  { emoji: '😳', name: '害羞', hue: 330 },
  { emoji: '🥺', name: '恳求', hue: 340 },
  { emoji: '😌', name: '放松', hue: 350 },
  { emoji: '🙂', name: '微笑', hue: 30 },
  { emoji: '😊', name: '开心', hue: 40 },
  { emoji: '😄', name: '高兴', hue: 45 },
  { emoji: '😁', name: '大笑', hue: 50 },
  { emoji: '😃', name: '愉快', hue: 55 },
  { emoji: '😀', name: '快乐', hue: 60 },
  { emoji: '🤗', name: '温暖', hue: 25 },
  { emoji: '🥰', name: '喜爱', hue: 330 },
  { emoji: '😍', name: '喜爱', hue: 340 },
  { emoji: '😘', name: '深情', hue: 350 },
  { emoji: '😋', name: '满足', hue: 20 },
  { emoji: '🤩', name: '惊喜', hue: 10 },
  { emoji: '😎', name: '得意', hue: 0 },
  { emoji: '🥳', name: '庆祝', hue: 350 },
  { emoji: '🤠', name: '开朗', hue: 45 },
  { emoji: '😻', name: '可爱', hue: 30 },
  { emoji: '😺', name: '活泼', hue: 40 },
  { emoji: '😸', name: '调皮', hue: 50 },
  { emoji: '🤔', name: '思考', hue: 200 },
  { emoji: '😇', name: '善良', hue: 50 },
  { emoji: '🤗', name: '友好', hue: 30 },
  { emoji: '😉', name: '俏皮', hue: 45 },
  { emoji: '🤓', name: '专注', hue: 210 },
  { emoji: '🤭', name: '腼腆', hue: 330 },
]

const STORAGE_KEY = 'emotion-diary-records'

export function getTodayStr(date: Date = new Date()): string {
  return format(date, 'yyyy-MM-dd')
}

export function getTimestamp(date: Date = new Date()): string {
  return format(date, 'HH:mm')
}

export function saveEmotionRecord(record: EmotionRecord): void {
  const records = getAllRecords()
  records[record.date] = record
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
}

export function updateNote(date: string, note: string): void {
  const records = getAllRecords()
  if (records[date]) {
    records[date].note = note
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
  }
}

export function getAllRecords(): Record<string, EmotionRecord> {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : {}
  } catch {
    return {}
  }
}

export function getRecordByDate(date: string): EmotionRecord | null {
  const records = getAllRecords()
  return records[date] || null
}

export function getCalendarDays(monthDate: Date): Date[] {
  const monthStart = startOfMonth(monthDate)
  const monthEnd = endOfMonth(monthDate)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  return eachDayOfInterval({ start: calStart, end: calEnd })
}

export function isCurrentMonth(date: Date, current: Date): boolean {
  return isSameMonth(date, current)
}

export function isToday(date: Date): boolean {
  return isSameDay(date, new Date())
}

export function nextMonth(date: Date): Date {
  return addMonths(date, 1)
}

export function prevMonth(date: Date): Date {
  return subMonths(date, 1)
}

export function formatMonthYear(date: Date): string {
  return format(date, 'yyyy年MM月', { locale: zhCN })
}

export function getDayNumber(date: Date): string {
  return format(date, 'd')
}

export function getWeekDays(): string[] {
  return ['一', '二', '三', '四', '五', '六', '日']
}

export function searchRecords(keyword: string): string[] {
  if (!keyword.trim()) return []
  const records = getAllRecords()
  const lowerKeyword = keyword.toLowerCase()
  return Object.values(records)
    .filter((record) => {
      const emotion = EMOTIONS[record.emojiIndex]
      const matchName = emotion?.name.toLowerCase().includes(lowerKeyword)
      const matchNote = record.note?.toLowerCase().includes(lowerKeyword)
      return matchName || matchNote
    })
    .map((r) => r.date)
}

export function getComplementaryColor(hue: number): number {
  return (hue + 180) % 360
}

export function getEmotionColor(hue: number, saturation: number = 55, lightness: number = 60): string {
  return `hsl(${hue}, ${saturation}%, ${lightness}%`
}
