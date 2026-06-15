export type Theme = 'dark' | 'warm'

export type SceneType = 'particle' | 'ocean' | 'forest' | 'mountain' | 'default'

export interface ThemeColors {
  primary: string
  secondary: string
  accent: string
}

export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  color: string
  angle: number
  rotationSpeed: number
}

export interface WaveLayer {
  amplitude: number
  frequency: number
  speed: number
  phase: number
  color: string
}

export interface AudioState {
  isPlaying: boolean
  volume: number
  oceanVolume: number
  rainVolume: number
  breathVolume: number
}

export const THEMES: Record<Theme, ThemeColors> = {
  dark: {
    primary: '#18181b',
    secondary: '#3f3f46',
    accent: '#a78bfa'
  },
  warm: {
    primary: '#fef3c7',
    secondary: '#fde68a',
    accent: '#f97316'
  }
}
