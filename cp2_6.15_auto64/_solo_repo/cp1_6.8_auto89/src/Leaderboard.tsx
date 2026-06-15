import { useEffect, useState } from 'react'
import { useBottleStore, BOTTLE_COLORS, BOTTLE_NAMES, type Wish } from './BottleEngine'
import { Flame, ArrowLeft } from 'lucide-react'

export default function Leaderboard() {
  const { activeTab, setActiveTab } = useBottleStore()
  const [wishes, setWishes] = useState<Wish[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (activeTab !== 'leaderboard') return
    setLoading(true)
    fetch('/api/wishes/leaderboard')
      .then(res => res.json())
      .then((data: Wish[]) => setWishes(data))
      .catch(() => setWishes([]))
      .finally(() => setLoading(false))
  }, [activeTab])

  if (activeTab !== 'leaderboard') return null

  return (
    <div className="fixed inset-0 z-30" style={{ background: 'rgba(10, 22, 40, 0.95)' }}>
      <div className="max-w-lg mx-auto px-4 pt-6 pb-24 h-full overflow-y-auto">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setActiveTab('ocean')}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <ArrowLeft size={16} className="text-white/70" />
          </button>
          <h1
            className="text-xl text-white"
            style={{ fontFamily: '"ZCOOL QingKe HuangYou", sans-serif' }}
          >
            ✨ 已点亮榜
          </h1>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
          </div>
        ) : wishes.length === 0 ? (
          <div className="text-center py-20 text-white/40 text-sm">
            还没有瓶子被点亮，去海域点亮一个吧~
          </div>
        ) : (
          <div className="space-y-3">
            {wishes.map((wish, index) => {
              const color = BOTTLE_COLORS[wish.style]
              const name = BOTTLE_NAMES[wish.style]
              return (
                <div
                  key={wish.id}
                  className="rounded-xl p-4 transition-all duration-200 hover:scale-[1.01]"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 mt-0.5"
                      style={{
                        background: index < 3
                          ? `linear-gradient(135deg, rgba(${hexToRgb(color)}, 0.6), rgba(${hexToRgb(color)}, 0.9))`
                          : 'rgba(255,255,255,0.1)',
                        color: index < 3 ? '#fff' : 'rgba(255,255,255,0.5)',
                      }}
                    >
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm leading-relaxed line-clamp-2 font-serif" style={{ fontFamily: '"Noto Serif SC", serif' }}>
                        {wish.content}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ background: color, boxShadow: `0 0 6px ${color}` }}
                        />
                        <span className="text-white/30 text-xs">{name}</span>
                        <span className="text-white/20 text-xs">·</span>
                        <span className="text-white/30 text-xs">{wish.created_at}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Flame size={14} style={{ color }} />
                      <span className="text-white/70 text-sm">{wish.light_count}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
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
