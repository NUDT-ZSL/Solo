export type EmotionLabel = 'excited' | 'calm' | 'nostalgic' | 'tense'

export interface PresetClip {
  id: string
  name: string
  color: string
  duration: number
  emotionLabel: EmotionLabel
}

export interface TimelineClip extends PresetClip {
  position: number
  instanceId: string
}

export interface TimelineState {
  clips: TimelineClip[]
  totalDuration: number
  playbackPosition: number
  isPlaying: boolean
}

export interface EmotionRatio {
  label: EmotionLabel
  percentage: number
  color: string
  duration: number
}

export interface CurvePoint {
  x: number
  y: number
  emotion: EmotionLabel
}

export const EMOTION_COLORS: Record<EmotionLabel, string> = {
  excited: '#FF4136',
  calm: '#0074D9',
  nostalgic: '#FF851B',
  tense: '#2ECC40'
}

export const EMOTION_INTENSITY: Record<EmotionLabel, number> = {
  excited: 90,
  calm: 30,
  nostalgic: 50,
  tense: 80
}

export const EMOTION_LABELS_CN: Record<EmotionLabel, string> = {
  excited: '兴奋',
  calm: '平静',
  nostalgic: '怀旧',
  tense: '紧张'
}

export const GRID_WIDTH = 60
export const PLAYBACK_SPEED = 0.3
