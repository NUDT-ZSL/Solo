import { useState } from 'react'
import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface StarRatingProps {
  rating: number
  maxStars?: number
  readonly?: boolean
  size?: number
  onRate?: (rating: number) => void
}

export default function StarRating({
  rating,
  maxStars = 3,
  readonly = false,
  size = 20,
  onRate,
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState<number>(0)
  const [bouncingStar, setBouncingStar] = useState<number | null>(null)

  const displayRating = readonly ? rating : hoverRating || rating

  const handleClick = (value: number) => {
    if (readonly || !onRate) return
    setBouncingStar(value)
    onRate(value)
    setTimeout(() => setBouncingStar(null), 400)
  }

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: maxStars }, (_, i) => {
        const value = i + 1
        const isFilled = value <= displayRating
        return (
          <button
            key={i}
            type="button"
            disabled={readonly}
            onClick={() => handleClick(value)}
            onMouseEnter={() => !readonly && setHoverRating(value)}
            onMouseLeave={() => !readonly && setHoverRating(0)}
            className={cn(
              'p-0.5 transition-colors',
              !readonly && 'cursor-pointer hover:scale-110',
              readonly && 'cursor-default'
            )}
            aria-label={`${value} 星`}
          >
            <Star
              size={size}
              className={cn(
                bouncingStar === value && 'star-bounce',
                isFilled ? 'fill-[#f59e0b] stroke-[#f59e0b]' : 'fill-transparent stroke-[#d1d5db]'
              )}
            />
          </button>
        )
      })}
    </div>
  )
}
