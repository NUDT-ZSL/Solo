import { useState } from 'react'
import type { Movie } from '@/types'

interface MovieCardProps {
  movie: Movie
  onAddToSchedule?: () => void
  draggable?: boolean
  isFlipped?: boolean
  onFlip?: () => void
}

export default function MovieCard({ movie, onAddToSchedule, draggable = false, isFlipped: controlledFlipped, onFlip }: MovieCardProps) {
  const [internalFlipped, setInternalFlipped] = useState(false)
  const isFlipped = controlledFlipped !== undefined ? controlledFlipped : internalFlipped

  const handleClick = () => {
    if (onFlip) onFlip()
    else setInternalFlipped(prev => !prev)
  }

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('movieId', movie.id)
    e.dataTransfer.effectAllowed = 'move'
  }

  return (
    <div
      style={{ perspective: '1000px' }}
      draggable={draggable}
      onDragStart={handleDragStart}
      className="movie-card-container"
    >
      <div
        className="movie-card-inner"
        onClick={handleClick}
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          transformStyle: 'preserve-3d',
          transition: 'transform 0.4s ease-out',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        {/* 正面 */}
        <div className="movie-card-face movie-card-front">
          <div className="poster-area" style={{ backgroundColor: movie.posterColor }}>
            <span className="poster-emoji">{movie.posterEmoji}</span>
          </div>
          <h3 className="movie-title">{movie.title}</h3>
          <div className="movie-duration">⏱ {movie.duration} 分钟</div>
          <span className="genre-tag">{movie.genre}</span>
        </div>
        {/* 背面 */}
        <div className="movie-card-face movie-card-back">
          <h4 className="synopsis-title">剧情简介</h4>
          <p className="synopsis-content">{movie.synopsis}</p>
          {onAddToSchedule && (
            <button
              className="add-to-schedule-btn"
              onClick={(e) => { e.stopPropagation(); onAddToSchedule() }}
            >
              加入排片
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
