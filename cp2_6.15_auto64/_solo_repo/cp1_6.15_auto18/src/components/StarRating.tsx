import { useState, useEffect } from 'react';
import '../styles/StarRating.css';

interface StarRatingProps {
  rating: number;
  size?: number;
  animated?: boolean;
  keyProp?: string;
}

function StarRating({ rating, size = 18, animated = true, keyProp }: StarRatingProps) {
  const [animateStars, setAnimateStars] = useState(0);

  useEffect(() => {
    setAnimateStars(0);
    if (animated) {
      let current = 0;
      const timer = setInterval(() => {
        current += 1;
        setAnimateStars(current);
        if (current >= 5) {
          clearInterval(timer);
        }
      }, 100);
      return () => clearInterval(timer);
    } else {
      setAnimateStars(5);
    }
  }, [animated, keyProp]);

  const getStarColor = (starIndex: number) => {
    const normalizedRating = Math.min(Math.max(rating, 1), 5);
    const progress = normalizedRating / 5;
    const r = Math.round(231 * (1 - progress) + 255 * progress);
    const g = Math.round(76 + 179 * progress);
    const b = Math.round(60 - 30 * progress);
    return `rgb(${r}, ${g}, ${b})`;
  };

  const renderStar = (index: number) => {
    const isFull = rating >= index + 1;
    const isHalf = !isFull && rating > index && rating < index + 1;
    const halfPercent = isHalf ? Math.round((rating - index) * 100) : 0;
    const color = getStarColor(index);
    const isAnimated = animateStars > index;

    const gradientId = `star-gradient-${index}-${keyProp || 'default'}`;
    const emptyColor = '#D4C8BC';

    return (
      <span
        key={index}
        className={`star ${isAnimated ? 'star-enter' : ''}`}
        style={{ 
          width: size, 
          height: size,
          animationDelay: `${index * 0.1}s`
        }}
      >
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={color} />
              {isHalf ? (
                <>
                  <stop offset={`${halfPercent}%`} stopColor={color} />
                  <stop offset={`${halfPercent}%`} stopColor={emptyColor} />
                  <stop offset="100%" stopColor={emptyColor} />
                </>
              ) : (
                <stop offset="100%" stopColor={isFull ? color : emptyColor} />
              )}
            </linearGradient>
          </defs>
          <path
            d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
            fill={`url(#${gradientId})`}
          />
        </svg>
      </span>
    );
  };

  return (
    <div className="star-rating">
      {[0, 1, 2, 3, 4].map(renderStar)}
    </div>
  );
}

export default StarRating;
