import React from 'react';

interface StarRatingProps {
  rating: number;
  size?: 'small' | 'large';
  interactive?: boolean;
  onRate?: (rating: number) => void;
}

const StarRating: React.FC<StarRatingProps> = ({
  rating,
  size = 'small',
  interactive = false,
  onRate,
}) => {
  const [hoverRating, setHoverRating] = React.useState<number | null>(null);

  const displayRating = hoverRating !== null ? hoverRating : rating;
  const fullStars = Math.floor(displayRating);
  const partialStar = displayRating - fullStars;

  const handleClick = (index: number) => {
    if (!interactive || !onRate) return;
    onRate(index + 1);
  };

  const handleMouseEnter = (index: number) => {
    if (!interactive) return;
    setHoverRating(index + 1);
  };

  const handleMouseLeave = () => {
    if (!interactive) return;
    setHoverRating(null);
  };

  const starClass = size === 'large' ? 'star-large' : 'star-mini';
  const containerClass = size === 'large' ? 'stars-large' : 'stars-mini';

  return (
    <div className={containerClass}>
      {[0, 1, 2, 3, 4].map((index) => {
        const isFull = index < fullStars;
        const isPartial = index === fullStars && partialStar > 0 && !interactive;

        return (
          <span
            key={index}
            className={`${starClass} ${isFull ? 'filled' : ''} ${
              interactive && hoverRating !== null && index < hoverRating ? 'selected' : ''
            }`}
            onClick={() => handleClick(index)}
            onMouseEnter={() => handleMouseEnter(index)}
            onMouseLeave={handleMouseLeave}
          >
            ★
            {isPartial && (
              <span
                className="star-fill"
                style={{ width: `${partialStar * 100}%` }}
              >
                ★
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
};

export default StarRating;
