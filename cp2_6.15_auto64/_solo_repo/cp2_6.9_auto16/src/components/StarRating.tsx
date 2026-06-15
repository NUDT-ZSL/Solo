import React, { useState } from 'react';

interface StarRatingProps {
  rating: number;
  onRate?: (rating: number) => void;
  interactive?: boolean;
  size?: 'small' | 'medium' | 'large';
}

const StarRating: React.FC<StarRatingProps> = ({ rating, onRate, interactive = false, size = 'medium' }) => {
  const [hoverRating, setHoverRating] = useState(0);
  const displayRating = hoverRating || rating;

  const sizeMap = {
    small: '16px',
    medium: '22px',
    large: '30px'
  };

  const handleClick = (value: number) => {
    if (interactive && onRate) {
      onRate(value);
    }
  };

  return (
    <>
      <div className="star-rating" style={{ gap: size === 'small' ? '2px' : '4px' }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className={`star-btn ${interactive ? 'interactive' : ''}`}
            onClick={() => handleClick(star)}
            onMouseEnter={() => interactive && setHoverRating(star)}
            onMouseLeave={() => interactive && setHoverRating(0)}
            disabled={!interactive}
          >
            <svg
              width={sizeMap[size]}
              height={sizeMap[size]}
              viewBox="0 0 24 24"
              fill={star <= displayRating ? '#F1C40F' : 'none'}
              stroke={star <= displayRating ? '#F1C40F' : '#D5DBDB'}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </button>
        ))}
      </div>
      <style>{`
        .star-rating {
          display: inline-flex;
          align-items: center;
        }
        .star-btn {
          background: none;
          border: none;
          padding: 0;
          cursor: default;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s ease;
        }
        .star-btn.interactive {
          cursor: pointer;
        }
        .star-btn.interactive:hover {
          transform: scale(1.2);
        }
        .star-btn.interactive:active {
          transform: scale(0.95);
        }
        .star-btn:focus {
          outline: none;
        }
      `}</style>
    </>
  );
};

export default StarRating;
