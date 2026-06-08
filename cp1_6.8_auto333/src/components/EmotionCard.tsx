import { useRef, useEffect, useState, useCallback } from 'react'
import { Edit2, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Emotion } from '@/hooks/useStore'

interface EmotionCardProps {
  emotion: Emotion
  onClick?: () => void
  showActions?: boolean
  onEdit?: () => void
  onDelete?: () => void
}

export default function EmotionCard({ emotion, onClick, showActions, onEdit, onDelete }: EmotionCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animFrameRef = useRef<number>(0)
  const [hovered, setHovered] = useState(false)

  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const w = 200
    const h = 60
    canvas.width = w * dpr
    canvas.height = h * dpr
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`
    ctx.scale(dpr, dpr)

    const baseAmplitude = hovered ? 26 : 20
    const frequency = emotion.frequency ?? 0.05
    const decay = emotion.decay ?? 0.02
    const color = emotion.color ?? '#a78bfa'

    const time = performance.now() * 0.001
    const pulse = 1 + 0.15 * Math.sin(time * 2)
    const amplitude = baseAmplitude * pulse

    ctx.clearRect(0, 0, w, h)

    ctx.beginPath()
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.shadowColor = color
    ctx.shadowBlur = hovered ? 18 : 10

    for (let x = 0; x < w; x++) {
      const y =
        h / 2 +
        amplitude *
          Math.sin(frequency * x + time * 3) *
          Math.exp(-decay * x)
      if (x === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()

    ctx.shadowBlur = 0

    const gradient = ctx.createLinearGradient(0, 0, w, 0)
    gradient.addColorStop(0, color + '30')
    gradient.addColorStop(0.5, color + '10')
    gradient.addColorStop(1, color + '00')

    ctx.beginPath()
    for (let x = 0; x < w; x++) {
      const y =
        h / 2 +
        amplitude *
          Math.sin(frequency * x + time * 3) *
          Math.exp(-decay * x)
      if (x === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.lineTo(w, h)
    ctx.lineTo(0, h)
    ctx.closePath()
    ctx.fillStyle = gradient
    ctx.fill()

    animFrameRef.current = requestAnimationFrame(drawWaveform)
  }, [emotion.color, emotion.frequency, emotion.decay, hovered])

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(drawWaveform)
    return () => cancelAnimationFrame(animFrameRef.current)
  }, [drawWaveform])

  const formattedTime = emotion.createdAt
    ? new Date(emotion.createdAt).toLocaleString('zh-CN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : ''

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        'group relative flex flex-col gap-3 rounded-2xl border border-white/10',
        'bg-white/[0.06] backdrop-blur-xl p-4',
        'transition-all duration-300 cursor-pointer select-none',
        hovered && 'bg-white/[0.1] border-white/20',
      )}
      style={{
        boxShadow: hovered
          ? `0 0 30px ${emotion.color ?? '#a78bfa'}30, 0 0 60px ${emotion.color ?? '#a78bfa'}15`
          : `0 0 15px ${emotion.color ?? '#a78bfa'}15`,
      }}
    >
      <div className="flex items-center gap-2">
        <span className="text-2xl leading-none">{emotion.emoji ?? '💭'}</span>
        <span
          className="h-2 w-2 rounded-full shrink-0"
          style={{ backgroundColor: emotion.color ?? '#a78bfa' }}
        />
        <span className="text-white/60 text-xs ml-auto">{formattedTime}</span>
      </div>

      <p className="text-white/85 text-sm leading-relaxed line-clamp-2">
        {emotion.text ?? ''}
      </p>

      <canvas
        ref={canvasRef}
        className="w-[200px] h-[60px] pointer-events-none"
      />

      {showActions && (
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onEdit()
              }}
              className={cn(
                'p-1.5 rounded-lg bg-white/10 hover:bg-white/20',
                'text-white/60 hover:text-white/90 transition-colors duration-150',
              )}
            >
              <Edit2 size={14} />
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
              className={cn(
                'p-1.5 rounded-lg bg-white/10 hover:bg-white/20',
                'text-white/60 hover:text-red-400 transition-colors duration-150',
              )}
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
