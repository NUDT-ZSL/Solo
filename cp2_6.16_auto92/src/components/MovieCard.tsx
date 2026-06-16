import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { Movie } from '@/types';

interface MovieCardProps {
  movie: Movie;
  onAddToSchedule?: () => void;
  draggable?: boolean;
  isFlipped?: boolean;
  onFlip?: () => void;
}

export default function MovieCard({
  movie,
  onAddToSchedule,
  draggable = false,
  isFlipped: controlledFlipped,
  onFlip,
}: MovieCardProps) {
  const [internalFlipped, setInternalFlipped] = useState(false);
  const isFlipped = controlledFlipped !== undefined ? controlledFlipped : internalFlipped;

  const handleClick = () => {
    if (onFlip) {
      onFlip();
    } else {
      setInternalFlipped((prev) => !prev);
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('movieId', movie.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      className={cn('movie-card-container', { 'cursor-grab': draggable })}
      style={{ perspective: '1000px', width: '260px', height: '360px' }}
      draggable={draggable}
      onDragStart={handleDragStart}
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
        <div
          className="movie-card-front glass-card"
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            backfaceVisibility: 'hidden',
            borderRadius: '16px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            className="poster-area"
            style={{
              width: '100%',
              height: '180px',
              borderRadius: '12px',
              backgroundColor: movie.posterColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '80px',
              marginBottom: '16px',
            }}
          >
            {movie.posterEmoji}
          </div>

          <h3
            className="movie-title"
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
            className="movie-duration"
            style={{
              color: '#ddd6fe',
              fontSize: '14px',
              marginBottom: '12px',
            }}
          >
            ⏱ {movie.duration} 分钟
          </div>

          <span
            className="genre-tag"
            style={{
              display: 'inline-block',
              padding: '4px 12px',
              borderRadius: '9999px',
              backgroundColor: 'rgba(192,132,252,0.2)',
              color: '#c084fc',
              fontSize: '12px',
              alignSelf: 'flex-start',
            }}
          >
            {movie.genre}
          </span>
        </div>

        <div
          className="movie-card-back glass-card"
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            borderRadius: '16px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <h4
            className="synopsis-title"
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
            className="synopsis-content"
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
              className="add-to-schedule-btn"
              onClick={(e) => {
                e.stopPropagation();
                onAddToSchedule();
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
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(192,132,252,0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              加入排片
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
