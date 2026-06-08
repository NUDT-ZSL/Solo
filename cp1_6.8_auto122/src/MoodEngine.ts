export type WeatherType = 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'stormy'

export interface MoodRecord {
  id: string
  date: string
  weather: WeatherType
  diary: string
  intensity: number
  created_at: string
  updated_at: string
}

export interface MoodStats {
  sunny: number
  cloudy: number
  rainy: number
  snowy: number
  stormy: number
}

export interface HeatmapCell {
  date: string
  weather: WeatherType | null
  intensity: number
  hasRecord: boolean
}

export const WEATHER_CONFIG: Record<WeatherType, { label: string; emoji: string; color: string; gradientStart: string; gradientEnd: string }> = {
  sunny: { label: '晴', emoji: '☀️', color: '#93c5fd', gradientStart: '#93c5fd', gradientEnd: '#60a5fa' },
  cloudy: { label: '多云', emoji: '⛅', color: '#6b7280', gradientStart: '#6b7280', gradientEnd: '#9ca3af' },
  rainy: { label: '雨', emoji: '🌧️', color: '#1e40af', gradientStart: '#1e40af', gradientEnd: '#3b82f6' },
  snowy: { label: '雪', emoji: '❄️', color: '#c4b5fd', gradientStart: '#c4b5fd', gradientEnd: '#a78bfa' },
  stormy: { label: '雷暴', emoji: '⛈️', color: '#dc2626', gradientStart: '#dc2626', gradientEnd: '#ef4444' },
}

export const WEATHER_TYPES: WeatherType[] = ['sunny', 'cloudy', 'rainy', 'snowy', 'stormy']

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9)
}

export function formatDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

export function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay()
}

export function aggregateHeatmapData(records: MoodRecord[], year: number, month: number): HeatmapCell[] {
  const daysInMonth = getDaysInMonth(year, month)
  const recordMap = new Map<string, MoodRecord>()
  records.forEach(r => {
    recordMap.set(r.date, r)
  })

  const cells: HeatmapCell[] = []
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const record = recordMap.get(dateStr)
    cells.push({
      date: dateStr,
      weather: record?.weather ?? null,
      intensity: record?.intensity ?? 0,
      hasRecord: !!record,
    })
  }
  return cells
}

export function calculateStats(records: MoodRecord[]): MoodStats {
  const stats: MoodStats = { sunny: 0, cloudy: 0, rainy: 0, snowy: 0, stormy: 0 }
  records.forEach(r => {
    stats[r.weather]++
  })
  return stats
}

export function getWeatherColor(weather: WeatherType | null, intensity: number): string {
  if (!weather) return 'rgba(255,255,255,0.05)'
  const config = WEATHER_CONFIG[weather]
  const t = Math.min(intensity / 10, 1)
  const r1 = parseInt(config.gradientStart.slice(1, 3), 16)
  const g1 = parseInt(config.gradientStart.slice(3, 5), 16)
  const b1 = parseInt(config.gradientStart.slice(5, 7), 16)
  const r2 = parseInt(config.gradientEnd.slice(1, 3), 16)
  const g2 = parseInt(config.gradientEnd.slice(3, 5), 16)
  const b2 = parseInt(config.gradientEnd.slice(5, 7), 16)
  const r = Math.round(r1 + (r2 - r1) * t)
  const g = Math.round(g1 + (g2 - g1) * t)
  const b = Math.round(b1 + (b2 - b1) * t)
  return `rgb(${r},${g},${b})`
}

export function truncateDiary(text: string, maxLen: number = 50): string {
  if (text.length <= maxLen) return text
  return text.substring(0, maxLen) + '...'
}

export function formatDisplayDate(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}
