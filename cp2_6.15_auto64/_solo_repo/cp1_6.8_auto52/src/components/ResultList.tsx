import { useEffect } from 'react'
import { useMysteryStore } from '@/store/useMysteryStore'
import { Trophy, Clock } from 'lucide-react'

const COLOR_ACCENTS: Record<string, string> = {
  'warm-yellow': 'border-l-warm-yellow/40',
  'cyan-green': 'border-l-cyan-green/40',
  'light-blue': 'border-l-light-blue/40',
}

const COLOR_TEXT: Record<string, string> = {
  'warm-yellow': 'text-warm-yellow',
  'cyan-green': 'text-cyan-green',
  'light-blue': 'text-light-blue',
}

export default function ResultList() {
  const { solvedList, fetchSolved } = useMysteryStore()

  useEffect(() => {
    fetchSolved()
  }, [fetchSolved])

  if (solvedList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 py-20">
        <Trophy size={48} className="text-white/10" />
        <div className="text-white/25 text-sm tracking-wider">
          还没有破解任何谜语
        </div>
        <div className="text-white/15 text-xs">
          去谜语墙试试看吧
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 pb-24 overflow-y-auto h-full">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6 px-1">
          <Trophy size={20} className="text-warm-yellow/60" />
          <h2 className="text-lg font-serif text-white/70 tracking-wider">
            已破解 {solvedList.length} 题
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {solvedList.map((item, i) => (
            <div
              key={item.id}
              className={`solved-card border-l-2 ${COLOR_ACCENTS[item.color] || 'border-l-white/10'}`}
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              <p className={`font-serif text-sm leading-relaxed text-white/80 mb-3 ${COLOR_TEXT[item.color] || 'text-white/80'}`}>
                {item.riddle}
              </p>
              <div className="flex items-center gap-1.5 text-white/25 text-xs">
                <Clock size={12} />
                <span>
                  {item.solved_at
                    ? new Date(item.solved_at).toLocaleString('zh-CN', {
                        month: 'numeric',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '刚刚'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
