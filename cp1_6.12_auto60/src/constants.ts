import type { MoodPalette, HSLColor } from './types'

const hsl = (h: number, s: number, l: number): HSLColor => ({ h, s, l })

export const MOOD_PALETTES: MoodPalette[] = [
  {
    id: 'joy',
    name: '快乐',
    emoji: '😊',
    gradient: 'linear-gradient(135deg, #FFD93D 0%, #FF6B35 50%, #FF8E72 100%)',
    colors: [hsl(48, 100, 62), hsl(16, 100, 60), hsl(12, 100, 72), hsl(55, 100, 65)]
  },
  {
    id: 'melancholy',
    name: '忧郁',
    emoji: '🌧️',
    gradient: 'linear-gradient(135deg, #1E3A8A 0%, #5B4B8A 50%, #7B6FA0 100%)',
    colors: [hsl(225, 65, 33), hsl(252, 36, 42), hsl(250, 22, 55), hsl(210, 50, 40)]
  },
  {
    id: 'calm',
    name: '平静',
    emoji: '🌿',
    gradient: 'linear-gradient(135deg, #4ADE80 0%, #38BDF8 50%, #818CF8 100%)',
    colors: [hsl(142, 71, 58), hsl(199, 93, 60), hsl(234, 89, 74), hsl(160, 60, 55)]
  },
  {
    id: 'excited',
    name: '兴奋',
    emoji: '🔥',
    gradient: 'linear-gradient(135deg, #EF4444 0%, #F97316 50%, #FBBF24 100%)',
    colors: [hsl(0, 84, 60), hsl(25, 95, 53), hsl(43, 96, 56), hsl(340, 80, 58)]
  },
  {
    id: 'dreamy',
    name: '梦幻',
    emoji: '✨',
    gradient: 'linear-gradient(135deg, #E879F9 0%, #A78BFA 50%, #60A5FA 100%)',
    colors: [hsl(293, 92, 73), hsl(255, 92, 76), hsl(217, 91, 68), hsl(280, 80, 70)]
  },
  {
    id: 'nostalgic',
    name: '怀旧',
    emoji: '📷',
    gradient: 'linear-gradient(135deg, #D4A574 0%, #8B7355 50%, #A89078 100%)',
    colors: [hsl(33, 50, 64), hsl(30, 22, 44), hsl(30, 22, 56), hsl(25, 35, 55)]
  },
  {
    id: 'mysterious',
    name: '神秘',
    emoji: '🌙',
    gradient: 'linear-gradient(135deg, #1E1B4B 0%, #4C1D95 50%, #6B21A8 100%)',
    colors: [hsl(244, 55, 20), hsl(262, 68, 35), hsl(272, 72, 40), hsl(260, 50, 28)]
  },
  {
    id: 'energetic',
    name: '活力',
    emoji: '⚡',
    gradient: 'linear-gradient(135deg, #06B6D4 0%, #22C55E 50%, #EAB308 100%)',
    colors: [hsl(189, 94, 43), hsl(142, 71, 45), hsl(48, 96, 47), hsl(160, 80, 45)]
  },
  {
    id: 'romantic',
    name: '浪漫',
    emoji: '💕',
    gradient: 'linear-gradient(135deg, #FB7185 0%, #F472B6 50%, #C084FC 100%)',
    colors: [hsl(353, 96, 71), hsl(330, 86, 70), hsl(272, 96, 75), hsl(340, 85, 75)]
  },
  {
    id: 'anxious',
    name: '焦虑',
    emoji: '😰',
    gradient: 'linear-gradient(135deg, #78716C 0%, #64748B 50%, #71717A 100%)',
    colors: [hsl(15, 6, 44), hsl(217, 19, 47), hsl(240, 5, 46), hsl(200, 15, 50)]
  }
]

export const CANVAS_ASPECT_RATIO = 4 / 3
export const MAX_BLOBS = 50
export const MIN_BLOB_SIZE = 30
export const MAX_BLOB_SIZE = 120
export const DEFAULT_BLOB_SIZE = 60

export const MIN_DURATION = 30
export const MAX_DURATION = 60

export const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
export const BASE_OCTAVE = 4
export const NOTE_RANGE = 24
