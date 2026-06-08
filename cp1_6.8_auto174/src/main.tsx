import { useEffect, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import { CoreEngine } from './CoreEngine'
import { UIControls } from './UIControls'
import { useSimStore } from './store'
import './index.css'

function App() {
  const containerRef = useRef<HTMLDivElement>(null)
  const engineRef = useRef<CoreEngine | null>(null)
  const setActiveStarInfo = useSimStore((s) => s.setActiveStarInfo)
  const resetCamera = useSimStore((s) => s.resetCamera)

  useEffect(() => {
    if (!containerRef.current || engineRef.current) return

    const engine = new CoreEngine(containerRef.current)
    engineRef.current = engine

    engine.setOnStarClick((star) => {
      setActiveStarInfo(star.info)
    })

    engine.start()

    return () => {
      engine.dispose()
      engineRef.current = null
    }
  }, [setActiveStarInfo])

  useEffect(() => {
    if (resetCamera > 0 && engineRef.current) {
      engineRef.current.resetCamera()
    }
  }, [resetCamera])

  return (
    <div className="w-screen h-screen overflow-hidden bg-black relative">
      <div ref={containerRef} className="absolute inset-0" />

      <div className="absolute top-6 left-6 z-40 pointer-events-none select-none">
        <h1
          className="text-2xl font-bold tracking-[0.25em] text-white/80"
          style={{ fontFamily: "'Orbitron', sans-serif" }}
        >
          星尘回响
        </h1>
        <p
          className="text-[11px] tracking-[0.2em] text-indigo-300/40 mt-1.5 uppercase"
          style={{ fontFamily: "'Exo 2', sans-serif" }}
        >
          Stardust Echo — Nebula Visualization
        </p>
      </div>

      <div className="absolute bottom-6 left-6 z-40 pointer-events-none">
        <p className="text-[10px] text-white/20 tracking-wider">
          拖拽旋转 · 滚轮缩放 · 点击恒星核触发光爆
        </p>
      </div>

      <UIControls />
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<App />)
