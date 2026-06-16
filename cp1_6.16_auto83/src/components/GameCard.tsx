import { useState } from 'react'
import { Star } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useScoreStore } from '@/stores/scoreStore'
import type { GameListItem } from '@/stores/gameStore'

interface GameCardProps {
  game: GameListItem
}

export default function GameCard({ game }: GameCardProps) {
  const [hoverStar, setHoverStar] = useState(0)
  const [imgLoaded, setImgLoaded] = useState(false)
  const navigate = useNavigate()
  const { scores, rateGame } = useScoreStore()
  const currentScore = scores[game.id] || 0
  const displayScore = hoverStar || currentScore

  const handleRate = (score: number) => {
    rateGame(game.id, score)
  }

  return (
    <div
      className="game-card group cursor-pointer"
      style={{
        width: '280px',
        background: 'linear-gradient(135deg, #2C3E50, #34495E)',
        borderRadius: '16px',
        overflow: 'hidden',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease',
        boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
      }}
      onMouseEnter={(e) => {
        ;(e.currentTarget as HTMLDivElement).style.transform = 'translateY(-8px)'
        ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 12px 24px #1A252F'
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'
        ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 6px rgba(0,0,0,0.3)'
      }}
    >
      <div
        className="relative overflow-hidden"
        style={{ aspectRatio: '3/2' }}
        onClick={() => navigate(`/game/${game.id}`)}
      >
        <img
          src={game.thumbnail}
          alt={game.title}
          onLoad={() => setImgLoaded(true)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: imgLoaded ? 1 : 0,
            transition: 'opacity 0.4s ease',
          }}
        />
        {!imgLoaded && (
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(135deg, #2C3E50, #34495E)',
            }}
          />
        )}
        <div
          className="absolute top-2 right-2 px-2 py-0.5 text-xs font-semibold rounded-full"
          style={{ background: '#E74C3C', color: '#fff' }}
        >
          {game.genre}
        </div>
        {game.totalScore >= 100 && (
          <div
            className="absolute top-2 left-2 px-2 py-0.5 text-xs font-semibold rounded-full flex items-center gap-1"
            style={{ background: '#FFD700', color: '#1A1A2E' }}
          >
            ★ 已解锁
          </div>
        )}
      </div>

      <div className="p-4" onClick={() => navigate(`/game/${game.id}`)}>
        <h3
          className="text-base font-bold mb-1 truncate"
          style={{ color: '#ECF0F1' }}
        >
          {game.title}
        </h3>
        <p className="text-xs mb-2" style={{ color: '#BDC3C7' }}>
          {game.developer}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: '#F1C40F' }}>
            {game.rating}
          </span>
          <div className="flex">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                size={16}
                className="cursor-pointer"
                style={{
                  fill: star <= displayScore ? '#F1C40F' : 'transparent',
                  color: star <= displayScore ? '#F1C40F' : '#BDC3C7',
                  transition: 'fill 0.2s ease, color 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.stopPropagation()
                  setHoverStar(star)
                }}
                onMouseLeave={() => setHoverStar(0)}
                onClick={(e) => {
                  e.stopPropagation()
                  handleRate(star)
                }}
              />
            ))}
          </div>
          <span className="text-xs ml-auto" style={{ color: '#7F8C8D' }}>
            累计 {game.totalScore}分
          </span>
        </div>
      </div>
    </div>
  )
}
