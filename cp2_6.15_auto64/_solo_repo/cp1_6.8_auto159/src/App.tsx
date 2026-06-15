import { useRef, useEffect, useCallback } from 'react'
import { Engine } from './Engine'
import UI from './UI'

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null)
  const engineRef = useRef<Engine | null>(null)

  useEffect(() => {
    if (!containerRef.current || engineRef.current) return
    engineRef.current = new Engine(containerRef.current)
    return () => {
      if (engineRef.current) {
        engineRef.current.dispose()
        engineRef.current = null
      }
    }
  }, [])

  const handleResetCamera = useCallback(() => {
    engineRef.current?.resetCamera()
  }, [])

  return (
    <div className="w-screen h-screen overflow-hidden bg-[#0d1117]">
      <div ref={containerRef} className="w-full h-full" />
      <UI onResetCamera={handleResetCamera} />
    </div>
  )
}
