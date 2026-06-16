import { useState, useCallback } from 'react'
import { Canvas } from '@react-three/fiber'
import AuroraScene from './components/AuroraScene'
import ControlPanel from './components/ControlPanel'

export interface AuroraBandParams {
  id: number
  color: string
  flowSpeed: number
  amplitude: number
}

const DEFAULT_COLORS = [
  '#00ff87',
  '#00e5ff',
  '#6f00ff',
  '#ff00aa',
  '#ffdd00',
  '#ff6b00',
]

const createDefaultParams = (): AuroraBandParams[] =>
  Array.from({ length: 6 }, (_, i) => ({
    id: i,
    color: DEFAULT_COLORS[i],
    flowSpeed: 0.5 + Math.random() * 1.0,
    amplitude: 1.0 + Math.random() * 1.5,
  }))

export default function App() {
  const [auroraParams, setAuroraParams] = useState<AuroraBandParams[]>(createDefaultParams)

  const updateBand = useCallback((id: number, patch: Partial<AuroraBandParams>) => {
    setAuroraParams((prev) =>
      prev.map((band) => (band.id === id ? { ...band, ...patch } : band))
    )
  }, [])

  const handleReset = useCallback(() => {
    setAuroraParams(createDefaultParams())
  }, [])

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <Canvas
        camera={{ position: [0, 2, 12], fov: 60, near: 0.1, far: 500 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        dpr={[1, 2]}
      >
        <color attach="background" args={['#0a0e27']} />
        <AuroraScene auroraParams={auroraParams} />
      </Canvas>
      <ControlPanel
        params={auroraParams}
        onUpdateBand={updateBand}
        onReset={handleReset}
      />
    </div>
  )
}
