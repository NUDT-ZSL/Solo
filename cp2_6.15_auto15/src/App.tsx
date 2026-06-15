import React, { useState, useCallback } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import AuroraScene from './scene/AuroraScene'

interface AuroraParams {
  intensity: number
  colorOffset: number
  windSpeed: number
}

const App: React.FC = () => {
  const [params, setParams] = useState<AuroraParams>({
    intensity: 60,
    colorOffset: 0,
    windSpeed: 100,
  })
  const [panelCollapsed, setPanelCollapsed] = useState(false)

  const handleIntensityChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setParams(prev => ({ ...prev, intensity: Number(e.target.value) }))
  }, [])

  const handleColorOffsetChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setParams(prev => ({ ...prev, colorOffset: Number(e.target.value) }))
  }, [])

  const handleWindSpeedChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setParams(prev => ({ ...prev, windSpeed: Number(e.target.value) }))
  }, [])

  return (
    <div style={styles.container}>
      <Canvas
        camera={{ position: [0, 3, 15], fov: 60, near: 0.1, far: 1000 }}
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 2]}
        style={{ background: '#0d0d2b' }}
      >
        <color attach="background" args={['#0d0d2b']} />
        <fog attach="fog" args={['#0d0d2b', 50, 150]} />
        <OrbitControls
          enablePan={false}
          minDistance={5}
          maxDistance={40}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI / 2.1}
          enableDamping
          dampingFactor={0.05}
        />
        <AuroraScene params={params} />
      </Canvas>

      <div
        style={{
          ...styles.panel,
          ...(panelCollapsed ? styles.panelCollapsed : {}),
        }}
      >
        {!panelCollapsed ? (
          <>
            <div style={styles.panelHeader}>
              <span style={styles.panelTitle}>极光控制面板</span>
              <button
                style={styles.collapseBtn}
                onClick={() => setPanelCollapsed(true)}
                onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.95)' }}
                onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
              >
                ×
              </button>
            </div>

            <div style={styles.controlGroup}>
              <label style={styles.label}>
                极光强度 <span style={styles.value}>{params.intensity}</span>
              </label>
              <input
                type="range"
                min={0}
                max={100}
                value={params.intensity}
                onChange={handleIntensityChange}
                style={styles.slider}
              />
            </div>

            <div style={styles.controlGroup}>
              <label style={styles.label}>
                色彩偏移 <span style={styles.value}>{params.colorOffset}</span>
              </label>
              <input
                type="range"
                min={-50}
                max={50}
                value={params.colorOffset}
                onChange={handleColorOffsetChange}
                style={styles.slider}
              />
            </div>

            <div style={styles.controlGroup}>
              <label style={styles.label}>
                风速 <span style={styles.value}>{params.windSpeed}</span>
              </label>
              <input
                type="range"
                min={0}
                max={200}
                value={params.windSpeed}
                onChange={handleWindSpeedChange}
                style={styles.slider}
              />
            </div>
          </>
        ) : (
          <button
            style={styles.expandBtn}
            onClick={() => setPanelCollapsed(false)}
            onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.95)' }}
            onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
          >
            ✦
          </button>
        )}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    height: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  panel: {
    position: 'absolute',
    top: 24,
    left: 24,
    width: 260,
    padding: 20,
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.18)',
    borderRadius: 12,
    color: '#d0d8e8',
    fontFamily: '"Segoe UI", system-ui, sans-serif',
    transition: 'all 0.3s ease',
    zIndex: 10,
  },
  panelCollapsed: {
    width: 44,
    height: 44,
    padding: 0,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  panelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 12,
    borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
  },
  panelTitle: {
    fontSize: 14,
    fontWeight: 600,
    letterSpacing: 0.5,
    color: '#d0d8e8',
  },
  collapseBtn: {
    width: 28,
    height: 28,
    background: 'rgba(255, 255, 255, 0.08)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: 6,
    color: '#d0d8e8',
    fontSize: 16,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
  },
  expandBtn: {
    width: 44,
    height: 44,
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.18)',
    borderRadius: '50%',
    color: '#d0d8e8',
    fontSize: 18,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
  },
  controlGroup: {
    marginBottom: 18,
  },
  label: {
    display: 'block',
    fontSize: 12,
    marginBottom: 8,
    color: '#a8b0c0',
    fontWeight: 500,
  },
  value: {
    color: '#d0d8e8',
    fontWeight: 600,
    marginLeft: 4,
  },
  slider: {
    width: '100%',
    height: 4,
    WebkitAppearance: 'none',
    appearance: 'none',
    background: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 2,
    outline: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
}

export default App
