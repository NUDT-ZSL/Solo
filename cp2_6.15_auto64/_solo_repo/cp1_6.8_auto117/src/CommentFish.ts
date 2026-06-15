import type { EmotionTag } from '@/types'
import WaveEngine from './WaveEngine'

interface PathPoint {
  x: number
  y: number
  progress: number
}

interface FishConfig {
  id: string
  text: string
  emotion: EmotionTag
  startX: number
  startY: number
  endX: number
  endY: number
  createdAt: number
}

class CommentFish {
  static generatePath(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    steps: number = 60
  ): PathPoint[] {
    const points: PathPoint[] = []
    const cp1x = startX + (endX - startX) * 0.3
    const cp1y = startY - 40 - Math.random() * 30
    const cp2x = startX + (endX - startX) * 0.7
    const cp2y = startY - 20 - Math.random() * 20

    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const x = CommentFish.bezier(t, startX, cp1x, cp2x, endX)
      const y = CommentFish.bezier(t, startY, cp1y, cp2y, endY)
      points.push({ x, y, progress: t })
    }

    return points
  }

  static bezier(t: number, p0: number, p1: number, p2: number, p3: number): number {
    const mt = 1 - t
    return mt * mt * mt * p0 + 3 * mt * mt * t * p1 + 3 * mt * t * t * p2 + t * t * t * p3
  }

  static createFish(commentText: string, emotion: EmotionTag, containerWidth: number): FishConfig {
    const startX = containerWidth * 0.3 + Math.random() * containerWidth * 0.4
    const startY = 0
    const endX = startX + (Math.random() - 0.5) * 80
    const endY = -40 - Math.random() * 30

    return {
      id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
      text: commentText,
      emotion,
      startX,
      startY,
      endX,
      endY,
      createdAt: Date.now(),
    }
  }

  static fishStyle(fish: FishConfig, elapsed: number): React.CSSProperties {
    const duration = 3000
    const progress = Math.min(elapsed / duration, 1)
    const ease = CommentFish.easeOutCubic(progress)

    const points = CommentFish.generatePath(fish.startX, fish.startY, fish.endX, fish.endY)
    const idx = Math.floor(ease * (points.length - 1))
    const point = points[Math.min(idx, points.length - 1)]

    const fadeProgress = Math.max(0, (elapsed - 2000) / 1000)
    const opacity = 1 - fadeProgress
    const scale = 1 - fadeProgress * 0.3

    const colors = WaveEngine.emotionColors[fish.emotion]

    return {
      position: 'absolute',
      left: point.x,
      top: point.y,
      transform: `scale(${scale})`,
      opacity: Math.max(0, opacity),
      background: `linear-gradient(135deg, ${colors.primary}30, ${colors.secondary}30)`,
      backdropFilter: 'blur(8px)',
      border: `1px solid ${colors.primary}40`,
      borderRadius: '20px',
      padding: '4px 12px',
      fontSize: '12px',
      color: colors.primary,
      whiteSpace: 'nowrap',
      pointerEvents: 'none',
      zIndex: 50,
    }
  }

  static easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3)
  }

  static isExpired(fish: FishConfig): boolean {
    return Date.now() - fish.createdAt > 3500
  }
}

export default CommentFish
export type { FishConfig, PathPoint }
