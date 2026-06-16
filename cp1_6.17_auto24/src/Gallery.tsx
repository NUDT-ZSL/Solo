import { useState, useRef, useEffect, useCallback } from 'react'
import { Artwork } from './App'
import {
  EmotionCount,
  EmotionMap,
  EmotionType,
  EMOTION_COLORS,
  EMOTION_LABELS,
} from './emotionStore'

interface GalleryProps {
  artworks: Artwork[]
  emotionData: EmotionMap
  onSelectArt: (art: Artwork) => void
  onOpenReset: () => void
}

const DAMPING = 0.8
const CARD_GAP = 60

export default function Gallery({
  artworks,
  emotionData,
  onSelectArt,
  onOpenReset,
}: GalleryProps) {
  const [translateX, setTranslateX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [ripples, setRipples] = useState<Map<string, number>>(new Map())
  const [bounceKey, setBounceKey] = useState<Map<string, number>>(new Map())

  const containerRef = useRef<HTMLDivElement>(null)
  const dragStartX = useRef(0)
  const dragStartTranslate = useRef(0)
  const velocity = useRef(0)
  const lastMoveX = useRef(0)
  const lastMoveTime = useRef(0)
  const rafRef = useRef<number | null>(null)

  const cardsTotalWidth = () => {
    const containerWidth = containerRef.current?.clientWidth || window.innerWidth
    let cardsPerRow = 3
    if (containerWidth < 768) cardsPerRow = 1
    else if (containerWidth <= 1024) cardsPerRow = 2

    const rows = Math.ceil(artworks.length / cardsPerRow)
    const cardWidth = containerWidth < 768 ? 200 : 240
    return rows * (cardWidth + CARD_GAP) + CARD_GAP * 2
  }

  const getMinTranslate = useCallback(() => {
    const containerWidth = containerRef.current?.clientWidth || window.innerWidth
    return Math.min(0, containerWidth - cardsTotalWidth())
  }, [artworks.length])

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      setIsDragging(true)
      dragStartX.current = e.clientX
      dragStartTranslate.current = translateX
      lastMoveX.current = e.clientX
      lastMoveTime.current = performance.now()
      velocity.current = 0
      ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
    },
    [translateX],
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return
      const now = performance.now()
      const deltaX = e.clientX - dragStartX.current
      const dt = now - lastMoveTime.current
      if (dt > 0) {
        velocity.current = (e.clientX - lastMoveX.current) / dt
      }
      lastMoveX.current = e.clientX
      lastMoveTime.current = now

      let next = dragStartTranslate.current + deltaX
      const minTranslate = getMinTranslate()
      if (next > 0) next = next * 0.3
      if (next < minTranslate) next = minTranslate - (minTranslate - next) * 0.3
      setTranslateX(next)
    },
    [isDragging, getMinTranslate],
  )

  const handlePointerUp = useCallback(() => {
    if (!isDragging) return
    setIsDragging(false)

    let v = velocity.current * 16 * DAMPING
    let current = translateX

    const animate = () => {
      v *= DAMPING
      current += v
      const minTranslate = getMinTranslate()
      if (current > 0) current = 0
      if (current < minTranslate) current = minTranslate
      setTranslateX(current)

      if (Math.abs(v) > 0.1) {
        rafRef.current = requestAnimationFrame(animate)
      } else {
        rafRef.current = null
      }
    }
    if (Math.abs(v) > 0.5) {
      rafRef.current = requestAnimationFrame(animate)
    } else {
      const minTranslate = getMinTranslate()
      if (current > 0) current = 0
      if (current < minTranslate) current = minTranslate
      setTranslateX(current)
    }
  }, [isDragging, translateX, getMinTranslate])

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  const handleEmotionClick = (artId: string, emotion: EmotionType, e: React.MouseEvent) => {
    e.stopPropagation()
    const key = `${artId}-${emotion}`
    setRipples((prev) => {
      const next = new Map(prev)
      next.set(key, Date.now())
      return next
    })
    setBounceKey((prev) => {
      const next = new Map(prev)
      next.set(artId + emotion + Date.now(), Date.now())
      return next
    })
  }

  const getEmotionCount = (artId: string): EmotionCount => {
    return emotionData.get(artId) || { amaze: 0, joy: 0, thought: 0, moved: 0, doubt: 0 }
  }

  const getRippleKey = (artId: string, emotion: EmotionType) => {
    return ripples.get(`${artId}-${emotion}`)
  }

  return (
    <div
      style={{
        width: '100%',
        minHeight: '100vh',
        background: '#1A1A2E',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <button
        onClick={onOpenReset}
        style={{
          position: 'fixed',
          top: '16px',
          left: '16px',
          zIndex: 50,
          background: 'transparent',
          color: '#9E9E9E',
          fontSize: '12px',
          padding: '8px 12px',
          borderRadius: '4px',
          border: '1px solid #9E9E9E',
          transition: 'all 0.3s ease-in-out',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = '#FFFFFF'
          e.currentTarget.style.borderColor = '#FFFFFF'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = '#9E9E9E'
          e.currentTarget.style.borderColor = '#9E9E9E'
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
        </svg>
        重置数据
      </button>

      <div
        style={{
          position: 'absolute',
          top: '32px',
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: '28px',
          fontWeight: 300,
          color: '#E0E0E0',
          letterSpacing: '8px',
          zIndex: 10,
        }}
      >
        虚 拟 画 廊
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '35%',
          background: '#E0E0E0',
          backgroundImage: `
            linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px),
            linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
          transform: 'perspective(800px) rotateX(50deg)',
          transformOrigin: 'top',
        }}
      />

      <div
        ref={containerRef}
        style={{
          position: 'relative',
          width: '100%',
          height: '100vh',
          perspective: '1200px',
          overflow: 'hidden',
          cursor: isDragging ? 'grabbing' : 'grab',
          touchAction: 'none',
          userSelect: 'none',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: 0,
            display: 'grid',
            gridTemplateColumns: 'repeat(3, auto)',
            gap: `${CARD_GAP}px`,
            padding: `0 ${CARD_GAP}px`,
            transform: `translateY(-50%) translateX(${translateX}px)`,
            transformStyle: 'preserve-3d',
            transition: isDragging ? 'none' : 'transform 0.5s ease-out',
          }}
        >
          {artworks.map((art) => {
            const counts = getEmotionCount(art.id)
            return (
              <div
                key={art.id}
                onClick={(e) => {
                  if (Math.abs(translateX - dragStartTranslate.current) < 5 || !isDragging) {
                    onSelectArt(art)
                  }
                  e.stopPropagation()
                }}
                style={{
                  width: '240px',
                  height: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  transition: 'transform 0.3s ease-in-out',
                  cursor: 'pointer',
                }}
                className="art-card-wrapper"
              >
                <div
                  style={{
                    width: '240px',
                    height: '340px',
                    border: '2px solid #8D6E63',
                    background: `linear-gradient(135deg, ${art.gradientFrom} 0%, ${art.gradientTo} 100%)`,
                    borderRadius: '4px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                    transition: 'all 0.3s ease-in-out',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                  className="art-card"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.1)'
                    e.currentTarget.style.boxShadow =
                      '0 0 15px #FFD54F, 0 12px 40px rgba(0,0,0,0.6)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)'
                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.4)'
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: '70%',
                      height: '60%',
                      border: '1px solid rgba(141, 110, 99, 0.3)',
                      background: `linear-gradient(180deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.05) 100%)`,
                    }}
                  />
                </div>

                <div style={{ marginTop: '16px', textAlign: 'center', width: '240px' }}>
                  <div
                    style={{
                      color: '#4E342E',
                      fontWeight: 700,
                      fontSize: '16px',
                      marginBottom: '4px',
                      background: '#E0E0E0',
                      padding: '4px 8px',
                      borderRadius: '2px',
                    }}
                  >
                    {art.title}
                  </div>
                  <div
                    style={{
                      color: '#8D6E63',
                      fontStyle: 'italic',
                      fontSize: '12px',
                      background: '#E0E0E0',
                      padding: '2px 8px',
                      borderRadius: '2px',
                      display: 'inline-block',
                    }}
                  >
                    {art.author}
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    gap: '12px',
                    marginTop: '14px',
                    justifyContent: 'center',
                    flexWrap: 'wrap',
                  }}
                >
                  {(Object.keys(EMOTION_COLORS) as EmotionType[]).map((emotion) => {
                    const rippleId = getRippleKey(art.id, emotion)
                    const count = counts[emotion]
                    return (
                      <div
                        key={emotion}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <div style={{ position: 'relative' }}>
                          <button
                            onClick={(e) => handleEmotionClick(art.id, emotion, e)}
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              background: EMOTION_COLORS[emotion],
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'transform 0.1s ease-in-out',
                              boxShadow: `0 2px 8px ${EMOTION_COLORS[emotion]}80`,
                              position: 'relative',
                              overflow: 'hidden',
                            }}
                            onMouseDown={(e) => {
                              e.currentTarget.style.transform = 'scale(0.9)'
                            }}
                            onMouseUp={(e) => {
                              e.currentTarget.style.transform = 'scale(1)'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'scale(1)'
                            }}
                            title={EMOTION_LABELS[emotion]}
                          >
                            <span
                              style={{
                                fontSize: '14px',
                                color: '#fff',
                                textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                              }}
                            >
                              {emotion === 'amaze' && '!'}
                              {emotion === 'joy' && '♥'}
                              {emotion === 'thought' && '?'}
                              {emotion === 'moved' && '♪'}
                              {emotion === 'doubt' && '…'}
                            </span>
                            {rippleId && (
                              <span
                                key={rippleId}
                                style={{
                                  position: 'absolute',
                                  left: '50%',
                                  top: '50%',
                                  width: '0',
                                  height: '0',
                                  borderRadius: '50%',
                                  background: EMOTION_COLORS[emotion],
                                  opacity: 0.6,
                                  transform: 'translate(-50%, -50%)',
                                  animation: 'ripple-expand 0.3s ease-out forwards',
                                  pointerEvents: 'none',
                                }}
                              />
                            )}
                          </button>
                        </div>
                        <span
                          key={bounceKey.get(art.id + emotion) || 'static'}
                          style={{
                            fontSize: '11px',
                            color: '#E0E0E0',
                            animation: bounceKey.get(art.id + emotion)
                              ? 'bounce-count 0.2s ease-out'
                              : 'none',
                          }}
                        >
                          {count}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <style>{`
        @keyframes ripple-expand {
          0% {
            width: 0;
            height: 0;
            opacity: 0.6;
          }
          100% {
            width: 60px;
            height: 60px;
            opacity: 0;
          }
        }
        @keyframes bounce-count {
          0% { transform: scale(1); }
          50% { transform: scale(1.3); }
          100% { transform: scale(1); }
        }
        @media (max-width: 1024px) {
          .art-card-wrapper {
            width: 240px !important;
          }
          .art-card {
            width: 240px !important;
            height: 340px !important;
          }
        }
        @media (max-width: 768px) {
          .art-card-wrapper {
            width: 200px !important;
          }
          .art-card {
            width: 200px !important;
            height: 280px !important;
          }
          .art-card-wrapper > div:nth-child(2),
          .art-card-wrapper > div:nth-child(2) > div:first-child {
            width: 200px !important;
          }
        }
      `}</style>
    </div>
  )
}
