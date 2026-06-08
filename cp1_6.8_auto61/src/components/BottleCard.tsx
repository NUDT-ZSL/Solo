import { useEffect, useRef } from 'react'
import { useBottleStore } from '@/store/bottleStore'
import { formatTime } from '@/utils/api'

interface BottleCardProps {
  onResonate: () => void
}

export default function BottleCard({ onResonate }: BottleCardProps) {
  const { selectedBottle, showBottleCard, setShowBottleCard, userId, resonate } = useBottleStore()
  const cardRef = useRef<HTMLDivElement>(null)
  const hasResonated = selectedBottle ? selectedBottle.resonatedBy.includes(userId) : false

  useEffect(() => {
    if (showBottleCard && cardRef.current) {
      cardRef.current.style.opacity = '0'
      cardRef.current.style.transform = 'scale(0.9) translateY(20px)'
      requestAnimationFrame(() => {
        if (cardRef.current) {
          cardRef.current.style.transition = 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)'
          cardRef.current.style.opacity = '1'
          cardRef.current.style.transform = 'scale(1) translateY(0)'
        }
      })
    }
  }, [showBottleCard])

  if (!showBottleCard || !selectedBottle) return null

  const handleClose = () => {
    if (cardRef.current) {
      cardRef.current.style.transition = 'all 0.25s ease-in'
      cardRef.current.style.opacity = '0'
      cardRef.current.style.transform = 'scale(0.9) translateY(20px)'
      setTimeout(() => {
        setShowBottleCard(false)
      }, 250)
    } else {
      setShowBottleCard(false)
    }
  }

  const handleResonate = async () => {
    const ok = await resonate(selectedBottle.id)
    if (ok) {
      onResonate()
    }
  }

  return (
    <div className="bottle-card-overlay" onClick={handleClose}>
      <div
        ref={cardRef}
        className="bottle-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          borderColor: `${selectedBottle.color}40`,
          boxShadow: `0 0 30px ${selectedBottle.color}20, 0 8px 32px rgba(0,0,0,0.4)`,
        }}
      >
        <button className="bottle-card-close" onClick={handleClose}>✕</button>

        <div className="bottle-card-tag" style={{ background: `${selectedBottle.color}30`, color: selectedBottle.color, borderColor: `${selectedBottle.color}50` }}>
          <span className="bottle-card-tag-dot" style={{ background: selectedBottle.color }} />
          {selectedBottle.tag}
        </div>

        <p className="bottle-card-content">{selectedBottle.content}</p>

        <div className="bottle-card-meta">
          <span className="bottle-card-time">{formatTime(selectedBottle.createdAt)}</span>
          <span className="bottle-card-resonances">
            {selectedBottle.resonances > 0 && (
              <>
                <span className="resonance-heart">♥</span> {selectedBottle.resonances} 次共鸣
              </>
            )}
            {selectedBottle.resonances === 0 && '尚无共鸣'}
          </span>
        </div>

        {selectedBottle.userId !== userId && (
          <button
            className={`bottle-card-resonate-btn ${hasResonated ? 'resonated' : ''}`}
            onClick={handleResonate}
            disabled={hasResonated}
            style={{
              background: hasResonated ? 'rgba(255,255,255,0.05)' : `linear-gradient(135deg, ${selectedBottle.color}40, ${selectedBottle.color}20)`,
              borderColor: hasResonated ? 'rgba(255,255,255,0.1)' : `${selectedBottle.color}60`,
              color: hasResonated ? 'rgba(255,255,255,0.3)' : selectedBottle.color,
            }}
          >
            {hasResonated ? '已共鸣 ♥' : '共鸣'}
          </button>
        )}

        {selectedBottle.userId === userId && (
          <div className="bottle-card-own-label">我的漂流瓶</div>
        )}
      </div>
    </div>
  )
}
