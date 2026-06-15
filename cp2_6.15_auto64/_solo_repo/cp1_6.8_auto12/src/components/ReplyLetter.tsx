import { useState, useEffect, useRef } from 'react'
import { Send, X, Sparkles } from 'lucide-react'
import { useStore } from '../store'
import { createLetter } from '../utils/apiHelper'
import type { CreateLetterPayload } from '../types'

const SYMBOL_OPTIONS = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓', '✧', '✦', '◈', '◇', '△', '◎']

export default function ReplyLetter() {
  const { replyToLetter, setReplyToLetter, addLetter, addStarMark, setShowLetterCard } = useStore()
  const [content, setContent] = useState('')
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [visible, setVisible] = useState(false)
  const [animScale, setAnimScale] = useState(0.8)

  useEffect(() => {
    if (replyToLetter) {
      setVisible(true)
      requestAnimationFrame(() => setAnimScale(1))
    } else {
      setAnimScale(0.8)
      const timer = setTimeout(() => setVisible(false), 300)
      return () => clearTimeout(timer)
    }
  }, [replyToLetter])

  if (!visible || !replyToLetter) return null

  const handleClose = () => {
    setAnimScale(0.8)
    setTimeout(() => {
      setReplyToLetter(null)
      setContent('')
      setSelectedSymbols([])
    }, 300)
  }

  const toggleSymbol = (sym: string) => {
    setSelectedSymbols(prev =>
      prev.includes(sym) ? prev.filter(s => s !== sym) : [...prev, sym].slice(0, 3)
    )
  }

  const handleSubmit = async () => {
    if (!content.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      const payload: CreateLetterPayload = {
        title: `Re: ${replyToLetter.title}`,
        content: content.trim(),
        parentId: replyToLetter.id,
      }
      if (selectedSymbols.length > 0) payload.symbols = selectedSymbols.join(' ')

      const letter = await createLetter(payload)
      addLetter(letter)
      addStarMark(letter.id)
      addStarMark(replyToLetter.id)
      handleClose()
      setShowLetterCard(false)
    } catch (err) {
      console.error('Failed to send reply:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={handleClose}
      style={{ background: 'rgba(0, 0, 0, 0.5)' }}
    >
      <div
        className="relative max-w-md w-full rounded-2xl overflow-hidden"
        style={{
          background: 'rgba(10, 14, 50, 0.85)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(79, 195, 247, 0.3)',
          boxShadow: '0 0 50px rgba(79, 195, 247, 0.2), inset 0 0 80px rgba(79, 195, 247, 0.05)',
          transform: `scale(${animScale})`,
          opacity: animScale === 1 ? 1 : 0,
          transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative z-10 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles size={18} style={{ color: '#4fc3f7' }} />
              <h2
                className="text-lg font-bold"
                style={{ fontFamily: '"Orbitron", sans-serif', color: '#e0e8ff' }}
              >
                回信给星海
              </h2>
            </div>
            <button
              onClick={handleClose}
              className="w-8 h-8 flex items-center justify-center rounded-full transition-all duration-200"
              style={{
                background: 'rgba(79, 195, 247, 0.1)',
                border: '1px solid rgba(79, 195, 247, 0.3)',
                color: '#4fc3f7',
              }}
            >
              <X size={16} />
            </button>
          </div>

          <div
            className="rounded-xl p-3 mb-4"
            style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            <div className="text-xs mb-1" style={{ color: 'rgba(79, 195, 247, 0.4)' }}>
              回复：
            </div>
            <div className="text-sm" style={{ color: 'rgba(224, 232, 255, 0.7)' }}>
              {replyToLetter.title}
            </div>
          </div>

          <div className="mb-4">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value.slice(0, 300))}
              placeholder="写下你的回信..."
              maxLength={300}
              rows={4}
              className="w-full px-4 py-3 rounded-lg text-sm outline-none resize-none transition-all duration-300"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(79, 195, 247, 0.25)',
                color: '#e0e8ff',
                fontFamily: '"Exo 2", sans-serif',
                boxShadow: '0 0 10px rgba(79, 195, 247, 0.05)',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'rgba(79, 195, 247, 0.6)'
                e.currentTarget.style.boxShadow = '0 0 20px rgba(79, 195, 247, 0.15)'
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'rgba(79, 195, 247, 0.25)'
                e.currentTarget.style.boxShadow = '0 0 10px rgba(79, 195, 247, 0.05)'
              }}
            />
            <div className="text-right mt-1">
              <span className="text-xs" style={{ color: content.length > 280 ? '#ff6b6b' : 'rgba(79, 195, 247, 0.4)' }}>
                {content.length}/300
              </span>
            </div>
          </div>

          <div className="mb-5">
            <div className="text-xs mb-2" style={{ color: 'rgba(196, 77, 255, 0.6)' }}>
              星象符号（最多3个）
            </div>
            <div className="flex flex-wrap gap-2">
              {SYMBOL_OPTIONS.map((sym) => (
                <button
                  key={sym}
                  onClick={() => toggleSymbol(sym)}
                  className="w-9 h-9 flex items-center justify-center rounded-lg text-base transition-all duration-200"
                  style={{
                    background: selectedSymbols.includes(sym) ? 'rgba(196, 77, 255, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                    border: selectedSymbols.includes(sym) ? '1px solid rgba(196, 77, 255, 0.5)' : '1px solid rgba(255, 255, 255, 0.08)',
                    color: selectedSymbols.includes(sym) ? '#c44dff' : 'rgba(224, 232, 255, 0.5)',
                    boxShadow: selectedSymbols.includes(sym) ? '0 0 10px rgba(196, 77, 255, 0.2)' : 'none',
                    transform: selectedSymbols.includes(sym) ? 'scale(1.1)' : 'scale(1)',
                  }}
                >
                  {sym}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!content.trim() || isSubmitting}
            className="w-full py-3 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all duration-300"
            style={{
              background: !content.trim() ? 'rgba(79, 195, 247, 0.1)' : 'rgba(79, 195, 247, 0.2)',
              border: '1px solid rgba(79, 195, 247, 0.4)',
              color: '#4fc3f7',
              boxShadow: !content.trim() ? 'none' : '0 0 20px rgba(79, 195, 247, 0.2)',
              opacity: !content.trim() ? 0.5 : 1,
              cursor: !content.trim() ? 'not-allowed' : 'pointer',
            }}
            onMouseEnter={(e) => {
              if (content.trim()) {
                e.currentTarget.style.background = 'rgba(79, 195, 247, 0.35)'
                e.currentTarget.style.boxShadow = '0 0 30px rgba(79, 195, 247, 0.35)'
                e.currentTarget.style.transform = 'scale(1.02)'
              }
            }}
            onMouseLeave={(e) => {
              if (content.trim()) {
                e.currentTarget.style.background = 'rgba(79, 195, 247, 0.2)'
                e.currentTarget.style.boxShadow = '0 0 20px rgba(79, 195, 247, 0.2)'
                e.currentTarget.style.transform = 'scale(1)'
              }
            }}
          >
            <Send size={16} />
            {isSubmitting ? '投递中...' : '投递回信'}
          </button>
        </div>
      </div>
    </div>
  )
}
