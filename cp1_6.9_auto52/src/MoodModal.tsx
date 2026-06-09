import React, { useEffect, useRef, useState } from 'react'
import type { MoodRecord } from './types'
import { drawBadgeToCanvas } from './BadgeCanvas'

interface Props {
  mood: MoodRecord | null
  onClose: () => void
}

export const MoodModal: React.FC<Props> = ({ mood, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [replaying, setReplaying] = useState(false)
  const [bgColor, setBgColor] = useState('rgba(255,255,255,0)')

  useEffect(() => {
    if (!mood || !canvasRef.current) return
    const size = 80
    drawBadgeToCanvas(canvasRef.current, {
      color: mood.color,
      emoji: mood.emoji,
      rotation: mood.badgeParams.rotation,
      size,
      shape: mood.shape,
    })
    setReplaying(false)
    setBgColor('rgba(255,255,255,0)')
  }, [mood])

  if (!mood) return null

  const timeStr = new Date(mood.timestamp).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })

  const handleReplay = () => {
    const [r, g, b] = mood.color.replace('#', '').match(/.{2}/g)!.map((h) => parseInt(h, 16))
    setBgColor(`rgba(${r},${g},${b},0.3)`)
    setReplaying(true)
    setTimeout(() => setBgColor('rgba(255,255,255,0)'), 2000)
    setTimeout(() => setReplaying(false), 2050)
  }

  const onOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div className="modal-overlay" onClick={onOverlayClick}>
      <div className="modal-card" role="dialog" aria-modal="true">
        <div className="modal-header">
          <div className="modal-mood-label">
            {mood.emoji} {mood.label}
            <span style={{ marginLeft: 8, fontSize: 12, color: '#8890A4', fontWeight: 400 }}>
              {mood.score}分
            </span>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="关闭">
            ×
          </button>
        </div>

        <div className="modal-time">⏰ {timeStr}</div>

        <div
          className={`replay-wrap ${replaying ? 'replaying' : ''}`}
          style={{ alignSelf: 'center', marginBottom: 16 }}
        >
          <div className="replay-bg" style={{ backgroundColor: bgColor }} />
          <canvas
            ref={canvasRef}
            className="replay-el"
            style={{
              animationPlayState: replaying ? 'running' : 'paused',
              animation: replaying
                ? 'replaySpin 2s ease-in-out forwards, breathe 4s ease-in-out infinite'
                : 'breathe 4s ease-in-out infinite',
              opacity: replaying ? 1 : undefined,
            }}
          />
        </div>

        <div className={`modal-note ${!mood.note ? 'empty' : ''}`}>
          {mood.note || '（没有笔记）'}
        </div>

        <button className="modal-replay-btn" onClick={handleReplay}>
          ✨ 回放动画
        </button>
      </div>
    </div>
  )
}
