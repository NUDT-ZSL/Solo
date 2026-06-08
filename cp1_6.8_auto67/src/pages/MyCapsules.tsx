import { useEffect, useCallback } from 'react'
import { Lock, Unlock, Clock, Calendar } from 'lucide-react'
import BottomNav from '../components/BottomNav'
import CapsuleCard from '../components/CapsuleCard'
import { useCapsuleStore } from '../store/capsuleStore'
import { TimeCapsuleEngine } from '../utils/TimeCapsuleEngine'

export default function MyCapsules() {
  const { capsules, fetchCapsules, openCard } = useCapsuleStore()

  useEffect(() => {
    fetchCapsules()
  }, [fetchCapsules])

  const handleClick = useCallback((capsule: typeof capsules[0]) => {
    openCard(capsule)
  }, [openCard])

  return (
    <div className="min-h-screen relative" style={{ background: 'linear-gradient(180deg, #0a0a2e 0%, #1a0a3e 100%)' }}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: `${1 + Math.random() * 2}px`,
              height: `${1 + Math.random() * 2}px`,
              background: 'rgba(240,200,120,0.3)',
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `twinkle ${3 + Math.random() * 4}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 5}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-4 pt-8 pb-24">
        <h1
          className="text-2xl font-bold tracking-wider mb-6"
          style={{
            fontFamily: "'Cinzel', serif",
            background: 'linear-gradient(135deg, #f0c878, #d4a574)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          MY CAPSULES
        </h1>
        <p className="text-xs text-white/30 mb-6 -mt-4">我的胶囊</p>

        {capsules.length === 0 ? (
          <div className="text-center py-20 text-white/30 text-sm">
            还没有胶囊，去时间星海创建一个吧 ✨
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {capsules.map(capsule => {
              const isLocked = TimeCapsuleEngine.isLocked(capsule)
              const isUnsealed = TimeCapsuleEngine.isUnsealed(capsule)
              const canUnseal = TimeCapsuleEngine.canUnseal(capsule)
              const remaining = TimeCapsuleEngine.getRemainingDays(capsule.targetDate)

              return (
                <button
                  key={capsule.id}
                  onClick={() => handleClick(capsule)}
                  className="group rounded-xl p-4 text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-lg mb-3"
                    style={{
                      background: `linear-gradient(135deg, ${capsule.color}40, ${capsule.color}15)`,
                      border: `1px solid ${capsule.color}30`,
                      boxShadow: `0 0 12px ${capsule.color}25`,
                    }}
                  />

                  <p className="text-xs text-white/70 truncate mb-2 group-hover:text-white/90 transition-colors">
                    {TimeCapsuleEngine.getSummary(capsule, 12)}
                  </p>

                  <div className="flex items-center gap-1 text-[10px] text-white/30 mb-2">
                    <Calendar size={10} />
                    {TimeCapsuleEngine.formatDate(capsule.targetDate)}
                  </div>

                  {isLocked && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-blue-500/15 text-blue-300/80 border border-blue-500/20">
                      <Lock size={9} /> 锁定 · {remaining}天
                    </span>
                  )}
                  {canUnseal && !isUnsealed && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-amber-500/15 text-amber-300/80 border border-amber-500/20">
                      <Clock size={9} /> 可开启
                    </span>
                  )}
                  {isUnsealed && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/15 text-emerald-300/80 border border-emerald-500/20">
                      <Unlock size={9} /> 已启封
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      <CapsuleCard />
      <BottomNav />
    </div>
  )
}
