import { useState, useCallback } from 'react'
import { useBottleStore, BOTTLE_COLORS, BOTTLE_NAMES, type BottleStyle } from './BottleEngine'
import { Send, ChevronLeft, ChevronRight } from 'lucide-react'

const STYLES: BottleStyle[] = [1, 2, 3, 4, 5, 6]

export default function InputPanel() {
  const { showInputPanel, setShowInputPanel, submitWish } = useBottleStore()
  const [content, setContent] = useState('')
  const [selectedStyle, setSelectedStyle] = useState<BottleStyle>(1)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = useCallback(async () => {
    if (!content.trim() || submitting) return
    setSubmitting(true)
    await submitWish(content.trim(), selectedStyle)
    setContent('')
    setSubmitting(false)
    setShowInputPanel(false)
  }, [content, selectedStyle, submitting, submitWish, setShowInputPanel])

  const handlePrev = useCallback(() => {
    setSelectedStyle(s => ((s - 2 + 6) % 6 + 1) as BottleStyle)
  }, [])

  const handleNext = useCallback(() => {
    setSelectedStyle(s => (s % 6 + 1) as BottleStyle)
  }, [])

  if (!showInputPanel) return null

  const color = BOTTLE_COLORS[selectedStyle]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={() => setShowInputPanel(false)}
    >
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative z-10 w-[380px] max-w-[92vw] rounded-2xl p-6 animate-panel-in"
        style={{
          background: 'rgba(10, 22, 40, 0.8)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 8px 60px rgba(0,0,0,0.5)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <h2
          className="text-xl text-white mb-5 text-center"
          style={{ fontFamily: '"ZCOOL QingKe HuangYou", sans-serif' }}
        >
          投放漂流瓶
        </h2>

        <div className="relative mb-5">
          <textarea
            value={content}
            onChange={e => setContent(e.target.value.slice(0, 120))}
            placeholder="写下你的心愿..."
            maxLength={120}
            rows={3}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 resize-none focus:outline-none focus:border-white/25 transition-colors text-sm leading-relaxed"
            style={{ fontFamily: '"Noto Serif SC", serif' }}
          />
          <span className="absolute bottom-2 right-3 text-white/30 text-xs">
            {content.length}/120
          </span>
        </div>

        <div className="mb-5">
          <p className="text-white/40 text-xs mb-3 text-center">选择瓶形</p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={handlePrev}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <ChevronLeft size={16} className="text-white/60" />
            </button>

            <div className="flex items-center justify-center w-[120px] h-[80px]">
              <div
                className="w-12 h-12 rounded-xl transition-all duration-300"
                style={{
                  background: `linear-gradient(135deg, rgba(${hexToRgb(color)}, 0.4), rgba(${hexToRgb(color)}, 0.7))`,
                  border: `2px solid ${color}`,
                  boxShadow: `0 0 25px rgba(${hexToRgb(color)}, 0.4)`,
                }}
              />
            </div>

            <button
              onClick={handleNext}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <ChevronRight size={16} className="text-white/60" />
            </button>
          </div>
          <p className="text-white/50 text-xs text-center mt-2">
            {BOTTLE_NAMES[selectedStyle]}
          </p>

          <div className="flex justify-center gap-2 mt-3">
            {STYLES.map(s => (
              <button
                key={s}
                onClick={() => setSelectedStyle(s)}
                className="w-5 h-5 rounded-full transition-all duration-200"
                style={{
                  background: BOTTLE_COLORS[s],
                  opacity: selectedStyle === s ? 1 : 0.4,
                  transform: selectedStyle === s ? 'scale(1.3)' : 'scale(1)',
                  boxShadow: selectedStyle === s ? `0 0 10px ${BOTTLE_COLORS[s]}` : 'none',
                }}
              />
            ))}
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!content.trim() || submitting}
          className="w-full py-2.5 rounded-xl text-white font-medium text-sm transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          style={{
            background: `linear-gradient(135deg, rgba(${hexToRgb(color)}, 0.5), rgba(${hexToRgb(color)}, 0.8))`,
            border: `1px solid rgba(${hexToRgb(color)}, 0.6)`,
            boxShadow: `0 0 25px rgba(${hexToRgb(color)}, 0.3)`,
          }}
        >
          <Send size={14} />
          {submitting ? '投放中...' : '投放漂流瓶'}
        </button>
      </div>
    </div>
  )
}

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r}, ${g}, ${b}`
}
