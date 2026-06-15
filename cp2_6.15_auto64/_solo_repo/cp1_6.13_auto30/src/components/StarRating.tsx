interface StarRatingProps {
  rating: number
  size?: number
  interactive?: boolean
  onChange?: (rating: number) => void
}

export default function StarRating({ rating, size = 20, interactive = false, onChange }: StarRatingProps) {
  const displayRating = Math.round(rating)

  const handleClick = (i: number) => {
    if (interactive && onChange) {
      onChange(i)
    }
  }

  return (
    <div style={{ display: 'flex', gap: '2px' }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill={i <= displayRating ? '#f59e0b' : '#d1d5db'}
          style={{ cursor: interactive ? 'pointer' : 'default' }}
          onClick={() => handleClick(i)}
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  )
}
