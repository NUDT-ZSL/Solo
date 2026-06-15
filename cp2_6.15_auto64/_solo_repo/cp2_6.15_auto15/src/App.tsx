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
      <style>{`
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 14px;
          height: 14px;
          background: linear-gradient(135deg, #d0d8e8 0%, #a8b0c0 100%);
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
          transition: all 0.2s ease;
          border: 2px solid rgba(255, 255, 255, 0.3);
        }
        input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.15);
          box-shadow: 0 3px 12px rgba(208, 216, 232, 0.5);
          background: linear-gradient(135deg, #ffffff 0%, #d0d8e8 100%);
        }
        input[type="range"]::-moz-range-thumb {
          width: 14px;
          height: 14px;
          background: linear-gradient(135deg, #d0d8e8 0%, #a8b0c0 100%);
          border-radius: 50%;
          cursor: pointer;
          border: 2px solid rgba(255, 255, 255, 0.3);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
          transition: all 0.2s ease;
        }
        input[type="range"]::-moz-range-thumb:hover {
          transform: scale(1.15);
          background: linear-gradient(135deg, #ffffff 0%, #d0d8e8 100%);
        }
        input[type="range"]:hover {
          filter: brightness(1.3) !important;
        }
        button:hover {
          filter: brightness(1.2) !important;
        }
      `}</style>
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
    background: 'linear-gradient(135deg, rgba(13, 13, 43, 0.85) 0%, rgba(20, 20, 60, 0.75) 50%, rgba(13, 13, 43, 0.85) 100%)',
    border: '1px solid rgba(255, 255, 255, 0.25)',
    borderRadius: 12,
    color: '#d0d8e8',
    fontFamily: '"Segoe UI", system-ui, sans-serif',
    transition: 'all 0.3s ease',
    zIndex: 10,
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
  },
  panelCollapsed: {
    width: 44,
    height: 44,
    padding: 0,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, rgba(13, 13, 43, 0.9) 0%, rgba(20, 20, 60, 0.85) 100%)',
  },
  panelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 12,
    borderBottom: '1px solid rgba(255, 255, 255, 0.15)',
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
    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.05) 100%)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
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
    background: 'linear-gradient(135deg, rgba(13, 13, 43, 0.9) 0%, rgba(20, 20, 60, 0.85) 100%)',
    border: '1px solid rgba(255, 255, 255, 0.25)',
    borderRadius: '50%',
    color: '#d0d8e8',
    fontSize: 18,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
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
    background: 'linear-gradient(90deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.2) 100%)',
    borderRadius: 2,
    outline: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
}

export default App
