export interface Device {
  id: string
  name: string
  width: number
  icon: 'phone' | 'tablet' | 'desktop'
  bgColor: string
}

export type LogType = 'device' | 'interaction' | 'system'

export interface LogEntry {
  id: string
  type: LogType
  message: string
  timestamp: number
}

export interface PanelSettings {
  showSafeArea: boolean
  showTouchHotspots: boolean
  enableInteraction: boolean
}

export const DEVICES: Device[] = [
  {
    id: 'iphone-14-pro',
    name: 'iPhone 14 Pro',
    width: 390,
    icon: 'phone',
    bgColor: '#1E293B'
  },
  {
    id: 'ipad-air',
    name: 'iPad Air',
    width: 820,
    icon: 'tablet',
    bgColor: '#1E293B'
  },
  {
    id: 'desktop-hd',
    name: 'Desktop HD',
    width: 1440,
    icon: 'desktop',
    bgColor: '#0F172A'
  }
]

export const DEFAULT_DEVICE = DEVICES[0]
export const MIN_WIDTH = 320
export const MAX_WIDTH = 2560
export const DEFAULT_PANEL_WIDTH = 280
export const MIN_PANEL_WIDTH = 200
export const MAX_PANEL_WIDTH = 400
