import { useState, useCallback, useEffect } from 'react'
import ParticleCanvas from './ParticleCanvas'
import ControlPanel from './ControlPanel'

export default function App() {
  const [themeIndex, setThemeIndex] = useState(0)
  const [particleSize, setParticleSize] = useState(4)
  const [dissipationSpeed, setDissipationSpeed] = useState(1.5)
  const [fps, setFps] = useState(0)
  const [clearSignal, setClearSignal] = useState(0)
  const [isMobile, setIsMobile] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const handleClear = useCallback(() => {
    setClearSignal((s) => s + 1)
  }, [])

  const handleFpsUpdate = useCallback((newFps: number) => {
    setFps(newFps)
  }, [])

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: '#0a0a12',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif",
      }}
    >
      <header
        style={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: isMobile ? '10px 16px' : '12px 28px',
          background: 'rgba(10, 10, 18, 0.8)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h1
            style={{
              margin: 0,
              fontSize: isMobile ? '16px' : '20px',
              fontWeight: 800,
              background: 'linear-gradient(135deg, #a855f7, #6366f1, #38bdf8)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '3px',
            }}
          >
            ✦ 幻光轨迹
          </h1>
          {!isMobile && (
            <span
              style={{
                fontSize: '12px',
                color: 'rgba(255,255,255,0.25)',
                borderLeft: '1px solid rgba(255,255,255,0.08)',
                paddingLeft: '12px',
              }}
            >
              交互式粒子路径绘画
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span
            style={{
              fontSize: isMobile ? '11px' : '12px',
              color: 'rgba(255,255,255,0.3)',
            }}
          >
            {isMobile ? '触屏拖拽绘制' : '🖱️ 拖拽鼠标绘制粒子路径 · 松开自动消散'}
          </span>
          {isMobile && (
            <button
              onClick={() => setPanelOpen(!panelOpen)}
              style={{
                padding: '6px 12px',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                background: panelOpen
                  ? 'rgba(139,92,246,0.2)'
                  : 'rgba(255,255,255,0.05)',
                color: panelOpen ? '#c4b5fd' : 'rgba(255,255,255,0.5)',
                fontSize: '12px',
                cursor: 'pointer',
                fontFamily: 'inherit',
                outline: 'none',
                transition: 'all 0.3s ease',
              }}
            >
              ⚡ 面板
            </button>
          )}
        </div>
      </header>

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div
          style={{
            flex: 1,
            position: 'relative',
            overflow: 'hidden',
            background: '#0a0a12',
          }}
        >
          <ParticleCanvas
            themeIndex={themeIndex}
            particleSize={particleSize}
            dissipationSpeed={dissipationSpeed}
            onFpsUpdate={handleFpsUpdate}
            onClear={() => {}}
            clearSignal={clearSignal}
          />

          <div
            style={{
              position: 'absolute',
              bottom: '12px',
              left: '50%',
              transform: 'translateX(-50%)',
              padding: '6px 16px',
              borderRadius: '20px',
              background: 'rgba(10,10,18,0.6)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.04)',
              fontSize: '11px',
              color: fps >= 55 ? 'rgba(0,255,136,0.6)' : fps >= 30 ? 'rgba(255,204,0,0.6)' : 'rgba(255,64,96,0.6)',
              fontVariantNumeric: 'tabular-nums',
              pointerEvents: 'none',
              letterSpacing: '1px',
            }}
          >
            {fps} FPS
          </div>
        </div>

        {!isMobile && (
          <ControlPanel
            themeIndex={themeIndex}
            particleSize={particleSize}
            dissipationSpeed={dissipationSpeed}
            fps={fps}
            onThemeChange={setThemeIndex}
            onParticleSizeChange={setParticleSize}
            onDissipationSpeedChange={setDissipationSpeed}
            onClear={handleClear}
          />
        )}

        {isMobile && (
          <div
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 20,
              transform: panelOpen ? 'translateY(0)' : 'translateY(100%)',
              transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              maxHeight: '70vh',
              overflowY: 'auto',
              borderTopLeftRadius: '20px',
              borderTopRightRadius: '20px',
            }}
          >
            <ControlPanel
              themeIndex={themeIndex}
              particleSize={particleSize}
              dissipationSpeed={dissipationSpeed}
              fps={fps}
              onThemeChange={setThemeIndex}
              onParticleSizeChange={setParticleSize}
              onDissipationSpeedChange={setDissipationSpeed}
              onClear={handleClear}
            />
          </div>
        )}

        {isMobile && panelOpen && (
          <div
            onClick={() => setPanelOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              zIndex: 15,
            }}
          />
        )}
      </div>
    </div>
  )
}
