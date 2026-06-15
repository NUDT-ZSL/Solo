import type { EmotionTag } from './TextParser'

export interface EmotionVisual {
  gradient: string
  ringColor: string
  ringWidth: number
  glowColor: string
  label: string
}

const EMOTION_VISUALS: Record<EmotionTag, EmotionVisual> = {
  joy: {
    gradient: 'linear-gradient(135deg, #FFD700 0%, #FFA500 40%, #FF8C00 100%)',
    ringColor: '#E8A838',
    ringWidth: 1.4,
    glowColor: 'rgba(255, 200, 50, 0.6)',
    label: '喜悦',
  },
  sorrow: {
    gradient: 'linear-gradient(135deg, #4A6FA5 0%, #3B5998 40%, #2C3E6B 100%)',
    ringColor: '#5A7BA8',
    ringWidth: 0.7,
    glowColor: 'rgba(74, 111, 165, 0.6)',
    label: '悲伤',
  },
  anger: {
    gradient: 'linear-gradient(135deg, #C0392B 0%, #E74C3C 40%, #A93226 100%)',
    ringColor: '#D44B3F',
    ringWidth: 1.1,
    glowColor: 'rgba(231, 76, 60, 0.6)',
    label: '愤怒',
  },
  fear: {
    gradient: 'linear-gradient(135deg, #5B2C6F 0%, #7D3C98 40%, #4A235A 100%)',
    ringColor: '#8E44AD',
    ringWidth: 0.6,
    glowColor: 'rgba(125, 60, 152, 0.6)',
    label: '恐惧',
  },
  surprise: {
    gradient: 'linear-gradient(135deg, #F39C12 0%, #E67E22 40%, #D68910 100%)',
    ringColor: '#F5B041',
    ringWidth: 1.2,
    glowColor: 'rgba(243, 156, 18, 0.6)',
    label: '惊讶',
  },
  peace: {
    gradient: 'linear-gradient(135deg, #A8D8B9 0%, #7DB89A 40%, #5B9A78 100%)',
    ringColor: '#8FBC9E',
    ringWidth: 1.0,
    glowColor: 'rgba(125, 184, 154, 0.6)',
    label: '平静',
  },
  nostalgia: {
    gradient: 'linear-gradient(135deg, #C9B79C 0%, #A89070 40%, #8B7355 100%)',
    ringColor: '#B8A088',
    ringWidth: 0.9,
    glowColor: 'rgba(168, 144, 112, 0.6)',
    label: '怀念',
  },
  hope: {
    gradient: 'linear-gradient(135deg, #82E0AA 0%, #52BE80 40%, #27AE60 100%)',
    ringColor: '#6ECF94',
    ringWidth: 1.3,
    glowColor: 'rgba(82, 190, 128, 0.6)',
    label: '希望',
  },
}

export function getEmotionVisual(emotion: EmotionTag): EmotionVisual {
  return EMOTION_VISUALS[emotion] ?? EMOTION_VISUALS.peace
}

export function getRadialGradient(emotion: EmotionTag, cx: number, cy: number, radius: number): string {
  const v = getEmotionVisual(emotion)
  return `radial-gradient(circle at ${cx}px ${cy}px, ${v.glowColor} 0%, transparent ${radius}px)`
}
