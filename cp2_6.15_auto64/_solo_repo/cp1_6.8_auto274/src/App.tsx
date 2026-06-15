import { useState, useRef, useCallback } from 'react'
import Canvas from './components/Canvas'
import Controls from './components/Controls'
import { type NeonTrail, exportCanvas } from './utils/drawUtils'

export default function App() {
  const [color, setColor] = useState('#00c8ff')
  const [width, setWidth] = useState(6)
  const [trails, setTrails] = useState<NeonTrail[]>([])
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const handleClear = useCallback(() => {
    setTrails((prev) =>
      prev.map((t) => (t.fadingOut ? t : { ...t, fadingOut: true })),
    )
  }, [])

  const handleExport = useCallback(() => {
    if (canvasRef.current) {
      exportCanvas(canvasRef.current)
    }
  }, [])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        overflow: 'hidden',
        background: '#050008',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <Canvas
        color={color}
        width={width}
        trails={trails}
        setTrails={setTrails}
        canvasRef={canvasRef}
      />
      <Controls
        color={color}
        setColor={setColor}
        width={width}
        setWidth={setWidth}
        onClear={handleClear}
        onExport={handleExport}
      />
      <div
        style={{
          position: 'absolute',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          color: 'rgba(255,255,255,0.15)',
          fontSize: '14px',
          letterSpacing: '4px',
          textTransform: 'uppercase',
          pointerEvents: 'none',
          userSelect: 'none',
          fontWeight: 300,
        }}
      >
        霓虹字迹
      </div>
    </div>
  )
}
