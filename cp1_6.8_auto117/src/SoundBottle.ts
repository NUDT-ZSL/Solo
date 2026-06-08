import type { Bottle, EmotionTag } from '@/types'
import type { CSSProperties } from 'react'
import WaveEngine from './WaveEngine'

class SoundBottle {
  static createBottleCard(bottle: Bottle) {
    return {
      id: bottle.id,
      emotion: bottle.emotion,
      text: bottle.text,
      authorName: bottle.authorName,
      likes: bottle.likes,
      commentCount: bottle.comments.length,
    }
  }

  static glassStyle(emotion: EmotionTag): CSSProperties {
    const colors = WaveEngine.emotionColors[emotion]
    return {
      background: `linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)`,
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      border: `1px solid ${colors.primary}33`,
      boxShadow: `0 8px 32px ${colors.primary}15, inset 0 1px 0 rgba(255,255,255,0.1)`,
    }
  }

  static emotionGradient(emotion: EmotionTag): string {
    const colors = WaveEngine.emotionColors[emotion]
    return `linear-gradient(135deg, ${colors.gradient[1]}, ${colors.gradient[2]})`
  }

  static emotionBorderGradient(emotion: EmotionTag): string {
    const colors = WaveEngine.emotionColors[emotion]
    return `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`
  }

  static floatDelay(index: number): CSSProperties {
    const delay = (index % 8) * 0.3
    const duration = 5 + (index % 5) * 0.5
    return {
      animation: `float ${duration}s ease-in-out ${delay}s infinite`,
    }
  }

  static hoverScale(): CSSProperties {
    return {
      transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease',
      cursor: 'pointer',
    }
  }

  static emotionTagStyle(emotion: EmotionTag, isSelected: boolean): CSSProperties {
    const colors = WaveEngine.emotionColors[emotion]
    return {
      background: isSelected
        ? `linear-gradient(135deg, ${colors.primary}40, ${colors.secondary}40)`
        : 'rgba(255,255,255,0.05)',
      border: isSelected
        ? `2px solid ${colors.primary}`
        : '2px solid rgba(255,255,255,0.1)',
      color: isSelected ? colors.primary : 'rgba(255,255,255,0.5)',
      transition: 'all 0.3s ease',
    }
  }
}

export default SoundBottle
