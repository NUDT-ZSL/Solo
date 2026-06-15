import { useEffect, useRef } from 'react'
import Forge from '@/components/Forge'
import ResourcePanel from '@/components/ResourcePanel'
import ConsolePanel from '@/components/ConsolePanel'
import { useGameStore } from '@/store/gameStore'

export default function App() {
  const updateSmelting = useGameStore((s) => s.updateSmelting)
  const lastTickRef = useRef(performance.now())

  useEffect(() => {
    let rafId: number
    const tick = (now: number) => {
      const delta = now - lastTickRef.current
      lastTickRef.current = now
      if (delta > 0 && delta < 500) {
        updateSmelting(delta)
      }
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [updateSmelting])

  return (
    <div className="game-root">
      <Forge />
      <ResourcePanel />
      <ConsolePanel />
    </div>
  )
}
