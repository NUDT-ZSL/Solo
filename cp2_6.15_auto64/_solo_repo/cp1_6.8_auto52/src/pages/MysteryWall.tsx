import { useEffect, useState, useCallback, useRef } from 'react'
import { useMysteryStore } from '@/store/useMysteryStore'
import MysteryCard from '@/components/MysteryCard'
import VerifyModal from '@/components/VerifyModal'
import CreateModal from '@/components/CreateModal'
import ParticleCanvas, { spawnBurstParticles, spawnShatterParticles } from '@/components/ParticleCanvas'
import { Plus, Volume2 } from 'lucide-react'
import type { Particle } from '@/components/ParticleCanvas'

interface VerifyState {
  id: string
  riddle: string
  color: string
}

export default function MysteryWall() {
  const { mysteries, loading, fetchMysteries, fetchMysteryDetail, selectedMystery, setSelectedMystery } = useMysteryStore()
  const [showCreate, setShowCreate] = useState(false)
  const [verifyState, setVerifyState] = useState<VerifyState | null>(null)
  const [particles, setParticles] = useState<Particle[]>([])
  const [wallOffset, setWallOffset] = useState(0)
  const animFrameRef = useRef<number>(0)
  const lastTimeRef = useRef(0)

  useEffect(() => {
    fetchMysteries()
  }, [fetchMysteries])

  useEffect(() => {
    const animate = (time: number) => {
      if (lastTimeRef.current === 0) lastTimeRef.current = time
      const delta = time - lastTimeRef.current
      lastTimeRef.current = time
      setWallOffset((prev) => prev + delta * 0.003)
      animFrameRef.current = requestAnimationFrame(animate)
    }
    animFrameRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animFrameRef.current)
  }, [])

  const playSuccessSound = useCallback(() => {
    try {
      const ctx = new AudioContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(523.25, ctx.currentTime)
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1)
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2)
      gain.gain.setValueAtTime(0.15, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.5)
    } catch {
      // audio not supported
    }
  }, [])

  const handleCardClick = useCallback(async (id: string, e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const mystery = mysteries.find((m) => m.id === id)
    if (!mystery) return

    const burst = spawnBurstParticles(cx, cy, mystery.color, 20)
    setParticles(burst)

    const detail = await fetchMysteryDetail(id)
    if (detail) {
      setVerifyState({ id: detail.id, riddle: detail.riddle, color: detail.color })
    }
  }, [mysteries, fetchMysteryDetail])

  const handleCorrect = useCallback((color: string) => {
    const cx = window.innerWidth / 2
    const cy = window.innerHeight / 2
    const shatter = spawnShatterParticles(cx, cy, color, 50)
    setParticles(shatter)
    playSuccessSound()
    setVerifyState(null)
    setSelectedMystery(null)
    setTimeout(() => fetchMysteries(), 300)
  }, [playSuccessSound, fetchMysteries, setSelectedMystery])

  const handleWrong = useCallback(() => {
    // shake animation handled in VerifyModal
  }, [])

  const handleCreated = useCallback(() => {
    fetchMysteries()
  }, [fetchMysteries])

  const activeMysteries = mysteries.filter((m) => !m.solved)

  const cols = Math.max(3, Math.min(6, Math.floor(window.innerWidth / 180)))
  const rows = Math.ceil(activeMysteries.length / cols)

  return (
    <div className="relative w-full h-full overflow-hidden">
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{
          perspective: '1200px',
        }}
      >
        <div
          className="grid gap-4 p-6"
          style={{
            gridTemplateColumns: `repeat(${cols}, minmax(120px, 160px))`,
            transform: `perspective(1200px) rotateY(${Math.sin(wallOffset * 0.1) * 3}deg) rotateX(${Math.cos(wallOffset * 0.08) * 1.5}deg)`,
            transition: 'transform 0.1s linear',
          }}
        >
          {activeMysteries.map((m, i) => (
            <MysteryCard
              key={m.id}
              id={m.id}
              riddle_preview={m.riddle_preview}
              color={m.color}
              solved={m.solved}
              index={i}
              onClick={handleCardClick}
            />
          ))}
        </div>
      </div>

      {loading && activeMysteries.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-white/30 text-sm tracking-wider animate-pulse">
            谜语墙正在加载...
          </div>
        </div>
      )}

      {!loading && activeMysteries.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
          <div className="text-4xl opacity-20">🔮</div>
          <div className="text-white/30 text-sm tracking-wider">
            还没有谜语，快来创建一个吧
          </div>
        </div>
      )}

      <button
        onClick={() => setShowCreate(true)}
        className="fixed bottom-24 right-6 w-14 h-14 rounded-full bg-gradient-to-br from-warm-yellow/80 to-amber-600/80 text-white shadow-lg shadow-warm-yellow/20 flex items-center justify-center transition-all duration-300 hover:scale-110 hover:shadow-warm-yellow/40 z-20"
        style={{
          animation: 'breathe 3s ease-in-out infinite',
          '--glow-color': 'rgba(251, 191, 36, 0.3)',
        } as React.CSSProperties}
      >
        <Plus size={24} />
      </button>

      <ParticleCanvas
        particles={particles}
        onDone={() => setParticles([])}
      />

      {verifyState && (
        <VerifyModal
          mysteryId={verifyState.id}
          riddle={verifyState.riddle}
          color={verifyState.color}
          onClose={() => {
            setVerifyState(null)
            setSelectedMystery(null)
          }}
          onCorrect={handleCorrect}
          onWrong={handleWrong}
        />
      )}

      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  )
}
