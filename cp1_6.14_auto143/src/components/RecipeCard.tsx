import { useState } from 'react'
import { Heart } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Recipe, MatchLevel, CuisineType } from '@/types'
import StarRating from './StarRating'

export interface RecipeCardProps {
  recipe: Recipe
  onRate?: (id: string, rating: number) => void
  onFavorite?: (id: string) => void
  onCardClick?: (id: string) => void
  index?: number
  showMatch?: boolean
  matchLevel?: MatchLevel
  matchedIngredients?: string[]
}

const cuisineMap: Record<CuisineType, string> = {
  chinese: '中餐',
  western: '西餐',
  japanese: '日料',
  korean: '韩餐',
}

const matchLevelConfig: Record<MatchLevel, { label: string; bg: string; text: string }> = {
  perfect: { label: '完美匹配', bg: 'bg-green-100', text: 'text-green-700' },
  partial: { label: '部分匹配', bg: 'bg-yellow-100', text: 'text-yellow-700' },
  little: { label: '少量匹配', bg: 'bg-red-100', text: 'text-red-700' },
}

export default function RecipeCard({
  recipe,
  onRate,
  onFavorite,
  onCardClick,
  index = 0,
  showMatch = false,
  matchLevel,
  matchedIngredients = [],
}: RecipeCardProps) {
  const [isFavorite, setIsFavorite] = useState(false)
  const [heartAnimating, setHeartAnimating] = useState(false)

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation()
    setHeartAnimating(true)
    setIsFavorite(!isFavorite)
    onFavorite?.(recipe.id)
    setTimeout(() => setHeartAnimating(false), 400)
  }

  const handleRate = (rating: number) => {
    onRate?.(recipe.id, rating)
  }

  return (
    <div
      className={cn(
        'card-fade-in w-[320px] md:w-[320px] w-full rounded-2xl bg-white shadow-[0_4px_12px_rgba(0,0,0,0.06)] overflow-hidden cursor-pointer',
        'transition-all duration-300 ease hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)]'
      )}
      style={{ animationDelay: `${index * 0.05}s` }}
      onClick={() => onCardClick?.(recipe.id)}
    >
      <div className="relative">
        <img
          src={recipe.coverImage}
          alt={recipe.title}
          className="w-full h-[200px] object-cover rounded-t-2xl"
        />
        <button
          type="button"
          onClick={handleFavorite}
          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-md transition-transform hover:scale-110 active:scale-95"
          aria-label="收藏"
        >
          <Heart
            size={18}
            className={cn(
              heartAnimating && 'star-bounce',
              isFavorite ? 'fill-red-500 stroke-red-500' : 'stroke-gray-400 fill-transparent'
            )}
          />
        </button>
        {showMatch && matchLevel && (
          <div
            className={cn(
              'absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-medium',
              matchLevelConfig[matchLevel].bg,
              matchLevelConfig[matchLevel].text
            )}
          >
            {matchLevelConfig[matchLevel].label}
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="text-lg font-bold text-[#1f2937] mb-2 line-clamp-1">{recipe.title}</h3>
        <div className="flex items-center gap-2 mb-3">
          <span className="px-3 py-1 rounded-lg bg-[#fef3c7] text-[#b45309] text-xs font-medium">
            {cuisineMap[recipe.cuisine]}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <StarRating
            rating={recipe.rating}
            maxStars={3}
            readonly={!onRate}
            size={20}
            onRate={onRate ? handleRate : undefined}
          />
          <span className="text-xs text-gray-400">{recipe.ratingCount} 人评分</span>
        </div>
        {showMatch && matchedIngredients.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-1.5">匹配食材：</p>
            <div className="flex flex-wrap gap-1">
              {matchedIngredients.map((ing) => (
                <span
                  key={ing}
                  className="px-2 py-0.5 rounded-md bg-green-50 text-green-700 text-xs"
                >
                  {ing}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
