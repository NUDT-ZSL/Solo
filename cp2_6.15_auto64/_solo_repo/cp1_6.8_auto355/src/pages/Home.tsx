import { useEffect } from 'react'
import IslandCanvas from '@/components/IslandCanvas'
import ControlPanel from '@/components/ControlPanel'
import StatusBar from '@/components/StatusBar'
import { useCanvasStore } from '@/hooks/useCanvasStore'

export default function Home() {
  const connectWS = useCanvasStore((s) => s.connectWS)
  const disconnectWS = useCanvasStore((s) => s.disconnectWS)

  useEffect(() => {
    connectWS()
    return () => {
      disconnectWS()
    }
  }, [connectWS, disconnectWS])

  return (
    <div className="w-full h-full relative overflow-hidden">
      <IslandCanvas />

      <div className="absolute top-0 left-0 bottom-0 flex items-center pl-4 z-10 pointer-events-none">
        <div className="pointer-events-auto">
          <ControlPanel />
        </div>
      </div>

      <div className="absolute top-4 right-4 z-10">
        <StatusBar />
      </div>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 animate-fade-in">
        <div className="glass-panel px-6 py-2">
          <h1 className="font-display font-bold text-xl text-white glow-text tracking-wider">
            🏝️ 梦绘岛
          </h1>
        </div>
      </div>
    </div>
  )
}
