import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Play, Pause, Heart, MessageCircle, Send } from 'lucide-react'
import type { Bottle, EmotionTag } from '@/types'
import { EMOTION_LABELS } from '@/types'
import WaveEngine from '@/WaveEngine'
import CommentFish from '@/CommentFish'
import type { FishConfig } from '@/CommentFish'
import { useBottleStore } from '@/store/bottleStore'

interface DetailModalProps {
  bottle: Bottle
  onClose: () => void
}

export default function DetailModal({ bottle, onClose }: DetailModalProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [fishes, setFishes] = useState<FishConfig[]>([])
  const [animTime, setAnimTime] = useState(0)

  const toggleLike = useBottleStore((s) => s.toggleLike)
  const addComment = useBottleStore((s) => s.addComment)
  const currentBottle = useBottleStore((s) => s.getBottle(bottle.id))

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animFrameRef = useRef<number>(0)
  const timeRef = useRef<number>(0)
  const modalRef = useRef<HTMLDivElement>(null)
  const fishCleanupRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const displayBottle = currentBottle || bottle
  const colors = WaveEngine.emotionColors[displayBottle.emotion]

  const animateSpectrum = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      ctx.scale(dpr, dpr)
    }

    const mockData = new Uint8Array(128)
    for (let i = 0; i < mockData.length; i++) {
      const base = isPlaying ? 80 : 20
      const wave = Math.sin(i * 0.2 + timeRef.current * 0.05) * 40
      const noise = Math.random() * 20
      mockData[i] = Math.max(0, Math.min(255, base + wave + noise))
    }

    WaveEngine.renderSpectrum(ctx, rect.width, rect.height, mockData, displayBottle.emotion)

    timeRef.current += 1
    animFrameRef.current = requestAnimationFrame(animateSpectrum)
  }, [displayBottle.emotion, isPlaying])

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(animateSpectrum)
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [animateSpectrum])

  useEffect(() => {
    fishCleanupRef.current = setInterval(() => {
      setFishes((prev) => prev.filter((f) => !CommentFish.isExpired(f)))
      setAnimTime(Date.now())
    }, 500)
    return () => {
      if (fishCleanupRef.current) clearInterval(fishCleanupRef.current)
    }
  }, [])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [onClose])

  const handleLike = () => {
    toggleLike(displayBottle.id)
  }

  const handleComment = () => {
    if (!commentText.trim()) return
    addComment(displayBottle.id, commentText.trim())

    const containerWidth = modalRef.current?.clientWidth || 400
    const fish = CommentFish.createFish(commentText.trim(), displayBottle.emotion, containerWidth)
    setFishes((prev) => [...prev, fish])
    setCommentText('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div
        ref={modalRef}
        className="relative glass-strong rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        style={{ borderColor: `${colors.primary}20` }}
      >
        <div className="relative">
          {fishes.map((fish) => {
            const elapsed = Date.now() - fish.createdAt
            return (
              <div key={fish.id} style={CommentFish.fishStyle(fish, elapsed)}>
                💬 {fish.text}
              </div>
            )
          })}
        </div>

        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 text-white/50 hover:text-white/80 transition-colors"
        >
          <X size={20} />
        </button>

        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
              style={{
                background: `linear-gradient(135deg, ${colors.primary}30, ${colors.secondary}30)`,
                border: `2px solid ${colors.primary}50`,
              }}
            >
              {displayBottle.emotion === 'calm' && '🌊'}
              {displayBottle.emotion === 'excited' && '⚡'}
              {displayBottle.emotion === 'sad' && '🌧'}
              {displayBottle.emotion === 'curious' && '🔍'}
              {displayBottle.emotion === 'nostalgic' && '🌅'}
            </div>
            <div>
              <div className="text-sm font-medium text-white/80">{displayBottle.authorName}</div>
              <div className="text-xs" style={{ color: colors.primary }}>
                {EMOTION_LABELS[displayBottle.emotion]}
              </div>
            </div>
          </div>

          <div className="rounded-xl overflow-hidden mb-4 bg-black/20">
            <canvas
              ref={canvasRef}
              className="w-full"
              style={{ height: '120px' }}
            />
            <div className="flex items-center gap-3 p-3">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-110"
                style={{
                  background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                  boxShadow: `0 2px 10px ${colors.primary}30`,
                }}
              >
                {isPlaying ? (
                  <Pause size={14} className="text-white" />
                ) : (
                  <Play size={14} className="text-white ml-0.5" />
                )}
              </button>
              <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: isPlaying ? '45%' : '0%',
                    background: `linear-gradient(90deg, ${colors.primary}, ${colors.secondary})`,
                  }}
                />
              </div>
              <span className="text-xs text-white/30">0:30</span>
            </div>
          </div>

          <p className="text-sm leading-relaxed text-white/70 mb-5">
            {displayBottle.text}
          </p>

          <div className="flex items-center gap-4 mb-5">
            <button
              onClick={handleLike}
              className="flex items-center gap-1.5 transition-all hover:scale-105"
            >
              <Heart
                size={18}
                className="transition-all"
                style={{
                  color: displayBottle.liked ? '#ef4444' : 'rgba(255,255,255,0.4)',
                  fill: displayBottle.liked ? '#ef4444' : 'none',
                }}
              />
              <span className="text-xs" style={{ color: displayBottle.liked ? '#ef4444' : 'rgba(255,255,255,0.4)' }}>
                {displayBottle.likes}
              </span>
            </button>
            <div className="flex items-center gap-1.5">
              <MessageCircle size={16} style={{ color: 'rgba(255,255,255,0.4)' }} />
              <span className="text-xs text-white/40">{displayBottle.comments.length}</span>
            </div>
          </div>

          {displayBottle.comments.length > 0 && (
            <div className="mb-4 space-y-2">
              {displayBottle.comments.map((comment) => (
                <div
                  key={comment.id}
                  className="bg-white/5 rounded-lg px-3 py-2 text-xs"
                >
                  <span className="text-white/50">{comment.authorName}</span>
                  <span className="text-white/70 ml-2">{comment.text}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleComment()}
              placeholder="写下你的评论..."
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white/80 placeholder-white/25 focus:outline-none focus:border-white/20 transition-colors"
            />
            <button
              onClick={handleComment}
              disabled={!commentText.trim()}
              className="px-3 py-2 rounded-xl transition-all disabled:opacity-30"
              style={{
                background: commentText.trim()
                  ? `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`
                  : 'rgba(255,255,255,0.05)',
              }}
            >
              <Send size={14} className="text-white" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
