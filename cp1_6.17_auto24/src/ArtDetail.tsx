import { useState, useEffect, useCallback } from 'react'
import { Artwork } from './App'
import {
  EmotionCount,
  EmotionType,
  EMOTION_COLORS,
  EMOTION_LABELS,
  EMOTION_TYPES,
  emotionStore,
} from './emotionStore'

interface ArtDetailProps {
  artwork: Artwork
  emotionCount?: EmotionCount
  onAddEmotion: (artId: string, emotion: EmotionType) => EmotionCount
  onClose: () => void
}

export default function ArtDetail({
  artwork,
  emotionCount,
  onAddEmotion,
  onClose,
}: ArtDetailProps) {
  const [localCount, setLocalCount] = useState<EmotionCount>(
    emotionCount || emotionStore.getEmotion(artwork.id),
  )
  const [ripples, setRipples] = useState<Map<EmotionType, number>>(new Map())
  const [bounceEmotion, setBounceEmotion] = useState<EmotionType | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true))
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  const handleEmotionClick = useCallback(
    (emotion: EmotionType, e: React.MouseEvent) => {
      e.stopPropagation()
      const updated = onAddEmotion(artwork.id, emotion)
      setLocalCount(updated)
      setRipples((prev) => {
        const next = new Map(prev)
        next.set(emotion, Date.now())
        return next
      })
      setBounceEmotion(emotion)
      setTimeout(() => setBounceEmotion(null), 200)
    },
    [artwork.id, onAddEmotion],
  )

  const counts = localCount
  const maxCount = Math.max(1, ...Object.values(counts))

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: '#00000080',
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        backdropFilter: 'blur(4px)',
        opacity: mounted ? 1 : 0,
        transition: 'opacity 0.4s ease-in-out',
        overflow: 'auto',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#FFFFFF',
          borderRadius: '12px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          padding: '32px',
          maxWidth: '720px',
          width: '100%',
          position: 'relative',
          color: '#333',
          transform: mounted ? 'scale(1)' : 'scale(0.8)',
          transition: 'transform 0.4s ease-in-out',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            background: 'transparent',
            color: '#FFFFFF',
            fontSize: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
            transition: 'transform 0.3s ease-in-out',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'rotate(90deg)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'rotate(0deg)')}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        <div
          style={{
            width: '100%',
            maxWidth: '600px',
            height: '850px',
            maxHeight: '60vh',
            margin: '0 auto 24px',
            border: '2px solid #8D6E63',
            borderRadius: '4px',
            background: `linear-gradient(135deg, ${artwork.gradientFrom} 0%, ${artwork.gradientTo} 100%)`,
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              border: '2px solid #8B0000',
              background: 'rgba(139, 0, 0, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transform: 'rotate(15deg)',
              transformOrigin: 'top right',
              zIndex: 2,
              pointerEvents: 'none',
            }}
          >
            <span
              style={{
                color: '#8B0000',
                fontSize: '20px',
                fontWeight: 700,
                letterSpacing: '1px',
                fontFamily: 'Georgia, serif',
                fontStyle: 'italic',
              }}
            >
              VG
            </span>
          </div>
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '70%',
              height: '60%',
              border: '1px solid rgba(141, 110, 99, 0.3)',
              background:
                'linear-gradient(180deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.08) 100%)',
            }}
          />
        </div>

        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <h2
            style={{
              color: '#4E342E',
              fontWeight: 700,
              fontSize: '24px',
              marginBottom: '8px',
            }}
          >
            {artwork.title}
          </h2>
          <div
            style={{
              color: '#8D6E63',
              fontStyle: 'italic',
              fontSize: '14px',
              marginBottom: '4px',
            }}
          >
            {artwork.author} · {artwork.year}
          </div>
        </div>

        <p
          style={{
            color: '#5D4037',
            fontSize: '14px',
            lineHeight: 1.8,
            padding: '0 8px',
            marginBottom: '28px',
            textAlign: 'justify',
          }}
        >
          {artwork.description}
        </p>

        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '20px',
            marginBottom: '32px',
            flexWrap: 'wrap',
          }}
        >
          {EMOTION_TYPES.map((emotion) => {
            return (
              <div
                key={emotion}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <div style={{ position: 'relative', width: '48px', height: '48px' }}>
                  <button
                    onClick={(e) => handleEmotionClick(emotion, e)}
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: EMOTION_COLORS[emotion],
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'transform 0.1s ease-in-out, box-shadow 0.3s ease-in-out',
                      boxShadow: `0 4px 12px ${EMOTION_COLORS[emotion]}80`,
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
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = `0 6px 20px ${EMOTION_COLORS[emotion]}B0`
                    }}
                  >
                    <span
                      style={{
                        fontSize: '18px',
                        color: '#fff',
                        textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                        fontWeight: 'bold',
                      }}
                    >
                      {emotion === 'amaze' && '!'}
                      {emotion === 'joy' && '♥'}
                      {emotion === 'thought' && '?'}
                      {emotion === 'moved' && '♪'}
                      {emotion === 'doubt' && '…'}
                    </span>
                    {ripples.get(emotion) && (
                      <span
                        key={ripples.get(emotion)}
                        style={{
                          position: 'absolute',
                          left: '50%',
                          top: '50%',
                          width: '0',
                          height: '0',
                          borderRadius: '50%',
                          background: EMOTION_COLORS[emotion],
                          opacity: 0.5,
                          transform: 'translate(-50%, -50%)',
                          animation: 'ripple-expand-detail 0.3s ease-out forwards',
                          pointerEvents: 'none',
                        }}
                      />
                    )}
                  </button>
                </div>
                <div style={{ fontSize: '10px', color: '#666' }}>
                  {EMOTION_LABELS[emotion]}
                </div>
                <div
                  key={bounceEmotion === emotion ? `b-${Date.now()}` : 'static'}
                  style={{
                    fontSize: '16px',
                    fontWeight: 700,
                    color: EMOTION_COLORS[emotion],
                    animation: bounceEmotion === emotion ? 'bounce-count-detail 0.2s ease-out' : 'none',
                  }}
                >
                  {counts[emotion]}
                </div>
              </div>
            )
          })}
        </div>

        <div
          style={{
            width: '300px',
            height: '80px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            paddingBottom: '4px',
            borderBottom: '1px solid #E0E0E0',
          }}
        >
          {EMOTION_TYPES.map((emotion) => {
            const heightRatio = counts[emotion] / maxCount
            const heightPx = Math.max(2, heightRatio * 80)
            return (
              <div
                key={emotion}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  width: '40px',
                  height: '80px',
                  justifyContent: 'flex-end',
                }}
                title={`${EMOTION_LABELS[emotion]}: ${counts[emotion]}`}
              >
                <div
                  style={{
                    width: '40px',
                    height: `${heightPx}px`,
                    borderRadius: '4px 4px 0 0',
                    background: `linear-gradient(180deg, ${EMOTION_COLORS[emotion]} 0%, #E0E0E0 100%)`,
                    transition: 'height 0.3s ease-in-out, background 0.3s ease-in-out',
                    minHeight: '2px',
                  }}
                />
              </div>
            )
          })}
        </div>

        <div
          style={{
            width: '300px',
            margin: '6px auto 0',
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          {EMOTION_TYPES.map((emotion) => (
            <div
              key={emotion}
              style={{
                width: '40px',
                textAlign: 'center',
                fontSize: '10px',
                color: '#9E9E9E',
              }}
            >
              {EMOTION_LABELS[emotion]}
            </div>
          ))}
        </div>

        <style>{`
          @keyframes ripple-expand-detail {
            0% {
              width: 0;
              height: 0;
              opacity: 0.5;
            }
            100% {
              width: 60px;
              height: 60px;
              opacity: 0;
            }
          }
          @keyframes bounce-count-detail {
            0% { transform: scale(1); }
            50% { transform: scale(1.4); }
            100% { transform: scale(1); }
          }
        `}</style>
      </div>
    </div>
  )
}
