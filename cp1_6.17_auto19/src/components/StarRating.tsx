interface StarRatingProps {
  value: number;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  hoverValue?: number;
  onHover?: (v: number) => void;
  onClick?: (v: number) => void;
  showScore?: boolean;
  count?: number;
}

const StarIcon = ({ filled, half, interactive, hovered, size }: {
  filled: boolean;
  half?: boolean;
  interactive?: boolean;
  hovered?: boolean;
  size: 'sm' | 'md' | 'lg';
}) => {
  const sizeMap = { sm: 14, md: 16, lg: 32 };
  const cls = [
    'star-icon',
    filled ? 'filled' : '',
    half ? 'half' : '',
    interactive && hovered ? 'hovered' : '',
  ].filter(Boolean).join(' ');

  return (
    <svg
      className={cls}
      width={sizeMap[size]}
      height={sizeMap[size]}
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
    </svg>
  );
};

export default function StarRating({
  value,
  size = 'md',
  interactive = false,
  hoverValue = 0,
  onHover,
  onClick,
  showScore = false,
  count,
}: StarRatingProps) {
  const displayValue = interactive && hoverValue > 0 ? hoverValue : value;
  const stars = [];

  for (let i = 1; i <= 5; i++) {
    const filled = i <= Math.floor(displayValue);
    const half = !filled && i - 0.5 <= displayValue;
    const hovered = interactive && i <= hoverValue;

    stars.push(
      <span
        key={i}
        onMouseEnter={interactive && onHover ? () => onHover(i) : undefined}
        onClick={interactive && onClick ? () => onClick(i) : undefined}
        style={{ display: 'inline-flex' }}
      >
        <StarIcon
          filled={filled}
          half={!interactive ? half : false}
          interactive={interactive}
          hovered={hovered}
          size={size}
        />
      </span>
    );
  }

  if (!interactive) {
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <span className="stars-display">{stars}</span>
        {showScore && (
          <>
            <span className="rating-score">{value.toFixed(1)}</span>
            {typeof count === 'number' && count > 0 && (
              <span className="rating-count">({count})</span>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <span
      className="rating-stars-interactive"
      onMouseLeave={onHover ? () => onHover(0) : undefined}
    >
      {stars}
    </span>
  );
}
