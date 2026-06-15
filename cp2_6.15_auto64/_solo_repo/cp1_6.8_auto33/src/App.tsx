import { useEffect, useRef } from 'react'
import { LavaEngine } from './LavaEngine'
import { UIControl } from './UIControl'
import { useLavaStore, LavaBranchInfo } from './store'

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null)
  const engineRef = useRef<LavaEngine | null>(null)
  const setSelectedBranch = useLavaStore((s) => s.setSelectedBranch)

  useEffect(() => {
    if (!containerRef.current) return

    const engine = new LavaEngine(containerRef.current)
    engineRef.current = engine

    engine.setOnBranchClick((info: LavaBranchInfo) => {
      setSelectedBranch(info)
    })

    engine.start()

    return () => {
      engine.dispose()
      engineRef.current = null
    }
  }, [setSelectedBranch])

  return (
    <div className="lava-app">
      <div ref={containerRef} className="lava-canvas" />
      <UIControl />
      <div className="title-overlay">
        <h1>熔岩织锦</h1>
        <p>点击熔岩支流触发喷涌 · 拖拽旋转视角 · 滚轮缩放</p>
      </div>
    </div>
  )
}
