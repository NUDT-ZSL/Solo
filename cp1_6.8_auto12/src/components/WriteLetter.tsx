import { useState, useRef, useEffect } from 'react'
import { Send, X, Sparkles } from 'lucide-react'
import { useStore } from '../store'
import { createLetter } from '../utils/apiHelper'
import type { CreateLetterPayload } from '../types'

const SYMBOL_OPTIONS = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓', '✧', '✦', '◈', '◇', '△', '◎']

export default function WriteLetter() {
  const { showWriteModal, setShowWriteModal, addLetter, addStarMark } = useStore()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [coordinates, setCoordinates] = useState('')
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [visible, setVisible] = useState(false)
  const [animY, setAnimY] = useState(100)
  const envelopeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (showWriteModal) {
      setVisible(true)
      requestAnimationFrame(() => setAnimY(0))
    } else {
      setAnimY(100)
      const timer = setTimeout(() => setVisible(false), 400)
      return () => clearTimeout(timer)
    }
  }, [showWriteModal])

  useEffect(() => {
    if (envelopeRef.current) {
      const hue1 = Math.floor(Math.random() * 360)
      const hue2 = (hue1 + 60 + Math.floor(Math.random() * 120)) % 360
      const hue3 = (hue2 + 60 + Math.floor(Math.random() * 120)) % 360
      envelopeRef.current.style.background = `linear-gradient(135deg, hsl(${hue1}, 80%, 60%), hsl(${hue2}, 80%, 50%), hsl(${hue3}, 80%, 40%))`
    }
  }, [visible])

  if (!visible) return null

  const handleClose = () => {
    setAnimY(100)
    setTimeout(() => {
      setShowWriteModal(false)
      setTitle('')
      setContent('')
      setCoordinates('')
      setSelectedSymbols([])
    }, 400)
  }

  const toggleSymbol = (sym: string) => {
    setSelectedSymbols(prev =>
      prev.includes(sym) ? prev.filter(s => s !== sym) : [...prev, sym].slice(0, 3)
    )
  }

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      const payload: CreateLetterPayload = {
        title: title.trim(),
        content: content.trim(),
      }
      if (coordinates.trim()) payload.coordinates = coordinates.trim()
      if (selectedSymbols.length > 0) payload.symbols = selectedSymbols.join(' ')

      const letter = await createLetter(payload)
      addLetter(letter)
      addStarMark(letter.id)
      handleClose()
    } catch (err) {
      console.error('Failed to create letter:', err)
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
          transform: `translateY(${animY}px)`,
          opacity: animY === 0 ? 1 : 0,
          transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative z-10 p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Sparkles size={18} style={{ color: '#ffd700' }} />
              <h2
                className="text-lg font-bold"
                style={{ fontFamily: '"Orbitron", sans-serif', color: '#e0e8ff' }}
              >
                写给星际的信
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

          <div className="mb-4">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 20))}
              placeholder="信件标题..."
              maxLength={20}
              className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-all duration-300"
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
          </div>

          <div className="mb-4">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value.slice(0, 300))}
              placeholder="在这里写下你想对星际说的话..."
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

          <div className="mb-4">
            <input
              type="text"
              value={coordinates}
              onChange={(e) => setCoordinates(e.target.value)}
              placeholder="星际坐标（可选，如 RA 14h 29m）"
              className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-all duration-300"
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

          <div className="mb-5">
            <div className="text-xs mb-2" style={{ color: 'rgba(79, 195, 247, 0.4)' }}>
              星云信封预览
            </div>
            <div
              ref={envelopeRef}
              className="w-full h-16 rounded-xl"
              style={{
                boxShadow: '0 0 20px rgba(196, 77, 255, 0.15)',
              }}
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={!title.trim() || !content.trim() || isSubmitting}
            className="w-full py-3 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all duration-300"
            style={{
              background: (!title.trim() || !content.trim())
                ? 'rgba(79, 195, 247, 0.1)'
                : 'rgba(79, 195, 247, 0.2)',
              border: '1px solid rgba(79, 195, 247, 0.4)',
              color: '#4fc3f7',
              boxShadow: (!title.trim() || !content.trim()) ? 'none' : '0 0 20px rgba(79, 195, 247, 0.2)',
              opacity: (!title.trim() || !content.trim()) ? 0.5 : 1,
              cursor: (!title.trim() || !content.trim()) ? 'not-allowed' : 'pointer',
            }}
            onMouseEnter={(e) => {
              if (title.trim() && content.trim()) {
                e.currentTarget.style.background = 'rgba(79, 195, 247, 0.35)'
                e.currentTarget.style.boxShadow = '0 0 30px rgba(79, 195, 247, 0.35)'
                e.currentTarget.style.transform = 'scale(1.02)'
              }
            }}
            onMouseLeave={(e) => {
              if (title.trim() && content.trim()) {
                e.currentTarget.style.background = 'rgba(79, 195, 247, 0.2)'
                e.currentTarget.style.boxShadow = '0 0 20px rgba(79, 195, 247, 0.2)'
                e.currentTarget.style.transform = 'scale(1)'
              }
            }}
          >
            <Send size={16} />
            {isSubmitting ? '投递中...' : '投递到星海'}
          </button>
        </div>
      </div>
    </div>
  )
}
