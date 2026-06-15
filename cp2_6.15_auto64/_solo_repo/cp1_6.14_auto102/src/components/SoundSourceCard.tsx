import React, { useRef, useState, useEffect } from 'react'
import type { SoundSource } from '../types'

interface SoundSourceCardProps {
  sound: SoundSource
  onDragStart?: (sound: SoundSource, e: React.DragEvent) => void
  onDragEnd?: (sound: SoundSource) => void
  style?: React.CSSProperties
  className?: string
}

const SoundSourceCard: React.FC<SoundSourceCardProps> = ({
  sound,
  onDragStart,
  onDragEnd,
  style,
  className = '',
}) => {
  const [isDragging, setIsDragging] = useState(false)
  const [justDropped, setJustDropped] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (justDropped) {
      const timer = setTimeout(() => setJustDropped(false), 300)
      return () => clearTimeout(timer)
    }
  }, [justDropped])

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
    setJustDropped(true)
    onDragEnd?.(sound)
  }

  const getTransform = () => {
    if (isDragging) return 'scale(1.02)'
    if (justDropped) return 'scale(1.05)'
    return 'scale(1)'
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
        transition: isDragging ? 'opacity 0.2s ease' : justDropped ? 'transform 0.15s ease-out' : 'all 0.2s ease',
        opacity: isDragging ? 0.7 : 1,
        transform: getTransform(),
        boxShadow: isDragging
          ? '0 8px 24px rgba(108, 92, 231, 0.3)'
          : justDropped
          ? '0 2px 8px rgba(108, 92, 231, 0.2)'
          : 'none',
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
      <span
        style={{
          fontSize: '14px',
          color: '#7c7599',
          cursor: 'grab',
          flexShrink: 0,
        }}
        title="拖拽到混音区"
      >
        ⠿
      </span>
    </div>
  )
}

export default SoundSourceCard
