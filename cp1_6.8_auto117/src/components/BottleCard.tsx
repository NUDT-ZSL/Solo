import { useRef, useEffect, useState, useCallback } from 'react'
import type { Bottle } from '@/types'
import { EMOTION_LABELS } from '@/types'
import SoundBottle from '@/SoundBottle'
import WaveEngine from '@/WaveEngine'

interface BottleCardProps {
  bottle: Bottle
  index: number
  onClick: () => void
}

export default function BottleCard({ bottle, index, onClick }: BottleCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animFrameRef = useRef<number>(0)
  const timeRef = useRef<number>(0)

  const animateMiniWave = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const size = 80
    const dpr = window.devicePixelRatio || 1
    canvas.width = size * dpr
    canvas.height = size * dpr
    ctx.scale(dpr, dpr)

    WaveEngine.renderMiniWave(ctx, size, size, timeRef.current, bottle.emotion)
    timeRef.current += 1 / 60
    animFrameRef.current = requestAnimationFrame(animateMiniWave)
  }, [bottle.emotion])

  useEffect(() => {
    if (isHovered) {
      timeRef.current = 0
      animFrameRef.current = requestAnimationFrame(animateMiniWave)
    } else {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current)
      }
    }
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current)
      }
    }
  }, [isHovered, animateMiniWave])

  const glassStyle = SoundBottle.glassStyle(bottle.emotion)
  const floatStyle = SoundBottle.floatDelay(index)
  const hoverStyle = SoundBottle.hoverScale()
  const colors = WaveEngine.emotionColors[bottle.emotion]

  return (
    <div
      className="relative group"
      style={floatStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      <div
        className="rounded-full flex flex-col items-center justify-center transition-all duration-300 select-none"
        style={{
          ...glassStyle,
          ...hoverStyle,
          width: 'clamp(120px, 18vw, 160px)',
          height: 'clamp(120px, 18vw, 160px)',
          transform: isHovered ? 'scale(1.15)' : 'scale(1)',
          boxShadow: isHovered
            ? `0 12px 40px ${colors.primary}30, 0 0 20px ${colors.primary}20`
            : glassStyle.boxShadow,
        }}
      >
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `conic-gradient(from 0deg, ${colors.primary}20, transparent, ${colors.primary}20, transparent, ${colors.primary}20)`,
            opacity: isHovered ? 1 : 0,
            transition: 'opacity 0.3s ease',
          }}
        />

        <span className="text-2xl mb-1" style={{ filter: isHovered ? 'drop-shadow(0 0 8px rgba(255,255,255,0.3))' : 'none' }}>
          {bottle.emotion === 'calm' && '🌊'}
          {bottle.emotion === 'excited' && '⚡'}
          {bottle.emotion === 'sad' && '🌧'}
          {bottle.emotion === 'curious' && '🔍'}
          {bottle.emotion === 'nostalgic' && '🌅'}
        </span>

        <span
          className="text-xs font-medium mt-0.5"
          style={{ color: colors.primary, opacity: isHovered ? 1 : 0.8 }}
        >
          {EMOTION_LABELS[bottle.emotion]}
        </span>

        <span
          className="text-xs mt-1 text-center px-3 line-clamp-2 leading-tight"
          style={{ color: 'rgba(255,255,255,0.6)', fontSize: '10px' }}
        >
          {bottle.text.slice(0, 20)}...
        </span>

        {isHovered && (
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full rounded-full"
            style={{ opacity: 0.6, pointerEvents: 'none' }}
          />
        )}
      </div>

      <div
        className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-xs truncate max-w-[120px]"
        style={{ color: 'rgba(255,255,255,0.4)' }}
      >
        {bottle.authorName}
      </div>
    </div>
  )
}
