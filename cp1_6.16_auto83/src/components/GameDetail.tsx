import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  Play,
  Share2,
  X,
  Trophy,
  Clock,
  User,
} from 'lucide-react'
import { useGameStore } from '@/stores/gameStore'
import { useScoreStore } from '@/stores/scoreStore'

export default function GameDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentGame, fetchGameDetail, loading } = useGameStore()
  const { showUnlockModal, setShowUnlockModal } = useScoreStore()
  const [carouselIndex, setCarouselIndex] = useState(0)
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set())
  const [likedLogs, setLikedLogs] = useState<Set<string>>(new Set())
  const [logLikes, setLogLikes] = useState<Record<string, number>>({})
  const [conceptIndex, setConceptIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)

  useEffect(() => {
    if (id) {
      fetchGameDetail(id)
    }
  }, [id, fetchGameDetail])

  useEffect(() => {
    if (currentGame) {
      const likesMap: Record<string, number> = {}
      currentGame.devLogs.forEach((log) => {
        likesMap[log.id] = log.likes
      })
      setLogLikes(likesMap)
      if (currentGame.devLogs.length > 0) {
        setExpandedLogs(new Set([currentGame.devLogs[0].id]))
      }
    }
  }, [currentGame])

  const nextSlide = useCallback(() => {
    if (!currentGame) return
    setCarouselIndex((prev) => (prev + 1) % currentGame.screenshots.length)
  }, [currentGame])

  const prevSlide = useCallback(() => {
    if (!currentGame) return
    setCarouselIndex(
      (prev) => (prev - 1 + currentGame.screenshots.length) % currentGame.screenshots.length
    )
  }, [currentGame])

  const toggleLog = (logId: string) => {
    setExpandedLogs((prev) => {
      const next = new Set(prev)
      if (next.has(logId)) {
        next.delete(logId)
      } else {
        next.add(logId)
      }
      return next
    })
  }

  const handleLike = async (logId: string) => {
    if (likedLogs.has(logId)) return
    try {
      const res = await fetch(`/api/devlogs/${logId}/like`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setLikedLogs((prev) => new Set([...prev, logId]))
        setLogLikes((prev) => ({ ...prev, [logId]: data.likes }))
      }
    } catch {
      // silent
    }
  }

  if (loading || !currentGame) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: '#1E1E2E' }}>
        <div className="text-lg" style={{ color: '#BDC3C7' }}>加载中...</div>
      </div>
    )
  }

  const game = currentGame

  return (
    <div className="min-h-screen" style={{ background: '#1E1E2E', color: '#ECF0F1' }}>
      <div className="max-w-6xl mx-auto px-4 py-6">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 mb-6 px-4 py-2 rounded-full text-sm font-medium"
          style={{
            background: 'rgba(231,76,60,0.15)',
            color: '#E74C3C',
            border: '1px solid rgba(231,76,60,0.3)',
            transition: 'background 0.2s ease',
          }}
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.background = 'rgba(231,76,60,0.3)'
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.background = 'rgba(231,76,60,0.15)'
          }}
        >
          <ChevronLeft size={18} />
          返回列表
        </button>

        <div className="flex flex-col lg:flex-row gap-8">
          <div className="lg:w-3/5">
            <div
              className="relative overflow-hidden rounded-2xl"
              style={{ background: '#2C3E50' }}
            >
              <div
                className="flex"
                style={{
                  transition: 'transform 0.5s ease',
                  transform: `translateX(-${carouselIndex * 100}%)`,
                }}
              >
                {game.screenshots.map((src, i) => (
                  <img
                    key={i}
                    src={src}
                    alt={`截图 ${i + 1}`}
                    className="w-full flex-shrink-0"
                    style={{ aspectRatio: '16/9', objectFit: 'cover' }}
                  />
                ))}
              </div>
              <button
                onClick={prevSlide}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center"
                style={{
                  background: 'rgba(0,0,0,0.5)',
                  color: '#fff',
                  transition: 'background 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.8)'
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.5)'
                }}
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={nextSlide}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center"
                style={{
                  background: 'rgba(0,0,0,0.5)',
                  color: '#fff',
                  transition: 'background 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.8)'
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.5)'
                }}
              >
                <ChevronRight size={20} />
              </button>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
                {game.screenshots.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCarouselIndex(i)}
                    className="w-2 h-2 rounded-full"
                    style={{
                      background: i === carouselIndex ? '#F1C40F' : 'rgba(255,255,255,0.4)',
                      transition: 'background 0.2s ease',
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="lg:w-2/5">
            <h1 className="text-2xl font-bold mb-2" style={{ color: '#ECF0F1' }}>
              {game.title}
            </h1>
            <div className="flex items-center gap-3 mb-4">
              <User size={16} style={{ color: '#BDC3C7' }} />
              <span style={{ color: '#BDC3C7' }}>{game.developer}</span>
            </div>
            <div className="flex items-center gap-3 mb-4">
              <Clock size={16} style={{ color: '#BDC3C7' }} />
              <span style={{ color: '#BDC3C7' }}>{game.releaseDate}</span>
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
              {game.platforms.map((p) => (
                <span
                  key={p}
                  className="px-3 py-1 text-xs font-medium rounded-lg"
                  style={{ background: '#27AE60', color: '#fff' }}
                >
                  {p}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-sm" style={{ color: '#F1C40F' }}>
                ★ {game.rating}
              </span>
              <span className="text-sm" style={{ color: '#7F8C8D' }}>
                累计 {game.totalScore} 分
              </span>
            </div>
            {game.totalScore >= 100 && (
              <button
                onClick={() => setShowUnlockModal(game.id)}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold"
                style={{
                  background: 'linear-gradient(135deg, #FFD700, #FFA500)',
                  color: '#1A1A2E',
                  transition: 'transform 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)'
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'
                }}
              >
                <Trophy size={16} />
                查看解锁彩蛋
              </button>
            )}
          </div>
        </div>

        <div className="mt-12">
          <h2 className="text-xl font-bold mb-6" style={{ color: '#ECF0F1' }}>
            开发日志
          </h2>
          <div className="relative pl-8">
            <div
              className="absolute left-3 top-0 bottom-0 w-0.5"
              style={{ background: '#34495E' }}
            />
            {game.devLogs.map((log, index) => (
              <div key={log.id} className="relative mb-6 last:mb-0">
                <div
                  className="absolute -left-5 w-4 h-4 rounded-full border-2"
                  style={{
                    borderColor: index === 0 ? '#E74C3C' : '#BDC3C7',
                    background: index === 0 ? '#E74C3C' : 'transparent',
                    top: '6px',
                  }}
                />
                <div
                  className="rounded-xl p-4 cursor-pointer"
                  style={{
                    background: '#2C3E50',
                    transition: 'background 0.2s ease',
                  }}
                  onClick={() => toggleLog(log.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span
                        className="text-xs font-medium mr-3"
                        style={{ color: '#7F8C8D' }}
                      >
                        {log.date}
                      </span>
                      <span
                        className="text-sm font-semibold"
                        style={{ color: '#ECF0F1' }}
                      >
                        {log.title}
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleLike(log.id)
                      }}
                      className="flex items-center gap-1"
                      style={{
                        color: likedLogs.has(log.id) ? '#E74C3C' : '#7F8C8D',
                        transition: 'color 0.2s ease',
                      }}
                    >
                      <Heart
                        size={16}
                        style={{
                          fill: likedLogs.has(log.id) ? '#E74C3C' : 'transparent',
                          transition: 'fill 0.2s ease',
                        }}
                      />
                      <span className="text-xs">{logLikes[log.id] || log.likes}</span>
                    </button>
                  </div>
                  <div
                    style={{
                      maxHeight: expandedLogs.has(log.id) ? '200px' : '0',
                      overflow: 'hidden',
                      transition: 'max-height 0.3s ease',
                    }}
                  >
                    <p
                      className="mt-3 text-sm leading-relaxed"
                      style={{ color: '#BDC3C7' }}
                    >
                      {log.content}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showUnlockModal === game.id && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={() => setShowUnlockModal(null)}
        >
          <div
            className="relative w-full max-w-lg p-6"
            style={{
              background: '#1A1A2E',
              borderRadius: '20px',
              border: '2px solid #FFD700',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowUnlockModal(null)}
              className="absolute top-4 right-4"
              style={{ color: '#BDC3C7' }}
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <Trophy size={24} style={{ color: '#FFD700' }} />
              <h3 className="text-xl font-bold" style={{ color: '#FFD700' }}>
                彩蛋已解锁！
              </h3>
            </div>

            <div className="mb-6">
              <p className="text-sm mb-3" style={{ color: '#BDC3C7' }}>
                早期概念图
              </p>
              <div className="relative overflow-hidden rounded-xl" style={{ aspectRatio: '4/3' }}>
                {game.unlockContent.conceptImages.map((src, i) => (
                  <img
                    key={i}
                    src={src}
                    alt={`概念图 ${i + 1}`}
                    className="absolute inset-0 w-full h-full"
                    style={{
                      objectFit: 'cover',
                      opacity: i === conceptIndex ? 1 : 0,
                      transition: 'opacity 0.4s ease',
                    }}
                  />
                ))}
              </div>
              {game.unlockContent.conceptImages.length > 1 && (
                <div className="flex justify-center gap-2 mt-3">
                  {game.unlockContent.conceptImages.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setConceptIndex(i)}
                      className="w-2 h-2 rounded-full"
                      style={{
                        background: i === conceptIndex ? '#FFD700' : '#7F8C8D',
                        transition: 'background 0.2s ease',
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="mb-6">
              <p className="text-sm mb-3" style={{ color: '#BDC3C7' }}>
                开发者访谈
              </p>
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl w-full"
                style={{
                  background: 'rgba(231,76,60,0.15)',
                  border: '1px solid rgba(231,76,60,0.3)',
                  color: '#E74C3C',
                  transition: 'background 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLButtonElement).style.background =
                    'rgba(231,76,60,0.25)'
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLButtonElement).style.background =
                    'rgba(231,76,60,0.15)'
                }}
              >
                <Play
                  size={20}
                  style={{
                    fill: isPlaying ? '#E74C3C' : 'transparent',
                    transition: 'fill 0.2s ease',
                  }}
                />
                <span className="text-sm font-medium">
                  {isPlaying ? '播放中...' : '点击播放开发者访谈'}
                </span>
              </button>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(game.unlockContent.shareLink)
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm"
                style={{
                  background: 'rgba(255,215,0,0.15)',
                  border: '1px solid rgba(255,215,0,0.3)',
                  color: '#FFD700',
                  transition: 'background 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLButtonElement).style.background =
                    'rgba(255,215,0,0.25)'
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLButtonElement).style.background =
                    'rgba(255,215,0,0.15)'
                }}
              >
                <Share2 size={14} />
                分享链接
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
