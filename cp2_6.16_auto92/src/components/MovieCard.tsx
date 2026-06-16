import { useState } from 'react'
import type { Movie } from '@/types'

interface MovieCardProps {
  movie: Movie
  onAddToSchedule?: () => void
  draggable?: boolean
  onDragStart?: (e: React.DragEvent) => void
  isFlipped?: boolean
  onFlip?: () => void
}

export default function MovieCard({
  movie,
  onAddToSchedule,
  draggable = false,
  onDragStart,
  isFlipped: controlledFlipped,
  onFlip,
}: MovieCardProps) {
  const [internalFlipped, setInternalFlipped] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const isFlipped = controlledFlipped !== undefined ? controlledFlipped : internalFlipped

  const handleClick = () => {
    if (onFlip) onFlip()
    else setInternalFlipped((prev) => !prev)
  }

  const handleDragStart = (e: React.DragEvent) => {
    if (onDragStart) {
      onDragStart(e)
    } else {
      e.dataTransfer.setData('movieId', movie.id)
      e.dataTransfer.effectAllowed = 'move'
    }
  }

  const cardHeight = 360
  const hoverOffset = isHovered ? -8 : 0

  return (
    <div
      style={{
        perspective: '1000px',
        width: '100%',
        maxWidth: '260px',
        height: `${cardHeight}px`,
        cursor: 'pointer',
        margin: '0 auto',
      }}
      draggable={draggable}
      onDragStart={handleDragStart}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        onClick={handleClick}
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          transformStyle: 'preserve-3d',
          transition: 'transform 0.4s ease-out',
          transform: `rotateY(${isFlipped ? 180 : 0}deg) translateY(${hoverOffset}px)`,
          boxShadow: isHovered
            ? '0 8px 24px rgba(192, 132, 252, 0.3)'
            : 'none',
        }}
      >
        {/* 正面 */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            borderRadius: '16px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <div
            style={{
              width: '100%',
              height: '180px',
              borderRadius: '12px',
              backgroundColor: movie.posterColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
            }}
          >
            <span style={{ fontSize: '80px' }}>{movie.posterEmoji}</span>
          </div>
          <h3
            style={{
              color: '#fff',
              fontSize: '18px',
              fontWeight: 600,
              marginBottom: '8px',
              lineHeight: 1.3,
            }}
          >
            {movie.title}
          </h3>
          <div
            style={{
              color: '#ddd6fe',
              fontSize: '14px',
              marginBottom: '12px',
            }}
          >
            ⏱ {movie.duration} 分钟
          </div>
          <span
            style={{
              display: 'inline-block',
              padding: '4px 12px',
              borderRadius: '9999px',
              backgroundColor: 'rgba(192, 132, 252, 0.2)',
              color: '#c084fc',
              fontSize: '12px',
              alignSelf: 'flex-start',
            }}
          >
            {movie.genre}
          </span>
        </div>

        {/* 背面 */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            borderRadius: '16px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <h4
            style={{
              color: '#c084fc',
              fontSize: '16px',
              fontWeight: 600,
              marginBottom: '12px',
            }}
          >
            剧情简介
          </h4>
          <p
            style={{
              color: '#ddd6fe',
              fontSize: '14px',
              lineHeight: 1.6,
              flex: 1,
              overflowY: 'auto',
            }}
          >
            {movie.synopsis}
          </p>
          {onAddToSchedule && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onAddToSchedule()
              }}
              style={{
                marginTop: '16px',
                padding: '12px 20px',
                borderRadius: '10px',
                backgroundColor: '#c084fc',
                color: '#fff',
                fontSize: '14px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)'
                e.currentTarget.style.boxShadow =
                  '0 4px 16px rgba(192, 132, 252, 0.4)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              加入排片
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
