import { useRef, useState, useEffect, useCallback } from 'react'
import { createAudioModule, type AudioModule } from './audio-module'
import {
  createVisualModule,
  THEME_NAMES,
  THEME_DOT_COLORS,
  type ThemeName,
} from './visual-module'

const MAX_FILE_SIZE = 20 * 1024 * 1024
const LOW_ENERGY_HISTORY_SIZE = 120

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const previewCanvasRef = useRef<HTMLCanvasElement>(null)
  const audioModRef = useRef<AudioModule | null>(null)
  const visualModRef = useRef(createVisualModule())
  const rafRef = useRef(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const lowEnergyHistory = useRef<number[]>([])

  const [playing, setPlaying] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(80)
  const [theme, setTheme] = useState<ThemeName>('neon')

  const animLoop = useCallback(() => {
    const canvas = canvasRef.current
    const previewCanvas = previewCanvasRef.current
    const am = audioModRef.current
    const vm = visualModRef.current
    if (!canvas || !am || !vm) return

    const energy = am.getEnergy()
    vm.render(energy, canvas)

    lowEnergyHistory.current.push(energy.low)
    if (lowEnergyHistory.current.length > LOW_ENERGY_HISTORY_SIZE) {
      lowEnergyHistory.current.shift()
    }

    if (previewCanvas) {
      const ctx = previewCanvas.getContext('2d')
      if (ctx) {
        const w = previewCanvas.width
        const h = previewCanvas.height
        ctx.clearRect(0, 0, w, h)

        const history = lowEnergyHistory.current
        if (history.length > 1) {
          const themeColor = THEME_DOT_COLORS[vm.getTheme()]
          ctx.strokeStyle = themeColor + 'AA'
          ctx.lineWidth = 2
          ctx.fillStyle = themeColor + '33'

          ctx.beginPath()
          const stepX = w / (LOW_ENERGY_HISTORY_SIZE - 1)
          for (let i = 0; i < history.length; i++) {
            const x = i * stepX
            const y = h - history[i] * h
            if (i === 0) ctx.moveTo(x, y)
            else ctx.lineTo(x, y)
          }
          ctx.stroke()

          ctx.lineTo((history.length - 1) * stepX, h)
          ctx.lineTo(0, h)
          ctx.closePath()
          ctx.fill()
        }
      }
    }

    const ct = am.getCurrentTime()
    const dur = am.getDuration()
    setCurrentTime(ct)
    setDuration(dur)

    rafRef.current = requestAnimationFrame(animLoop)
  }, [])

  useEffect(() => {
    const am = createAudioModule()
    audioModRef.current = am
    am.setVolume(volume)

    am.onTimeUpdate = (ct, dur) => {
      setCurrentTime(ct)
      setDuration(dur)
    }
    am.onEnded = () => {
      setPlaying(false)
    }

    return () => {
      cancelAnimationFrame(rafRef.current)
      am.destroy()
    }
  }, [])

  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current
      if (canvas) {
        const rect = canvas.parentElement!.getBoundingClientRect()
        canvas.width = rect.width * devicePixelRatio
        canvas.height = rect.height * devicePixelRatio
        canvas.style.width = rect.width + 'px'
        canvas.style.height = rect.height + 'px'
        const ctx = canvas.getContext('2d')
        if (ctx) ctx.scale(devicePixelRatio, devicePixelRatio)
      }

      const previewCanvas = previewCanvasRef.current
      if (previewCanvas) {
        const rect2 = previewCanvas.parentElement!.getBoundingClientRect()
        previewCanvas.width = rect2.width * devicePixelRatio
        previewCanvas.height = 20 * devicePixelRatio
        previewCanvas.style.width = rect2.width + 'px'
        previewCanvas.style.height = '20px'
        const pctx = previewCanvas.getContext('2d')
        if (pctx) pctx.scale(devicePixelRatio, devicePixelRatio)
      }
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (playing) {
      rafRef.current = requestAnimationFrame(animLoop)
    } else {
      cancelAnimationFrame(rafRef.current)
    }
    return () => cancelAnimationFrame(rafRef.current)
  }, [playing, animLoop])

  const handleFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      if (file.size > MAX_FILE_SIZE) {
        alert('文件大小超过20MB限制')
        return
      }
      if (!/\.(mp3|wav)$/i.test(file.name)) {
        alert('仅支持MP3或WAV文件')
        return
      }
      const am = audioModRef.current!
      try {
        await am.decodeAndPlay(file)
        am.setVolume(volume)
        setPlaying(true)
        setLoaded(true)
        visualModRef.current.reset()
        lowEnergyHistory.current = []
      } catch {
        alert('音频解析失败')
      }
    },
    [volume]
  )

  const togglePlay = useCallback(() => {
    const am = audioModRef.current!
    if (playing) {
      am.pause()
      setPlaying(false)
    } else {
      am.play()
      setPlaying(true)
    }
  }, [playing])

  const handleStop = useCallback(() => {
    audioModRef.current!.stop()
    setPlaying(false)
    visualModRef.current.reset()
    lowEnergyHistory.current = []
    setCurrentTime(0)
  }, [])

  const handleVolume = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value)
    setVolume(v)
    audioModRef.current?.setVolume(v)
  }, [])

  const handleTheme = useCallback((t: ThemeName) => {
    setTheme(t)
    visualModRef.current.setTheme(t)
  }, [])

  const handleCycleTheme = useCallback(() => {
    visualModRef.current.cycleTheme()
    setTheme(visualModRef.current.getTheme())
  }, [])

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        background: '#0A0A0A',
        overflow: 'hidden',
      }}
    >
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <canvas
          ref={canvasRef}
          style={{ display: 'block', width: '100%', height: '100%' }}
        />

        {!loaded && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
            }}
          >
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                padding: '16px 40px',
                fontSize: 18,
                fontFamily: 'inherit',
                background: '#1A1A1A',
                color: '#00E5FF',
                border: '2px solid #00E5FF',
                borderRadius: 12,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#222'
                e.currentTarget.style.boxShadow = '0 0 20px #00E5FF44'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#1A1A1A'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              上传音频文件
            </button>
          </div>
        )}

        {loaded && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              zIndex: 10,
            }}
          >
            <div
              style={{
                width: '100%',
                height: 6,
                background: '#333',
                position: 'relative',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${progress}%`,
                  background: 'linear-gradient(90deg, #00E5FF, #00B8D4)',
                  transition: 'width 0.1s linear',
                }}
              />
            </div>

            <div
              style={{
                width: '100%',
                height: 20,
                background: '#111',
                borderBottom: '1px solid #222',
              }}
            >
              <canvas
                ref={previewCanvasRef}
                style={{ display: 'block', width: '100%', height: '100%' }}
              />
            </div>

            <div
              style={{
                padding: '4px 12px',
                color: '#999',
                fontSize: 12,
                fontFamily: 'monospace',
                textAlign: 'right',
              }}
            >
              {formatTime(currentTime)}/{formatTime(duration)}
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".mp3,.wav"
          style={{ display: 'none' }}
          onChange={handleFile}
        />
      </div>

      <div
        className="control-bar"
        style={{
          height: 80,
          minHeight: 80,
          background: '#1A1A1A',
          borderTop: '1px solid #333',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 20,
          padding: '0 24px',
          flexShrink: 0,
        }}
      >
        {loaded && (
          <>
            <button
              onClick={togglePlay}
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                border: 'none',
                background: '#222',
                color: '#00E5FF',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16,
                transition: 'background 0.2s ease',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#444')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#222')}
            >
              {playing ? '⏸' : '▶'}
            </button>

            <button
              onClick={handleCycleTheme}
              title="切换主题"
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                border: '2px solid #00E5FF',
                background: '#222',
                color: '#00E5FF',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16,
                transition: 'all 0.2s ease',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#444'
                e.currentTarget.style.boxShadow = '0 0 12px #00E5FF66'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#222'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              🎨
            </button>

            <button
              onClick={handleStop}
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                border: 'none',
                background: '#FF4444',
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16,
                transition: 'background 0.2s ease',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#FF6666')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#FF4444')}
            >
              ⏹
            </button>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                flexShrink: 0,
              }}
            >
              <span style={{ color: '#999', fontSize: 14 }}>🔊</span>
              <input
                type="range"
                min={0}
                max={100}
                value={volume}
                onChange={handleVolume}
                className="volume-slider"
                style={{
                  width: 200,
                  height: 6,
                  accentColor: '#00E5FF',
                  cursor: 'pointer',
                }}
              />
            </div>
          </>
        )}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginLeft: loaded ? 0 : 'auto',
            marginRight: loaded ? 0 : 'auto',
          }}
        >
          {THEME_NAMES.map((t) => (
            <button
              key={t}
              onClick={() => handleTheme(t)}
              style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                border:
                  theme === t
                    ? '3px solid #fff'
                    : '2px solid ' + THEME_DOT_COLORS[t],
                background: THEME_DOT_COLORS[t],
                cursor: 'pointer',
                transition: 'border 1s ease, transform 0.2s ease',
                transform: theme === t ? 'scale(1.2)' : 'scale(1)',
                padding: 0,
                flexShrink: 0,
              }}
            />
          ))}
        </div>

        {!loaded && (
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              padding: '8px 20px',
              fontSize: 14,
              fontFamily: 'inherit',
              background: '#222',
              color: '#00E5FF',
              border: '1px solid #00E5FF',
              borderRadius: 8,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#333'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#222'
            }}
          >
            上传音频
          </button>
        )}
      </div>

      <style>{`
        @media (max-width: 767px) {
          .control-bar {
            height: 100px !important;
            min-height: 100px !important;
            flex-wrap: wrap;
            gap: 10px !important;
            padding: 8px 16px !important;
          }
          .volume-slider {
            width: 120px !important;
          }
          .control-bar > div:last-child {
            gap: 6px !important;
          }
        }
        input[type="range"] {
          -webkit-appearance: none;
          appearance: none;
          background: #333;
          border-radius: 3px;
          outline: none;
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #00E5FF;
          cursor: pointer;
          border: none;
        }
        input[type="range"]::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #00E5FF;
          cursor: pointer;
          border: none;
        }
      `}</style>
    </div>
  )
}
