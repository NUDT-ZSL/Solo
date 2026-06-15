import React, { useEffect, useRef } from 'react'
import { useGameStore } from '../store/gameStore'

export const BeatBar: React.FC = () => {
  const { nextBeats, beatProgress } = useGameStore()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const w = canvas.width
    const h = canvas.height

    ctx.clearRect(0, 0, w, h)

    ctx.fillStyle = 'rgba(42, 27, 15, 0.75)'
    ctx.fillRect(0, 0, w, h)

    ctx.fillStyle = 'rgba(139, 115, 85, 0.1)'
    ctx.fillRect(0, 0, w, h)

    const centerY = h / 2
    const beatSpacing = 50
    const progressOffset = beatProgress * beatSpacing

    for (let i = 0; i < nextBeats.length; i++) {
      const beat = nextBeats[i]
      const x = w - 30 - i * beatSpacing + progressOffset

      if (x < -10 || x > w + 10) continue

      const isStrong = beat.strength === 'strong'
      const radius = isStrong ? 10 : 6

      ctx.beginPath()
      ctx.arc(x, centerY, radius, 0, Math.PI * 2)

      if (isStrong) {
        const grad = ctx.createRadialGradient(x, centerY, 0, x, centerY, radius)
        grad.addColorStop(0, '#CC7722')
        grad.addColorStop(1, '#8B1A1A')
        ctx.fillStyle = grad
        ctx.shadowColor = '#CC7722'
        ctx.shadowBlur = 8
      } else {
        const grad = ctx.createRadialGradient(x, centerY, 0, x, centerY, radius)
        grad.addColorStop(0, '#8B7355')
        grad.addColorStop(1, '#6B5B4F')
        ctx.fillStyle = grad
        ctx.shadowColor = '#6B5B4F'
        ctx.shadowBlur = 4
      }

      ctx.fill()
      ctx.shadowBlur = 0
    }

    const hitX = 30
    ctx.beginPath()
    ctx.arc(hitX, centerY, 12, 0, Math.PI * 2)
    ctx.strokeStyle = '#CC7722'
    ctx.lineWidth = 2
    ctx.shadowColor = '#CC7722'
    ctx.shadowBlur = 10
    ctx.stroke()
    ctx.shadowBlur = 0

    ctx.beginPath()
    ctx.moveTo(hitX, 5)
    ctx.lineTo(hitX, h - 5)
    ctx.strokeStyle = 'rgba(204, 119, 34, 0.3)'
    ctx.lineWidth = 1
    ctx.stroke()
  }, [nextBeats, beatProgress])

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 select-none pointer-events-none"
      style={{ width: '80%', maxWidth: 500 }}
    >
      <div className="rounded-xl overflow-hidden"
        style={{
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          background: 'rgba(42, 27, 15, 0.6)',
          border: '1px solid rgba(139, 115, 85, 0.3)',
          boxShadow: '0 4px 30px rgba(0, 0, 0, 0.3)',
        }}
      >
        <canvas
          ref={canvasRef}
          width={480}
          height={40}
          className="w-full"
          style={{ height: 40 }}
        />
      </div>
    </div>
  )
}
