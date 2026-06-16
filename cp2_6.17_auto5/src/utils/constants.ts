import type { AlertType, AlertLevel, ReportType } from '../types'

export const ALERT_EMOJIS: Record<AlertType, string> = {
  thunderstorm: '⛈️',
  typhoon: '🌀',
  rainstorm: '🌧️',
  high_temperature: '☀️',
  cold_wave: '❄️'
}

export const ALERT_TYPE_NAMES: Record<AlertType, string> = {
  thunderstorm: '雷暴',
  typhoon: '台风',
  rainstorm: '暴雨',
  high_temperature: '高温',
  cold_wave: '寒潮'
}

export const ALERT_LEVEL_COLORS: Record<AlertLevel, string> = {
  blue: '#3b82f6',
  yellow: '#eab308',
  orange: '#f97316',
  red: '#ef4444'
}

export const ALERT_LEVEL_NAMES: Record<AlertLevel, string> = {
  blue: '蓝色预警',
  yellow: '黄色预警',
  orange: '橙色预警',
  red: '红色预警'
}

export const ALERT_GRADIENTS: Record<AlertLevel, string> = {
  blue: 'linear-gradient(135deg, #1e3a5f 0%, #1e40af 100%)',
  yellow: 'linear-gradient(135deg, #713f12 0%, #a16207 100%)',
  orange: 'linear-gradient(135deg, #7c2d12 0%, #c2410c 100%)',
  red: 'linear-gradient(135deg, #450a0a 0%, #b91c1c 100%)'
}

export const REPORT_TYPE_NAMES: Record<ReportType, string> = {
  rainstorm_flooding: '暴雨内涝',
  wind_tree_fall: '大风倒树',
  hail: '冰雹',
  landslide: '山体滑坡',
  other: '其他'
}

export const REPORT_COLORS: Record<ReportType, string> = {
  rainstorm_flooding: '#3b82f6',
  wind_tree_fall: '#22c55e',
  hail: '#a855f7',
  landslide: '#f97316',
  other: '#6b7280'
}

export const REPORT_TYPE_OPTIONS: { value: ReportType; label: string }[] = [
  { value: 'rainstorm_flooding', label: '暴雨内涝' },
  { value: 'wind_tree_fall', label: '大风倒树' },
  { value: 'hail', label: '冰雹' },
  { value: 'landslide', label: '山体滑坡' },
  { value: 'other', label: '其他' }
]

export const FALLBACK_CENTER: [number, number] = [39.9042, 116.4074]
