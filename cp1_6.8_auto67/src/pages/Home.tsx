import { useEffect, useCallback, useState } from 'react'
import { Plus } from 'lucide-react'
import StarField from '../components/StarField'
import CapsuleCard, { ParticleBurst } from '../components/CapsuleCard'
import CreateForm from '../components/CreateForm'
import BottomNav from '../components/BottomNav'
import { useCapsuleStore } from '../store/capsuleStore'
import type { Capsule } from '../../shared/types'

export default function Home() {
  const { capsules, fetchCapsules, openCard, openForm } = useCapsuleStore()
  const [burstParticles, setBurstParticles] = useState<{ id: number; x: number; y: number }[]>([])
  const burstIdRef = useState(0)

  useEffect(() => {
    fetchCapsules()
  }, [fetchCapsules])

  const handleCapsuleClick = useCallback((capsule: Capsule) => {
    const id = burstIdRef[0] + 1
    burstIdRef[0] = id
    const cx = window.innerWidth / 2
    const cy = window.innerHeight / 2
    setBurstParticles(prev => [...prev, { id, x: cx, y: cy }])
    setTimeout(() => {
      openCard(capsule)
    }, 400)
  }, [openCard, burstIdRef])

  const removeBurst = useCallback((id: number) => {
    setBurstParticles(prev => prev.filter(p => p.id !== id))
  }, [])

  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: '#0a0a2e' }}>
      <StarField capsules={capsules} onCapsuleClick={handleCapsuleClick} />

      <div className="absolute top-6 left-1/2 -translate-x-1/2 text-center pointer-events-none z-10">
        <h1
          className="text-2xl sm:text-3xl font-bold tracking-wider"
          style={{
            fontFamily: "'Cinzel', serif",
            background: 'linear-gradient(135deg, #f0c878 0%, #d4a574 50%, #f0c878 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          MEMORY ARK
        </h1>
        <p className="text-xs text-white/30 mt-1 tracking-widest">记忆方舟</p>
      </div>

      <button
        onClick={openForm}
        className="fixed bottom-20 right-6 sm:right-10 w-14 h-14 rounded-full flex items-center justify-center z-30 transition-all hover:scale-110 active:scale-95"
        style={{
          background: 'linear-gradient(135deg, #f0c878, #d4a574)',
          boxShadow: '0 4px 24px rgba(240,200,120,0.4), 0 0 60px rgba(240,200,120,0.15)',
        }}
      >
        <Plus size={24} className="text-black/70" />
      </button>

      <CapsuleCard />
      <CreateForm />
      <BottomNav />

      {burstParticles.map(p => (
        <ParticleBurst key={p.id} x={p.x} y={p.y} onDone={() => removeBurst(p.id)} />
      ))}
    </div>
  )
}
