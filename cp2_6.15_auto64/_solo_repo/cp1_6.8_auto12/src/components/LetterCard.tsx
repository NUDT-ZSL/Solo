import { useEffect, useRef, useState } from 'react'
import { X, MessageCircle, Sparkles } from 'lucide-react'
import { useStore } from '../store'

export default function LetterCard() {
  const { selectedLetter, showLetterCard, setShowLetterCard, setReplyToLetter, addStarMark } = useStore()
  const cardRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const [animScale, setAnimScale] = useState(0.8)

  useEffect(() => {
    if (showLetterCard && selectedLetter) {
      setVisible(true)
      requestAnimationFrame(() => {
        setAnimScale(1)
      })
    } else {
      setAnimScale(0.8)
      const timer = setTimeout(() => setVisible(false), 300)
      return () => clearTimeout(timer)
    }
  }, [showLetterCard, selectedLetter])

  if (!visible || !selectedLetter) return null

  const handleClose = () => {
    setAnimScale(0.8)
    setTimeout(() => {
      setShowLetterCard(false)
    }, 300)
  }

  const handleReply = () => {
    setReplyToLetter(selectedLetter)
    setShowLetterCard(false)
    addStarMark(selectedLetter.id)
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <div
        ref={cardRef}
        className="relative max-w-md w-full rounded-2xl overflow-hidden"
        style={{
          background: 'rgba(10, 14, 50, 0.75)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(79, 195, 247, 0.3)',
          boxShadow: '0 0 40px rgba(79, 195, 247, 0.15), inset 0 0 60px rgba(79, 195, 247, 0.05)',
          transform: `scale(${animScale})`,
          opacity: animScale === 1 ? 1 : 0,
          transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: selectedLetter.envelopeColor,
            filter: 'blur(40px)',
          }}
        />

        <div className="relative z-10 p-6">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full transition-all duration-200"
            style={{
              background: 'rgba(79, 195, 247, 0.1)',
              border: '1px solid rgba(79, 195, 247, 0.3)',
              color: '#4fc3f7',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(79, 195, 247, 0.25)'
              e.currentTarget.style.boxShadow = '0 0 15px rgba(79, 195, 247, 0.3)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(79, 195, 247, 0.1)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <X size={16} />
          </button>

          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={16} style={{ color: '#ffd700' }} />
              <h2
                className="text-lg font-bold"
                style={{
                  fontFamily: '"Orbitron", sans-serif',
                  color: '#e0e8ff',
                }}
              >
                {selectedLetter.title}
              </h2>
            </div>

            {selectedLetter.symbols && (
              <div
                className="text-sm mb-2 tracking-widest"
                style={{ color: 'rgba(196, 77, 255, 0.7)' }}
              >
                {selectedLetter.symbols}
              </div>
            )}

            {selectedLetter.coordinates && (
              <div
                className="text-xs mb-3 font-mono"
                style={{ color: 'rgba(79, 195, 247, 0.5)' }}
              >
                📍 {selectedLetter.coordinates}
              </div>
            )}
          </div>

          <div
            className="rounded-xl p-4 mb-4"
            style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            <p
              className="text-sm leading-relaxed"
              style={{
                color: 'rgba(224, 232, 255, 0.85)',
                fontFamily: '"Exo 2", sans-serif',
              }}
            >
              {selectedLetter.content}
            </p>
          </div>

          <div className="flex items-center justify-between">
            <span
              className="text-xs"
              style={{ color: 'rgba(79, 195, 247, 0.4)' }}
            >
              {formatDate(selectedLetter.createdAt)}
            </span>

            <button
              onClick={handleReply}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300"
              style={{
                background: 'rgba(79, 195, 247, 0.15)',
                border: '1px solid rgba(79, 195, 247, 0.4)',
                color: '#4fc3f7',
                boxShadow: '0 0 15px rgba(79, 195, 247, 0.15)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(79, 195, 247, 0.3)'
                e.currentTarget.style.boxShadow = '0 0 25px rgba(79, 195, 247, 0.35)'
                e.currentTarget.style.transform = 'scale(1.05)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(79, 195, 247, 0.15)'
                e.currentTarget.style.boxShadow = '0 0 15px rgba(79, 195, 247, 0.15)'
                e.currentTarget.style.transform = 'scale(1)'
              }}
            >
              <MessageCircle size={14} />
              回信
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
