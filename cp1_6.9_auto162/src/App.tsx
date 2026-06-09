import { useEffect, useRef, useState, useCallback } from 'react'
import { AudioEngine, type RainMix } from './audioEngine'
import { RainCanvas, type CanvasParams } from './rainCanvas'

const normalizeMix = (mix: RainMix): RainMix => {
  const total = mix.drizzle + mix.shower + mix.thunder
  if (total === 0) return { drizzle: 1 / 3, shower: 1 / 3, thunder: 1 / 3 }
  return {
    drizzle: mix.drizzle / total,
    shower: mix.shower / total,
    thunder: mix.thunder / total
  }
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const audioEngineRef = useRef<AudioEngine | null>(null)
  const rainCanvasRef = useRef<RainCanvas | null>(null)
  const audioStartedRef = useRef(false)

  const [drizzle, setDrizzle] = useState(50)
  const [shower, setShower] = useState(30)
  const [thunder, setThunder] = useState(20)
  const [intensity, setIntensity] = useState(50)
  const [stormMode, setStormMode] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([])

  const initSystems = useCallback(() => {
    if (!canvasRef.current) return

    if (!audioEngineRef.current) {
      audioEngineRef.current = new AudioEngine()
    }
    if (!rainCanvasRef.current) {
      rainCanvasRef.current = new RainCanvas(canvasRef.current)
      rainCanvasRef.current.start()

      const handleResize = () => {
        rainCanvasRef.current?.resize()
      }
      window.addEventListener('resize', handleResize)
    }
  }, [])

  useEffect(() => {
    initSystems()
    return () => {
      rainCanvasRef.current?.stop()
      audioEngineRef.current?.dispose()
    }
  }, [initSystems])

  const getMix = useCallback((): RainMix => {
    return normalizeMix({
      drizzle: drizzle / 100,
      shower: shower / 100,
      thunder: thunder / 100
    })
  }, [drizzle, shower, thunder])

  useEffect(() => {
    const mix = getMix()
    const dominant: CanvasParams['rainType'] = (() => {
      if (mix.drizzle >= mix.shower && mix.drizzle >= mix.thunder) return 'drizzle'
      if (mix.shower >= mix.thunder) return 'shower'
      return 'thunder'
    })()

    audioEngineRef.current?.setMix(mix)
    rainCanvasRef.current?.setParams({ mix, rainType: dominant })
  }, [drizzle, shower, thunder, getMix])

  useEffect(() => {
    audioEngineRef.current?.setIntensity(intensity)
    rainCanvasRef.current?.setParams({ intensity })
  }, [intensity])

  useEffect(() => {
    rainCanvasRef.current?.setParams({ stormMode })
    if (audioEngineRef.current) {
      if (stormMode) {
        audioEngineRef.current.startStormMode()
      } else {
        audioEngineRef.current.stopStormMode()
      }
    }
  }, [stormMode])

  const startAudio = useCallback(async () => {
    if (audioStartedRef.current) return
    try {
      await audioEngineRef.current?.init()
      await audioEngineRef.current?.start()
      rainCanvasRef.current?.setAnalyser(audioEngineRef.current?.getAnalyser() ?? null)
      audioStartedRef.current = true
      setIsPlaying(true)
    } catch (e) {
      console.error('Failed to start audio:', e)
    }
  }, [])

  const handleCanvasClick = useCallback(() => {
    startAudio()
  }, [startAudio])

  const handleStormClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    startAudio()
    const rect = e.currentTarget.getBoundingClientRect()
    const id = Date.now()
    setRipples(prev => [...prev, {
      id,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    }])
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== id))
    }, 400)
    setStormMode(s => !s)
  }, [startAudio])

  const mix = getMix()

  return (
    <div style={styles.container}>
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        style={styles.canvas}
      />

      <div style={styles.overlay}>
        {!isPlaying && (
          <div style={styles.startHint}>
            <div style={styles.startHintInner}>
              <span style={{ fontSize: 48, marginBottom: 12 }}>🌧️</span>
              <div style={{ fontSize: 22, fontWeight: 600, color: '#a1c4fd', marginBottom: 6 }}>
                雨迹回响
              </div>
              <div style={{ fontSize: 13, color: '#ffffff80' }}>
                点击画布或任意控件开始体验
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={styles.panel}>
        <div style={styles.panelHeader}>
          <div style={styles.titleIcon}>🌧️</div>
          <div style={styles.titleText}>
            <h1 style={styles.title}>雨迹回响</h1>
            <div style={styles.subtitle}>Rain Echoes</div>
          </div>
        </div>

        <div style={styles.sectionTitle}>
          <span style={styles.sectionDot} />
          雨型混合
        </div>

        <div style={styles.sliderGroup}>
          <SliderRow
            label="细雨"
            emoji="💧"
            value={drizzle}
            percent={Math.round(mix.drizzle * 100)}
            onChange={(v) => { startAudio(); setDrizzle(v) }}
            color="#a1c4fd"
          />
          <SliderRow
            label="骤雨"
            emoji="🌧️"
            value={shower}
            percent={Math.round(mix.shower * 100)}
            onChange={(v) => { startAudio(); setShower(v) }}
            color="#6ab0ff"
          />
          <SliderRow
            label="雷雨"
            emoji="⛈️"
            value={thunder}
            percent={Math.round(mix.thunder * 100)}
            onChange={(v) => { startAudio(); setThunder(v) }}
            color="#8a6aff"
          />
        </div>

        <div style={styles.sectionTitle}>
          <span style={styles.sectionDot} />
          雨量强度
        </div>

        <div style={styles.intensityBlock}>
          <div style={styles.intensityLabelRow}>
            <span style={{ fontSize: 12, color: '#ffffff80' }}>轻柔</span>
            <span style={{ fontSize: 18, fontWeight: 700, color: '#4a90e2' }}>{intensity}%</span>
            <span style={{ fontSize: 12, color: '#ffffff80' }}>猛烈</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={intensity}
            onChange={(e) => { startAudio(); setIntensity(Number(e.target.value)) }}
            style={{ ...styles.range, accentColor: '#4a90e2' }}
          />
        </div>

        <div style={styles.sectionTitle}>
          <span style={styles.sectionDot} />
          特殊模式
        </div>

        <div style={{ position: 'relative' }}>
          <button
            onClick={handleStormClick}
            style={{
              ...styles.stormBtn,
              background: stormMode
                ? 'linear-gradient(135deg, #8a6aff 0%, #5a3fc0 100%)'
                : 'linear-gradient(135deg, #4a90e2 0%, #357abd 100%)'
            }}
          >
            <span style={{ fontSize: 20 }}>{stormMode ? '⛈️' : '🌩️'}</span>
            <span style={{ fontWeight: 600 }}>
              {stormMode ? '关闭风暴模式' : '开启风暴模式'}
            </span>
          </button>
          {ripples.map(r => (
            <span
              key={r.id}
              style={{
                position: 'absolute',
                left: r.x,
                top: r.y,
                width: 0,
                height: 0,
                marginLeft: 0,
                marginTop: 0,
                border: `2px solid #a1c4fd`,
                borderRadius: '50%',
                transform: 'translate(-50%, -50%)',
                pointerEvents: 'none',
                animation: 'ripple 0.4s ease-out forwards'
              }}
            />
          ))}
        </div>

        <div style={styles.footer}>
          <div style={styles.footerLine}>
            <span style={styles.footerLabel}>播放状态</span>
            <span style={{
              color: isPlaying ? '#4ade80' : '#ffffff60',
              display: 'flex', alignItems: 'center', gap: 6, fontSize: 12
            }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: isPlaying ? '#4ade80' : '#ffffff40',
                boxShadow: isPlaying ? '0 0 6px #4ade80' : 'none'
              }} />
              {isPlaying ? '沉浸中' : '等待启动'}
            </span>
          </div>
          <div style={{ ...styles.footerLine, borderBottom: 'none', paddingBottom: 0 }}>
            <span style={styles.footerLabel}>当前雨型</span>
            <RainIndicator mix={mix} />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes ripple {
          0% { width: 0; height: 0; opacity: 1; border-width: 3px; }
          100% { width: 120px; height: 120px; opacity: 0; border-width: 1px; }
        }
        input[type="range"] {
          -webkit-appearance: none;
          appearance: none;
          background: transparent;
          cursor: pointer;
          width: 100%;
        }
        input[type="range"]::-webkit-slider-runnable-track {
          background: rgba(255,255,255,0.18);
          height: 6px;
          border-radius: 3px;
        }
        input[type="range"]::-moz-range-track {
          background: rgba(255,255,255,0.18);
          height: 6px;
          border-radius: 3px;
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px; height: 18px;
          border-radius: 50%;
          background: #4a90e2;
          margin-top: -6px;
          border: 2px solid rgba(255,255,255,0.9);
          box-shadow: 0 2px 8px rgba(74,144,226,0.6);
          transition: transform 0.15s, box-shadow 0.15s;
        }
        input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.15);
          box-shadow: 0 3px 12px rgba(74,144,226,0.8);
        }
        input[type="range"]::-moz-range-thumb {
          width: 18px; height: 18px;
          border-radius: 50%;
          background: #4a90e2;
          border: 2px solid rgba(255,255,255,0.9);
          box-shadow: 0 2px 8px rgba(74,144,226,0.6);
        }
      `}</style>
    </div>
  )
}

interface SliderRowProps {
  label: string
  emoji: string
  value: number
  percent: number
  onChange: (v: number) => void
  color: string
}

function SliderRow({ label, emoji, value, percent, onChange, color }: SliderRowProps) {
  return (
    <div style={styles.sliderRow}>
      <div style={styles.sliderLabelRow}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>{emoji}</span>
          <span style={styles.sliderLabel}>{label}</span>
        </div>
        <span style={{ ...styles.sliderPercent, color }}>{percent}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={styles.range}
      />
    </div>
  )
}

function RainIndicator({ mix }: { mix: RainMix }) {
  const bars = [
    { label: '细', v: mix.drizzle, c: '#a1c4fd' },
    { label: '骤', v: mix.shower, c: '#6ab0ff' },
    { label: '雷', v: mix.thunder, c: '#8a6aff' }
  ]
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 26 }}>
      {bars.map(b => (
        <div key={b.label} style={{
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: 2
        }}>
          <div style={{
            width: 14,
            height: Math.max(4, Math.round(b.v * 16)),
            background: b.c,
            borderRadius: 3,
            opacity: 0.9,
            boxShadow: `0 0 4px ${b.c}60`
          }} />
          <span style={{ fontSize: 9, color: '#ffffff80' }}>{b.label}</span>
        </div>
      ))}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    inset: 0,
    overflow: 'hidden',
    background: '#0a0a18',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    color: '#fff'
  },
  canvas: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    cursor: 'pointer',
    display: 'block'
  },
  overlay: {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    zIndex: 5
  },
  startHint: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    pointerEvents: 'auto',
    animation: 'pulse 2s ease-in-out infinite'
  },
  startHintInner: {
    padding: '32px 48px',
    borderRadius: 20,
    background: 'rgba(26, 26, 46, 0.6)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(74, 144, 226, 0.3)',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },
  panel: {
    position: 'absolute',
    top: 24,
    left: 24,
    width: 300,
    maxHeight: 'calc(100% - 48px)',
    overflowY: 'auto',
    zIndex: 10,
    padding: '22px 20px',
    borderRadius: 12,
    background: 'rgba(255, 255, 255, 0.08)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
    color: '#fff'
  },
  panelHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
    paddingBottom: 18,
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
  },
  titleIcon: {
    fontSize: 28,
    width: 44,
    height: 44,
    borderRadius: 12,
    background: 'linear-gradient(135deg, rgba(74, 144, 226, 0.3), rgba(161, 196, 253, 0.2))',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid rgba(74, 144, 226, 0.3)'
  },
  titleText: { display: 'flex', flexDirection: 'column' },
  title: {
    fontSize: 20,
    fontWeight: 700,
    margin: 0,
    letterSpacing: 1,
    background: 'linear-gradient(90deg, #a1c4fd, #4a90e2)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text'
  },
  subtitle: {
    fontSize: 10,
    letterSpacing: 2,
    color: '#ffffff50',
    marginTop: 2,
    textTransform: 'uppercase'
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: 1.5,
    color: '#ffffff80',
    textTransform: 'uppercase',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginTop: 18,
    marginBottom: 14
  },
  sectionDot: {
    width: 6, height: 6, borderRadius: '50%',
    background: '#4a90e2',
    boxShadow: '0 0 8px rgba(74, 144, 226, 0.6)'
  },
  sliderGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14
  },
  sliderRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8
  },
  sliderLabelRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  sliderLabel: {
    fontSize: 13,
    fontWeight: 500,
    color: '#ffffffcc'
  },
  sliderPercent: {
    fontSize: 12,
    fontWeight: 700,
    minWidth: 34,
    textAlign: 'right'
  },
  range: {
    width: '100%',
    height: 24,
    margin: 0,
    padding: 0
  },
  intensityBlock: {
    padding: '14px 16px',
    borderRadius: 10,
    background: 'rgba(0, 0, 0, 0.2)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    display: 'flex',
    flexDirection: 'column',
    gap: 10
  },
  intensityLabelRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  stormBtn: {
    width: '100%',
    padding: '14px 18px',
    border: 'none',
    borderRadius: 10,
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    boxShadow: '0 4px 14px rgba(74, 144, 226, 0.35)',
    transition: 'transform 0.1s, box-shadow 0.2s, background 0.3s',
    overflow: 'hidden',
    position: 'relative',
    letterSpacing: 0.5
  },
  footer: {
    marginTop: 22,
    padding: '14px 16px',
    borderRadius: 10,
    background: 'rgba(0, 0, 0, 0.2)',
    border: '1px solid rgba(255, 255, 255, 0.05)'
  },
  footerLine: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
  },
  footerLabel: {
    fontSize: 11,
    color: '#ffffff60',
    letterSpacing: 0.5
  }
}
