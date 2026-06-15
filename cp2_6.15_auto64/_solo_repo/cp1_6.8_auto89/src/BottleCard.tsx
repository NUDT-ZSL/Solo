import { useRef, useCallback } from 'react'
import { useBottleStore, BOTTLE_COLORS, BOTTLE_NAMES } from './BottleEngine'
import { Flame, X } from 'lucide-react'

export default function BottleCard() {
  const cardRef = useRef<HTMLDivElement>(null)
  const { showCard, selectedWish, setShowCard, lightWish } = useBottleStore()

  const handleLight = useCallback(() => {
    if (!selectedWish || !cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    lightWish(selectedWish.id, cx, cy)
  }, [selectedWish, lightWish])

  if (!showCard || !selectedWish) return null

  const color = BOTTLE_COLORS[selectedWish.style]
  const name = BOTTLE_NAMES[selectedWish.style]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={() => setShowCard(false)}
    >
      <div className="absolute inset-0 bg-black/30" />
      <div
        ref={cardRef}
        className="relative z-10 w-[340px] max-w-[90vw] rounded-2xl p-6 animate-card-in"
        style={{
          background: 'rgba(10, 22, 40, 0.75)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: `1px solid rgba(${hexToRgb(color)}, 0.3)`,
          boxShadow: `0 0 40px rgba(${hexToRgb(color)}, 0.15), inset 0 1px 0 rgba(255,255,255,0.1)`,
        }}
        onClick={e => e.stopPropagation()}
      >
        <button
          className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          onClick={() => setShowCard(false)}
        >
          <X size={16} className="text-white/70" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <div
            className="w-3 h-3 rounded-full"
            style={{ background: color, boxShadow: `0 0 10px ${color}` }}
          />
          <span className="text-white/50 text-xs">{name}</span>
        </div>

        <p
          className="text-white text-lg leading-relaxed mb-5 font-serif"
          style={{ fontFamily: '"Noto Serif SC", serif' }}
        >
          {selectedWish.content}
        </p>

        <div className="flex items-center justify-between">
          <div className="text-white/40 text-xs">
            {selectedWish.created_at || '刚刚'}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-white/60 text-sm">
              <Flame size={14} style={{ color }} />
              <span>{selectedWish.light_count}</span>
            </div>
            <button
              onClick={handleLight}
              className="px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300 hover:scale-105 active:scale-95"
              style={{
                background: `linear-gradient(135deg, rgba(${hexToRgb(color)}, 0.3), rgba(${hexToRgb(color)}, 0.6))`,
                border: `1px solid rgba(${hexToRgb(color)}, 0.5)`,
                color: '#fff',
                boxShadow: `0 0 20px rgba(${hexToRgb(color)}, 0.3)`,
              }}
            >
              ✨ 点亮
            </button>
          </div>
        </div>
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
