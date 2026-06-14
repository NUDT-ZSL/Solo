import React, { useRef, useState } from 'react'
import type { SoundSource } from '../http'

interface SoundSourceCardProps {
  sound: SoundSource
  onDragStart?: (sound: SoundSource, e: React.DragEvent) => void
  style?: React.CSSProperties
  className?: string
}

const SoundSourceCard: React.FC<SoundSourceCardProps> = ({
  sound,
  onDragStart,
  style,
  className = '',
}) => {
  const [isDragging, setIsDragging] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true)
    e.dataTransfer.effectAllowed = 'copy'
    e.dataTransfer.setData('application/json', JSON.stringify(sound))
    onDragStart?.(sound, e)

    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect()
      e.dataTransfer.setDragImage(cardRef.current, rect.width / 2, rect.height / 2)
    }
  }

  const handleDragEnd = () => {
    setIsDragging(false)
  }

  return (
    <div
      ref={cardRef}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={`sound-source-card ${className}`}
      style={{
        width: '136px',
        height: '56px',
        borderRadius: '8px',
        background: '#3a3650',
        color: '#e0d8f0',
        display: 'flex',
        alignItems: 'center',
        padding: '0 12px',
        gap: '10px',
        cursor: 'grab',
        userSelect: 'none',
        transition: 'all 0.2s ease',
        opacity: isDragging ? 0.7 : 1,
        transform: isDragging ? 'scale(1.02)' : 'scale(1)',
        boxShadow: isDragging ? '0 8px 24px rgba(108, 92, 231, 0.3)' : 'none',
        ...style,
      }}
    >
      <span
        style={{
          fontSize: '24px',
          lineHeight: 1,
          flexShrink: 0,
        }}
      >
        {sound.emoji}
      </span>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          flex: 1,
          minWidth: 0,
        }}
      >
        <span
          style={{
            fontSize: '13px',
            fontWeight: 500,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {sound.name}
        </span>
        <span
          style={{
            fontSize: '10px',
            color: '#a8a0c0',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {sound.category}
        </span>
      </div>
    </div>
  )
}

export default SoundSourceCard
