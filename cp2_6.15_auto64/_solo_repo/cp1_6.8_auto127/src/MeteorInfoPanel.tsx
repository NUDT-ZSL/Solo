import { useStore } from '@/store'
import { X } from 'lucide-react'
import { useEffect, useState } from 'react'

export default function MeteorInfoPanel() {
  const { selectedMeteor, setSelectedMeteor } = useStore()
  const [countdown, setCountdown] = useState<number | null>(null)

  useEffect(() => {
    if (!selectedMeteor) {
      setCountdown(null)
      return
    }
    setCountdown(selectedMeteor.remainingTime)
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 0.1) {
          clearInterval(interval)
          setSelectedMeteor(null)
          return null
        }
        return Math.round((prev - 0.1) * 10) / 10
      })
    }, 100)
    return () => clearInterval(interval)
  }, [selectedMeteor, setSelectedMeteor])

  if (!selectedMeteor || countdown === null) return null

  return (
    <div
      className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50
        w-72 p-6 rounded-2xl
        bg-white/[0.06] backdrop-blur-xl
        border border-white/[0.1]
        shadow-[0_0_60px_rgba(34,211,238,0.08)]
        animate-in fade-in zoom-in-95 duration-200"
    >
      <button
        onClick={() => setSelectedMeteor(null)}
        className="absolute top-3 right-3 text-white/40 hover:text-white/80 transition-colors"
      >
        <X size={16} />
      </button>

      <h3
        className="text-xs tracking-[0.2em] uppercase text-cyan-400/80 mb-5
          font-[Orbitron,monospace]"
      >
        流星数据
      </h3>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-white/50">速度</span>
          <span className="text-sm font-mono text-cyan-200 font-[Orbitron,monospace]">
            {selectedMeteor.speed} <span className="text-[10px] text-white/30">km/s</span>
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-white/50">颜色</span>
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded-full shadow-[0_0_10px_var(--glow-color)]"
              style={{
                backgroundColor: selectedMeteor.color,
                '--glow-color': selectedMeteor.color,
              } as React.CSSProperties}
            />
            <span className="text-sm font-mono text-white/70 font-[Orbitron,monospace]">
              {selectedMeteor.color.toUpperCase()}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-white/50">消失倒计时</span>
          <span
            className="text-lg font-mono text-white/90 font-[Orbitron,monospace]
              tabular-nums tracking-wider"
          >
            {countdown?.toFixed(1)}
            <span className="text-[10px] text-white/30 ml-1">s</span>
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-white/50">坐标</span>
          <span className="text-[11px] font-mono text-white/40 font-[Orbitron,monospace]">
            {selectedMeteor.position.map((v) => v.toFixed(1)).join(', ')}
          </span>
        </div>
      </div>

      <div className="mt-5 h-px bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent" />

      <div className="mt-3 text-center">
        <span className="text-[10px] text-white/20 tracking-widest uppercase font-[Orbitron,monospace]">
          {selectedMeteor.id}
        </span>
      </div>
    </div>
  )
}
