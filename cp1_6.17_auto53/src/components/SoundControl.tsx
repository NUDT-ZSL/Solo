import { useRef, useEffect, useState, useCallback } from 'react'
import { useGameStore } from '../GameLogic'
import type { WaveType } from '../types'

const WAVE_TYPES: { type: WaveType; label: string; icon: string }[] = [
  { type: 'sine', label: '正弦波', icon: '∿' },
  { type: 'square', label: '方波', icon: '⊓' },
  { type: 'triangle', label: '三角波', icon: '△' },
]

const WAVE_COLORS: Record<WaveType, string> = {
  sine: '#00E5FF',
  square: '#FF4081',
  triangle: '#76FF03',
}

export default function SoundControl() {
  const currentFrequency = useGameStore(s => s.currentFrequency)
  const currentWaveType = useGameStore(s => s.currentWaveType)
  const isWaveActive = useGameStore(s => s.isWaveActive)
  const isPaused = useGameStore(s => s.isPaused)
  const setFrequency = useGameStore(s => s.setFrequency)
  const setWaveType = useGameStore(s => s.setWaveType)
  const emitWave = useGameStore(s => s.emitWave)
  const stopWave = useGameStore(s => s.stopWave)
  const soundEngine = useGameStore(s => s.soundEngine)

  const waveformCanvasRef = useRef<HTMLCanvasElement>(null)
  const spectrumCanvasRef = useRef<HTMLCanvasElement>(null)
  const [analyzeInterval, setAnalyzeInterval] = useState<number | null>(null)

  const updateVisualizations = useCallback(() => {
    if (!soundEngine) return

    const waveformCanvas = waveformCanvasRef.current
    const spectrumCanvas = spectrumCanvasRef.current

    if (waveformCanvas) {
      const ctx = waveformCanvas.getContext('2d')
      if (ctx) {
        const data = soundEngine.getWaveformData()
        ctx.fillStyle = '#1A1C3B'
        ctx.fillRect(0, 0, waveformCanvas.width, waveformCanvas.height)

        if (data.length > 0) {
          ctx.strokeStyle = WAVE_COLORS[currentWaveType]
          ctx.lineWidth = 2
          ctx.beginPath()
          const sliceWidth = waveformCanvas.width / data.length
          for (let i = 0; i < data.length; i++) {
            const v = data[i] / 128.0
            const y = (v * waveformCanvas.height) / 2
            if (i === 0) ctx.moveTo(0, y)
            else ctx.lineTo(i * sliceWidth, y)
          }
          ctx.stroke()
        }
      }
    }

    if (spectrumCanvas) {
      const ctx = spectrumCanvas.getContext('2d')
      if (ctx) {
        const data = soundEngine.analyze()
        ctx.fillStyle = '#1A1C3B'
        ctx.fillRect(0, 0, spectrumCanvas.width, spectrumCanvas.height)

        if (data.length > 0) {
          const barCount = Math.min(64, data.length)
          const barWidth = spectrumCanvas.width / barCount
          for (let i = 0; i < barCount; i++) {
            const barHeight = (data[i] / 255) * spectrumCanvas.height
            const hue = (i / barCount) * 180 + 180
            ctx.fillStyle = `hsl(${hue}, 80%, 60%)`
            ctx.fillRect(
              i * barWidth,
              spectrumCanvas.height - barHeight,
              barWidth - 1,
              barHeight
            )
          }
        }
      }
    }
  }, [soundEngine, currentWaveType])

  useEffect(() => {
    if (isWaveActive && !isPaused) {
      const id = window.setInterval(updateVisualizations, 50)
      setAnalyzeInterval(id)
      return () => {
        clearInterval(id)
        setAnalyzeInterval(null)
      }
    } else {
      if (analyzeInterval) {
        clearInterval(analyzeInterval)
        setAnalyzeInterval(null)
      }
    }
  }, [isWaveActive, isPaused, updateVisualizations])

  const handleFrequencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFrequency(Number(e.target.value))
  }

  const handleWaveTypeChange = (type: WaveType) => {
    setWaveType(type)
  }

  const handleEmit = () => {
    if (isWaveActive) {
      stopWave()
    } else {
      emitWave()
    }
  }

  return (
    <div style={{
      background: 'rgba(30, 30, 46, 0.85)',
      borderRadius: 12,
      padding: 16,
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      flexWrap: 'wrap',
      justifyContent: 'center',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        <label style={{ color: '#FFFFFF', fontSize: 11, fontFamily: 'sans-serif' }}>
          频率: {currentFrequency}Hz
        </label>
        <input
          type="range"
          min={200}
          max={2000}
          step={10}
          value={currentFrequency}
          onChange={handleFrequencyChange}
          style={{
            width: 160,
            accentColor: WAVE_COLORS[currentWaveType],
            cursor: 'pointer',
          }}
        />
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        {WAVE_TYPES.map(wt => (
          <button
            key={wt.type}
            onClick={() => handleWaveTypeChange(wt.type)}
            style={{
              background: currentWaveType === wt.type
                ? WAVE_COLORS[wt.type]
                : 'rgba(255,255,255,0.1)',
              color: currentWaveType === wt.type ? '#0A0E27' : '#FFFFFF',
              border: `1px solid ${WAVE_COLORS[wt.type]}`,
              borderRadius: 8,
              padding: '6px 12px',
              cursor: 'pointer',
              fontSize: 14,
              fontFamily: 'sans-serif',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
            onMouseEnter={e => {
              (e.target as HTMLElement).style.transform = 'scale(1.1)'
              ;(e.target as HTMLElement).style.boxShadow = `0 0 8px ${WAVE_COLORS[wt.type]}40`
            }}
            onMouseLeave={e => {
              (e.target as HTMLElement).style.transform = 'scale(1)'
              ;(e.target as HTMLElement).style.boxShadow = 'none'
            }}
          >
            {wt.icon} {wt.label}
          </button>
        ))}
      </div>

      <button
        onClick={handleEmit}
        style={{
          background: isWaveActive ? '#FF4081' : WAVE_COLORS[currentWaveType],
          color: '#0A0E27',
          border: 'none',
          borderRadius: 8,
          padding: '8px 20px',
          cursor: 'pointer',
          fontSize: 14,
          fontWeight: 'bold',
          fontFamily: 'sans-serif',
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}
        onMouseEnter={e => {
          (e.target as HTMLElement).style.transform = 'scale(1.1)'
          ;(e.target as HTMLElement).style.boxShadow = '0 0 12px rgba(255,255,255,0.3)'
        }}
        onMouseLeave={e => {
          (e.target as HTMLElement).style.transform = 'scale(1)'
          ;(e.target as HTMLElement).style.boxShadow = 'none'
        }}
      >
        {isWaveActive ? '■ 停止' : '▶ 发射'}
      </button>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <span style={{ color: '#888', fontSize: 9, fontFamily: 'sans-serif' }}>波形</span>
          <canvas
            ref={waveformCanvasRef}
            width={120}
            height={40}
            style={{
              background: '#1A1C3B',
              borderRadius: 4,
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <span style={{ color: '#888', fontSize: 9, fontFamily: 'sans-serif' }}>频谱</span>
          <canvas
            ref={spectrumCanvasRef}
            width={120}
            height={40}
            style={{
              background: '#1A1C3B',
              borderRadius: 4,
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          />
        </div>
      </div>
    </div>
  )
}
