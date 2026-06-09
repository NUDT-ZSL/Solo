import React, { useState, useEffect } from 'react';

interface FavoriteButtonProps {
  isFavorited: boolean;
  onToggle: () => void;
  size?: 'small' | 'medium' | 'large';
}

const FavoriteButton: React.FC<FavoriteButtonProps> = ({ isFavorited, onToggle, size = 'medium' }) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [localFavorited, setLocalFavorited] = useState(isFavorited);

  useEffect(() => {
    setLocalFavorited(isFavorited);
  }, [isFavorited]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAnimating(true);
    setLocalFavorited(!localFavorited);
    onToggle();
    setTimeout(() => setIsAnimating(false), 600);
  };

  const sizeMap = {
    small: '20px',
    medium: '28px',
    large: '36px'
  };

  return (
    <>
      <button
        className={`favorite-btn ${isAnimating ? 'bounce' : ''}`}
        onClick={handleClick}
        aria-label={localFavorited ? '取消收藏' : '收藏'}
        style={{ width: sizeMap[size], height: sizeMap[size] }}
      >
        <svg
          viewBox="0 0 24 24"
          width={sizeMap[size]}
          height={sizeMap[size]}
          className={`heart-icon ${localFavorited ? 'filled' : ''}`}
        >
          <path
            d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
            fill={localFavorited ? '#E67E22' : 'none'}
            stroke={localFavorited ? '#E67E22' : '#95a5a6'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <style>{`
        .favorite-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.95);
          border: none;
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
          transition: transform 0.2s ease, background 0.2s ease;
          padding: 0;
        }
        .favorite-btn:hover {
          background: #ffffff;
          transform: scale(1.1);
        }
        .favorite-btn:active {
          transform: scale(0.95);
        }
        .heart-icon {
          transition: all 0.3s ease;
        }
        .heart-icon.filled {
          animation: heartFill 0.3s ease forwards;
        }
        @keyframes heartFill {
          0% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.3);
          }
          100% {
            transform: scale(1);
          }
        }
        .bounce {
          animation: bounce 0.6s ease;
        }
        @keyframes bounce {
          0%, 100% {
            transform: scale(1);
          }
          25% {
            transform: scale(1.25);
          }
          50% {
            transform: scale(0.95);
          }
          75% {
            transform: scale(1.1);
          }
        }
      `}</style>
    </>
  );
};

export default FavoriteButton;
