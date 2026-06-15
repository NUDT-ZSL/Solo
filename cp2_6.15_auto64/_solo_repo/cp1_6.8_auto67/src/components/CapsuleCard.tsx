import { useCallback, useState, useEffect } from 'react'
import { X, Lock, Unlock, Share2, Calendar, Clock } from 'lucide-react'
import { useCapsuleStore } from '../store/capsuleStore'
import { TimeCapsuleEngine } from '../utils/TimeCapsuleEngine'
import type { Capsule } from '../../shared/types'

function StarGatherAnimation({ onComplete }: { onComplete: () => void }) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const startTime = Date.now()
    const duration = 1500
    let raf: number
    const animate = () => {
      const elapsed = Date.now() - startTime
      const p = Math.min(elapsed / duration, 1)
      setProgress(p)
      if (p < 1) {
        raf = requestAnimationFrame(animate)
      } else {
        onComplete()
      }
    }
    raf = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(raf)
  }, [onComplete])

  const particleCount = 24
  const particles = Array.from({ length: particleCount }, (_, i) => {
    const angle = (i / particleCount) * Math.PI * 2
    const startRadius = 120
    const currentRadius = startRadius * (1 - progress)
    const x = Math.cos(angle) * currentRadius
    const y = Math.sin(angle) * currentRadius
    const opacity = 0.3 + progress * 0.7
    const size = 3 + progress * 4
    return { x, y, opacity, size, angle }
  })

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
      <div className="relative w-64 h-64">
        {particles.map((p, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              left: '50%',
              top: '50%',
              width: `${p.size}px`,
              height: `${p.size}px`,
              background: `radial-gradient(circle, #f0c878, #d4a574)`,
              boxShadow: `0 0 ${p.size * 2}px rgba(240,200,120,0.6)`,
              transform: `translate(calc(-50% + ${p.x}px), calc(-50% + ${p.y}px))`,
              opacity: p.opacity,
              transition: 'none',
            }}
          />
        ))}
        {progress > 0.7 && (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ opacity: (progress - 0.7) / 0.3 }}
          >
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-300 to-yellow-500"
              style={{ boxShadow: '0 0 40px rgba(240,200,120,0.8), 0 0 80px rgba(240,200,120,0.4)' }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

function ParticleBurst({ x, y, onDone }: { x: number; y: number; onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 800)
    return () => clearTimeout(timer)
  }, [onDone])

  const count = 16
  const particles = Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2
    const dist = 40 + Math.random() * 60
    return { angle, dist, delay: Math.random() * 0.1 }
  })

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {particles.map((p, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            left: x,
            top: y,
            width: '4px',
            height: '4px',
            background: 'radial-gradient(circle, #f0c878, #9b59b6)',
            boxShadow: '0 0 6px rgba(240,200,120,0.8)',
            animation: `particleBurst 0.7s ease-out ${p.delay}s forwards`,
            '--tx': `${Math.cos(p.angle) * p.dist}px`,
            '--ty': `${Math.sin(p.angle) * p.dist}px`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  )
}

export { ParticleBurst, StarGatherAnimation }

export default function CapsuleCard() {
  const { selectedCapsule, isCardOpen, isUnsealing, closeCard, unsealCapsule, setUnsealing } = useCapsuleStore()
  const [showShareToast, setShowShareToast] = useState(false)
  const [unsealAnimationDone, setUnsealAnimationDone] = useState(false)

  const canUnseal = selectedCapsule ? TimeCapsuleEngine.canUnseal(selectedCapsule) : false
  const isUnsealed = selectedCapsule ? TimeCapsuleEngine.isUnsealed(selectedCapsule) : false
  const isLocked = selectedCapsule ? TimeCapsuleEngine.isLocked(selectedCapsule) : false

  const handleUnseal = useCallback(async () => {
    if (!selectedCapsule) return
    setUnsealing(true)
    setUnsealAnimationDone(false)
  }, [selectedCapsule, setUnsealing])

  const handleUnsealAnimationComplete = useCallback(async () => {
    if (!selectedCapsule) return
    const success = await unsealCapsule(selectedCapsule.id)
    if (success) {
      setUnsealAnimationDone(true)
    }
    setUnsealing(false)
  }, [selectedCapsule, unsealCapsule, setUnsealing])

  const handleShare = useCallback(() => {
    navigator.clipboard.writeText(`${window.location.origin}?capsule=${selectedCapsule?.id}`)
    setShowShareToast(true)
    setTimeout(() => setShowShareToast(false), 2000)
  }, [selectedCapsule])

  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) closeCard()
  }, [closeCard])

  if (!isCardOpen || !selectedCapsule) return null

  const remaining = TimeCapsuleEngine.getRemainingDays(selectedCapsule.targetDate)

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-4"
      style={{ background: 'rgba(5,5,30,0.7)', backdropFilter: 'blur(8px)' }}
      onClick={handleOverlayClick}
    >
      {isUnsealing && (
        <StarGatherAnimation onComplete={handleUnsealAnimationComplete} />
      )}

      <div
        className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl p-6 text-white"
        style={{
          background: 'rgba(255,255,255,0.06)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
          animation: 'cardIn 0.4s ease-out',
        }}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={closeCard}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
        >
          <X size={18} className="text-white/60" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          {isLocked && (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
              <Lock size={12} /> 已锁定
            </span>
          )}
          {canUnseal && !isUnsealed && (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <Unlock size={12} /> 可开启
            </span>
          )}
          {isUnsealed && (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <Unlock size={12} /> 已启封
            </span>
          )}
        </div>

        <p className="text-white/90 text-base leading-relaxed mb-5 whitespace-pre-wrap">
          {(isLocked && !isUnsealing) ? '🔒 寄语已封存，等待时光启封…' : selectedCapsule.message}
        </p>

        {selectedCapsule.attachmentUrl && (isUnsealed || canUnseal) && (
          <div className="mb-4 rounded-xl overflow-hidden border border-white/10">
            {selectedCapsule.attachmentType === 'image' ? (
              <img src={selectedCapsule.attachmentUrl} alt="附件" className="w-full max-h-48 object-cover" />
            ) : (
              <audio controls src={selectedCapsule.attachmentUrl} className="w-full" />
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-4 text-xs text-white/50 mb-5">
          <span className="flex items-center gap-1">
            <Calendar size={12} /> 创建于 {TimeCapsuleEngine.formatDate(selectedCapsule.createdAt)}
          </span>
          <span className="flex items-center gap-1">
            <Clock size={12} /> 启封日 {TimeCapsuleEngine.formatDate(selectedCapsule.targetDate)}
          </span>
        </div>

        {isLocked && (
          <div className="text-center text-sm text-white/40 mb-2">
            距启封还有 <span className="text-amber-400 font-medium">{remaining}</span> 天
          </div>
        )}

        {canUnseal && !isUnsealed && (
          <button
            onClick={handleUnseal}
            disabled={isUnsealing}
            className="w-full py-3 rounded-xl text-sm font-semibold text-black/80 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            style={{
              background: 'linear-gradient(135deg, #f0c878, #d4a574)',
              boxShadow: '0 4px 20px rgba(240,200,120,0.3)',
            }}
          >
            ✨ 启封时间胶囊
          </button>
        )}

        {isUnsealed && (
          <button
            onClick={handleShare}
            className="w-full py-3 rounded-xl text-sm font-medium text-white/80 flex items-center justify-center gap-2 transition-all hover:bg-white/10 border border-white/15"
          >
            <Share2 size={14} /> 分享这个时间胶囊
          </button>
        )}
      </div>

      {showShareToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg text-sm text-white/80 z-50"
          style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)' }}
        >
          链接已复制到剪贴板
        </div>
      )}
    </div>
  )
}
