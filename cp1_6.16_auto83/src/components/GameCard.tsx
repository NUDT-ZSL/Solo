import { useState, useRef, useEffect, useCallback } from 'react'
import { Star, ChevronLeft, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useScoreStore } from '@/stores/scoreStore'
import type { GameListItem } from '@/stores/gameStore'

interface GameCardProps {
  game: GameListItem
}

export default function GameCard({ game }: GameCardProps) {
  const [hoverStar, setHoverStar] = useState(0)
  const [imgLoaded, setImgLoaded] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [previewVisible, setPreviewVisible] = useState(false)
  const [carouselIndex, setCarouselIndex] = useState(0)
  const [previewPosition, setPreviewPosition] = useState<'right' | 'top'>('right')
  const cardRef = useRef<HTMLDivElement>(null)
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const carouselTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const navigate = useNavigate()
  const { scores, rateGame } = useScoreStore()
  const currentScore = scores[game.id] || 0
  const displayScore = hoverStar || currentScore

  const previewScreenshots = game.previewScreenshots || []

  const handleRate = (score: number) => {
    rateGame(game.id, score)
  }

  const startCarousel = useCallback(() => {
    if (previewScreenshots.length <= 1) return
    carouselTimerRef.current = setInterval(() => {
      setCarouselIndex((prev) => (prev + 1) % previewScreenshots.length)
    }, 3000)
  }, [previewScreenshots.length])

  const stopCarousel = useCallback(() => {
    if (carouselTimerRef.current) {
      clearInterval(carouselTimerRef.current)
      carouselTimerRef.current = null
    }
  }, [])

  const nextSlide = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (previewScreenshots.length === 0) return
    setCarouselIndex((prev) => (prev + 1) % previewScreenshots.length)
  }

  const prevSlide = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (previewScreenshots.length === 0) return
    setCarouselIndex((prev) => (prev - 1 + previewScreenshots.length) % previewScreenshots.length)
  }

  const handleCardMouseEnter = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current)
    }
    hoverTimerRef.current = setTimeout(() => {
      setShowPreview(true)
      setCarouselIndex(0)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setPreviewVisible(true)
        })
      })
      startCarousel()
    }, 1000)
  }, [startCarousel])

  const handleCardMouseLeave = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current)
      hoverTimerRef.current = null
    }
    setPreviewVisible(false)
    stopCarousel()
    setTimeout(() => {
      setShowPreview(false)
    }, 200)
  }, [stopCarousel])

  const checkPosition = useCallback(() => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const spaceRight = viewportWidth - rect.right
    const spaceTop = rect.top
    if (spaceRight >= 300) {
      setPreviewPosition('right')
    } else if (spaceTop >= 300) {
      setPreviewPosition('top')
    } else {
      setPreviewPosition('right')
    }
  }, [])

  useEffect(() => {
    if (showPreview) {
      checkPosition()
    }
  }, [showPreview, checkPosition])

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
      if (carouselTimerRef.current) clearInterval(carouselTimerRef.current)
    }
  }, [])

  const previewStyle: React.CSSProperties = {
    position: 'absolute',
    width: '280px',
    background: 'rgba(30,30,46,0.95)',
    borderRadius: '12px',
    padding: '12px',
    zIndex: 50,
    opacity: previewVisible ? 1 : 0,
    transform: previewVisible ? 'translateY(0)' : 'translateY(10px)',
    transition: 'opacity 0.3s ease, transform 0.3s ease',
    pointerEvents: 'none',
    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
    backdropFilter: 'blur(8px)',
    border: '1px solid rgba(52,73,94,0.5)',
  }

  if (previewPosition === 'right') {
    previewStyle.left = 'calc(100% + 12px)'
    previewStyle.top = '0'
  } else {
    previewStyle.bottom = 'calc(100% + 12px)'
    previewStyle.left = '0'
    previewStyle.transform = previewVisible ? 'translateY(0)' : 'translateY(10px)'
  }

  return (
    <div
      ref={cardRef}
      className="game-card group cursor-pointer relative"
      style={{
        width: '280px',
      }}
      onMouseEnter={handleCardMouseEnter}
      onMouseLeave={handleCardMouseLeave}
    >
      <div
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

      {showPreview && previewScreenshots.length > 0 && (
        <div style={previewStyle}>
          <div
            className="relative overflow-hidden rounded-lg mb-3"
            style={{ aspectRatio: '3/2' }}
          >
            <div
              className="flex"
              style={{
                width: '100%',
                height: '100%',
                transform: `translateX(-${carouselIndex * 100}%)`,
                transition: 'transform 0.4s ease',
              }}
            >
              {previewScreenshots.map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt={`预览 ${i + 1}`}
                  className="flex-shrink-0 w-full h-full"
                  style={{ objectFit: 'cover' }}
                  draggable={false}
                />
              ))}
            </div>
            {previewScreenshots.length > 1 && (
              <>
                <button
                  onClick={prevSlide}
                  className="absolute left-1 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center"
                  style={{
                    background: 'rgba(0,0,0,0.5)',
                    color: '#fff',
                    pointerEvents: 'auto',
                    transition: 'background 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    ;(e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.8)'
                  }}
                  onMouseLeave={(e) => {
                    ;(e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.5)'
                  }}
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  onClick={nextSlide}
                  className="absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center"
                  style={{
                    background: 'rgba(0,0,0,0.5)',
                    color: '#fff',
                    pointerEvents: 'auto',
                    transition: 'background 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    ;(e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.8)'
                  }}
                  onMouseLeave={(e) => {
                    ;(e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.5)'
                  }}
                >
                  <ChevronRight size={14} />
                </button>
              </>
            )}
            <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1">
              {previewScreenshots.map((_, i) => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    background: i === carouselIndex ? '#F1C40F' : 'rgba(255,255,255,0.4)',
                    transition: 'background 0.2s ease',
                  }}
                />
              ))}
            </div>
          </div>
          <p className="text-sm leading-relaxed line-clamp-3" style={{ color: '#BDC3C7' }}>
            {game.description}
          </p>
        </div>
      )}
    </div>
  )
}
