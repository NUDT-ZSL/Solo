import { Canvas } from '@react-three/fiber'
import EarthScene from './earth-module/EarthScene'
import ControlPanel from './ui-control/ControlPanel'
import { initializeData } from './earth-module/DataLoader'
import { useClimateStore } from './store/useClimateStore'

initializeData()

function CoordDisplay() {
  const hoveredCoords = useClimateStore((s) => s.hoveredCoords)
  if (!hoveredCoords) return null
  return (
    <div style={{
      position: 'fixed',
      top: 52,
      left: 20,
      fontSize: 13,
      color: '#CBD5E1',
      fontFamily: 'monospace',
      zIndex: 50,
      pointerEvents: 'none',
      letterSpacing: '0.3px',
    }}>
      经度: {hoveredCoords.lon.toFixed(1)}° 纬度: {hoveredCoords.lat.toFixed(1)}°
    </div>
  )
}

function ColorLegend() {
  return (
    <div style={{
      position: 'fixed',
      bottom: 24,
      left: 20,
      zIndex: 50,
      pointerEvents: 'none',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        fontSize: 11,
        color: '#94A3B8',
      }}>
        <span>-2°C</span>
        <div style={{
          width: 120,
          height: 8,
          borderRadius: 4,
          background: 'linear-gradient(to right, #0077B6, #D62828)',
        }} />
        <span>+2°C</span>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      <div style={{
        position: 'fixed',
        top: 20,
        left: 20,
        zIndex: 50,
        pointerEvents: 'none',
      }}>
        <h1 style={{
          fontSize: 24,
          fontWeight: 200,
          color: '#fff',
          letterSpacing: '1px',
          margin: 0,
          textShadow: '0 2px 8px rgba(0,0,0,0.3)',
        }}>
          Global Temperature Anomalies 1880-2023
        </h1>
      </div>

      <CoordDisplay />
      <ColorLegend />

      <Canvas
        camera={{ position: [0, 0, 15], fov: 50, near: 0.1, far: 100 }}
        style={{ background: 'transparent' }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]}
      >
        <EarthScene />
      </Canvas>

      <ControlPanel />
    </div>
  )
}
