export interface Marker {
  id: string
  time: number
  label: string
}

export type ThemeName = 'default' | 'neon' | 'minimal'

export interface ThemeConfig {
  name: ThemeName
  label: string
  background: string
  waveColor: string
  wavePeakColor: string
  markerColor: string
  waveGradient?: {
    from: string
    to: string
  }
}

export const THEMES: Record<ThemeName, ThemeConfig> = {
  default: {
    name: 'default',
    label: '默认',
    background: '#1A202C',
    waveColor: '#4FD1C5',
    wavePeakColor: '#81E6D9',
    markerColor: '#B794F4',
  },
  neon: {
    name: 'neon',
    label: '霓虹',
    background: '#000000',
    waveColor: '#D53F8C',
    wavePeakColor: '#ECC94B',
    markerColor: '#B794F4',
    waveGradient: { from: '#D53F8C', to: '#ECC94B' },
  },
  minimal: {
    name: 'minimal',
    label: '极简',
    background: '#FFFFFF',
    waveColor: '#A0AEC0',
    wavePeakColor: '#718096',
    markerColor: '#805AD5',
  },
}

export const MAX_MARKERS = 50
export const MERGE_THRESHOLD = 0.3
