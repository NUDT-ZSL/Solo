import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import HeartIcon from './HeartIcon';
import { formatPrice } from '../utils/format';
import type { Score } from '../types';

interface ScoreCardProps {
  score: Score;
  favorited: boolean;
  onFavoriteToggle: (scoreId: string) => void;
}

const DEFAULT_PLACEHOLDER =
  'data:image/svg+xml;charset=UTF-8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400" viewBox="0 0 300 400">
      <rect fill="#f0ece6" width="300" height="400"/>
      <g fill="none" stroke="#d4c5a9" stroke-width="2">
        <rect x="50" y="50" width="200" height="300" rx="8"/>
        <line x1="70" y1="90" x2="230" y2="90"/>
        <line x1="70" y1="120" x2="200" y2="120"/>
        <line x1="70" y1="150" x2="180" y2="150"/>
        <circle cx="150" cy="250" r="40"/>
        <line x1="150" y1="210" x2="150" y2="290"/>
        <line x1="110" y1="250" x2="190" y2="250"/>
      </g>
      <text x="150" y="360" text-anchor="middle" fill="#b8860b" font-family="serif" font-size="16">乐谱加载失败</text>
    </svg>`
  );

export default function ScoreCard({
  score,
  favorited,
  onFavoriteToggle,
}: ScoreCardProps) {
  const navigate = useNavigate();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [heartHovered, setHeartHovered] = useState(false);
  const [isFavoriteLoading, setIsFavoriteLoading] = useState(false);

  const handleCardClick = () => {
    navigate(`/score/${score.id}`);
  };

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isFavoriteLoading) return;
    setIsFavoriteLoading(true);
    try {
      await onFavoriteToggle(score.id);
    } finally {
      setIsFavoriteLoading(false);
    }
  };

  const handleImageError = () => {
    console.warn(`图片加载失败: ${score.thumbnailUrl}`);
    setImageError(true);
    setImageLoaded(true);
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  return (
    <div
      onClick={handleCardClick}
      style={{
        width: '200px',
        borderRadius: '12px',
        backgroundColor: '#faf6f0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        display: 'flex',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'transform 0.3s ease-out, box-shadow 0.3s ease-out',
        flexShrink: 0,
        position: 'relative',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-5px)';
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.18)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
      }}
    >
      <div
        style={{
          width: '60%',
          overflow: 'hidden',
          backgroundColor: '#f0ece6',
          position: 'relative',
        }}
      >
        {!imageLoaded && !imageError && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: '#f0ece6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#d4c5a9"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
        )}
        <img
          src={imageError ? DEFAULT_PLACEHOLDER : score.thumbnailUrl}
          alt={score.title}
          onLoad={handleImageLoad}
          onError={handleImageError}
          style={{
            width: '100%',
            height: '100%',
            minHeight: '150px',
            objectFit: imageError ? 'contain' : 'cover',
            display: 'block',
            opacity: imageLoaded ? 1 : 0,
            transition: 'opacity 0.4s ease-in-out',
            backgroundColor: '#f0ece6',
          }}
          loading="lazy"
        />
      </div>

      <div
        style={{
          width: '40%',
          padding: '12px 10px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '6px',
        }}
      >
        <div>
          <h3
            className="serif"
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: '#333',
              marginBottom: '4px',
              lineHeight: 1.3,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {score.title}
          </h3>
          <p
            style={{
              fontSize: '12px',
              color: '#888',
              display: '-webkit-box',
              WebkitLineClamp: 1,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {score.composer}
          </p>
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span
            style={{
              fontSize: '15px',
              fontWeight: 600,
              color: '#b8860b',
            }}
          >
            {formatPrice(score.price)}
          </span>
        </div>
      </div>

      <div
        onClick={handleFavoriteClick}
        onMouseEnter={(e) => {
          setHeartHovered(true);
          e.currentTarget.style.transform = 'scale(1.1)';
        }}
        onMouseLeave={(e) => {
          setHeartHovered(false);
          e.currentTarget.style.transform = 'scale(1)';
        }}
        style={{
          position: 'absolute',
          right: '8px',
          bottom: '8px',
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          backgroundColor: isFavoriteLoading
            ? 'rgba(255,255,255,0.7)'
            : 'rgba(255,255,255,0.92)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: isFavoriteLoading ? 'wait' : 'pointer',
          boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
          transition: 'transform 0.2s, background-color 0.2s',
          backdropFilter: 'blur(4px)',
          opacity: isFavoriteLoading ? 0.6 : 1,
        }}
        title={favorited ? '取消收藏' : '收藏'}
      >
        <HeartIcon filled={favorited} size={16} hovered={heartHovered} />
      </div>

      <style>{`
        @media (max-width: 768px) {
          div[style*="width: '200px'"] {
            width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
}
