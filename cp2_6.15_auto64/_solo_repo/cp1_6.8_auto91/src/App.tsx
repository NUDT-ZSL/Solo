import { useEffect, useRef } from 'react'
import { SceneManager } from '@/scene/SceneManager'
import UIControls from '@/components/UIControls'
import InfoCard from '@/components/InfoCard'

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<SceneManager | null>(null)

  useEffect(() => {
    if (!containerRef.current || sceneRef.current) return
    const manager = new SceneManager(containerRef.current)
    sceneRef.current = manager
    manager.start()

    return () => {
      manager.dispose()
      sceneRef.current = null
    }
  }, [])

  return (
    <div className="app-root">
      <div ref={containerRef} className="scene-container" />
      <UIControls />
      <InfoCard />
      <div className="app-hint">点击沙丘表面触发沙崩</div>
    </div>
  )
}
