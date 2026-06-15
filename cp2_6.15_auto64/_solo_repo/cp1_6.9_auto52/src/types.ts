export interface MoodRecord {
  id: string
  label: string
  emoji: string
  color: string
  shape: 'circle' | 'square' | 'triangle' | 'diamond' | 'hexagon' | 'star' | 'heart' | 'wave'
  score: number
  timestamp: number
  note: string
  badgeParams: {
    rotation: number
    size: number
  }
}

export interface MoodPreset {
  label: string
  emoji: string
  color: string
  shape: 'circle' | 'square' | 'triangle' | 'diamond' | 'hexagon' | 'star' | 'heart' | 'wave'
  scoreRange: [number, number]
}

export const MOOD_PRESETS: MoodPreset[] = [
  { label: '兴奋', emoji: '🤩', color: '#FFD93D', shape: 'star', scoreRange: [8, 10] },
  { label: '平静', emoji: '😌', color: '#6BCB77', shape: 'circle', scoreRange: [6, 8] },
  { label: '焦虑', emoji: '😰', color: '#FFB86B', shape: 'wave', scoreRange: [3, 5] },
  { label: '悲伤', emoji: '😢', color: '#4D96FF', shape: 'diamond', scoreRange: [1, 3] },
  { label: '愤怒', emoji: '😠', color: '#FF6B6B', shape: 'triangle', scoreRange: [2, 4] },
  { label: '好奇', emoji: '🤔', color: '#C56CF0', shape: 'hexagon', scoreRange: [6, 9] },
  { label: '满足', emoji: '😊', color: '#FF8FAB', shape: 'heart', scoreRange: [7, 10] },
  { label: '疲惫', emoji: '😩', color: '#8892B0', shape: 'square', scoreRange: [2, 5] },
]
