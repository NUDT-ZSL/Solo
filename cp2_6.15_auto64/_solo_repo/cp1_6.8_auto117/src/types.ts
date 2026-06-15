export type EmotionTag = 'calm' | 'excited' | 'sad' | 'curious' | 'nostalgic'

export interface Bottle {
  id: string
  audioUrl: string
  text: string
  emotion: EmotionTag
  likes: number
  liked: boolean
  comments: Comment[]
  createdAt: string
  authorName: string
}

export interface Comment {
  id: string
  bottleId: string
  text: string
  authorName: string
  createdAt: string
}

export interface WaveParams {
  amplitude: number
  frequency: number
  speed: number
  layers: number
  opacity: number
}

export interface EmotionColorSet {
  primary: string
  secondary: string
  gradient: string[]
  rgb: [number, number, number]
}

export const EMOTION_LABELS: Record<EmotionTag, string> = {
  calm: '平静',
  excited: '兴奋',
  sad: '忧伤',
  curious: '好奇',
  nostalgic: '怀旧',
}

export const EMOTION_ICONS: Record<EmotionTag, string> = {
  calm: '🌊',
  excited: '⚡',
  sad: '🌧',
  curious: '🔍',
  nostalgic: '🌅',
}
