import { useEffect, useRef, useState } from 'react'
import type { AudioData, UIControls } from '../types'

interface UIPanelProps {
  audioData: AudioData
  controls: UIControls
  onControlsChange: (controls: UIControls) => void
  onRequestMic: () => void
}

export function UIPanel({ audioData, controls, onControlsChange, onRequestMic }: UIPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDragging, setIsDragging] = useState<string | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { frequencyData } = audioData
    const barCount = Math.min(frequencyData.length, 32)
    const barWidth = canvas.width / barCount
    const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0)
    gradient.addColorStop(0, '#00FF88')
    gradient.addColorStop(0.5, '#4169E1')
    gradient.addColorStop(1, '#FF4500')

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    for (let i = 0; i < barCount; i++) {
      const value = frequencyData[i] / 255
      const barHeight = value * canvas.height * 0.9
      const x = i * barWidth + 1
      const y = canvas.height - barHeight

      const hue = (i / barCount) * 60 + 120
      ctx.fillStyle = `hsl(${hue}, 100%, 50%)`
      ctx.fillRect(x, y, barWidth - 2, barHeight)

      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
      ctx.fillRect(x, y, barWidth - 2, 2)
    }

    const volumeBarHeight = 4
    const volumeWidth = (canvas.width - 4) * audioData.volume
    ctx.fillStyle = '#00FF88'
    ctx.fillRect(2, canvas.height - volumeBarHeight - 2, volumeWidth, volumeBarHeight)
  }, [audioData])

  const handleSliderChange = (key: keyof UIControls, value: number) => {
    onControlsChange({
      ...controls,
      [key]: value,
    })
  }

  const sliderStyle = (isActive: boolean) => ({
    transform: isActive ? 'scale(1.2)' : 'scale(1)',
    transition: 'transform 0.2s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  })

  const trackStyle = {
    background: 'rgba(255, 255, 255, 0.4)',
    borderRadius: '3px',
    height: '6px',
    width: '100%',
    position: 'relative' as const,
    cursor: 'pointer',
  }

  return (
    <>
      <div
        style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          zIndex: 10,
          background: 'rgba(26, 26, 46, 0.7)',
          borderRadius: '12px',
          padding: '12px',
          backdropFilter: 'blur(10px)',
        }}
      >
        <div style={{ color: '#00FF88', fontSize: '12px', marginBottom: '8px', fontWeight: 600 }}>
          音频频谱
        </div>
        <canvas
          ref={canvasRef}
          width={180}
          height={80}
          style={{
            display: 'block',
            borderRadius: '6px',
            background: 'rgba(0, 0, 0, 0.3)',
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '10px', color: 'rgba(255,255,255,0.6)' }}>
          <span>音量: {Math.round(audioData.volume * 100)}%</span>
          {audioData.error && (
            <span style={{ color: '#FF6B6B' }}>麦克风不可用</span>
          )}
        </div>
        {audioData.error && !audioData.isActive && (
          <button
            onClick={onRequestMic}
            style={{
              marginTop: '8px',
              padding: '6px 12px',
              background: 'rgba(0, 255, 136, 0.2)',
              border: '1px solid #00FF88',
              borderRadius: '6px',
              color: '#00FF88',
              fontSize: '11px',
              cursor: 'pointer',
              width: '100%',
            }}
          >
            重新授权麦克风
          </button>
        )}
      </div>

      <div
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          zIndex: 10,
          background: 'rgba(26, 26, 46, 0.7)',
          borderRadius: '12px',
          padding: '20px',
          width: '280px',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <h2
          style={{
            color: '#00FF88',
            fontSize: '16px',
            fontWeight: 600,
            margin: 0,
            marginBottom: '20px',
            letterSpacing: '0.5px',
          }}
        >
          控制面板
        </h2>

        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <label style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '13px' }}>
              颜色偏移
            </label>
            <span style={{ color: '#00FF88', fontSize: '12px', fontFamily: 'monospace' }}>
              {controls.colorOffset}°
            </span>
          </div>
          <div
            style={trackStyle}
            onMouseDown={() => setIsDragging('colorOffset')}
            onMouseUp={() => setIsDragging(null)}
            onMouseLeave={() => setIsDragging(null)}
          >
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                height: '100%',
                width: `${(controls.colorOffset / 360) * 100}%`,
                background: `hsl(${controls.colorOffset}, 100%, 50%)`,
                borderRadius: '3px',
                opacity: 0.6,
              }}
            />
            <input
              type="range"
              min="0"
              max="360"
              value={controls.colorOffset}
              onChange={(e) => handleSliderChange('colorOffset', Number(e.target.value))}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                opacity: 0,
                cursor: 'pointer',
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: `calc(${(controls.colorOffset / 360) * 100}% - 10px)`,
                transform: `translateY(-50%) ${isDragging === 'colorOffset' ? 'scale(1.2)' : 'scale(1)'}`,
                transition: 'transform 0.2s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
                width: '20px',
                height: '20px',
                background: '#00FF88',
                borderRadius: '6px',
                boxShadow: '0 0 10px rgba(0, 255, 136, 0.5)',
                pointerEvents: 'none',
              }}
            />
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <label style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '13px' }}>
              粒子长度
            </label>
            <span style={{ color: '#00FF88', fontSize: '12px', fontFamily: 'monospace' }}>
              {controls.particleLength.toFixed(1)}
            </span>
          </div>
          <div
            style={trackStyle}
            onMouseDown={() => setIsDragging('particleLength')}
            onMouseUp={() => setIsDragging(null)}
            onMouseLeave={() => setIsDragging(null)}
          >
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                height: '100%',
                width: `${((controls.particleLength - 0.5) / 1.5) * 100}%`,
                background: 'linear-gradient(90deg, #4169E1, #8A2BE2, #00FF88)',
                borderRadius: '3px',
                opacity: 0.6,
              }}
            />
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={controls.particleLength}
              onChange={(e) => handleSliderChange('particleLength', Number(e.target.value))}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                opacity: 0,
                cursor: 'pointer',
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: `calc(${((controls.particleLength - 0.5) / 1.5) * 100}% - 10px)`,
                transform: `translateY(-50%) ${isDragging === 'particleLength' ? 'scale(1.2)' : 'scale(1)'}`,
                transition: 'transform 0.2s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
                width: '20px',
                height: '20px',
                background: '#00FF88',
                borderRadius: '6px',
                boxShadow: '0 0 10px rgba(0, 255, 136, 0.5)',
                pointerEvents: 'none',
              }}
            />
          </div>
        </div>

        <div style={{ marginBottom: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <label style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '13px' }}>
              粒子数量
            </label>
            <span style={{ color: '#00FF88', fontSize: '12px', fontFamily: 'monospace' }}>
              {controls.particleCount}
            </span>
          </div>
          <div
            style={trackStyle}
            onMouseDown={() => setIsDragging('particleCount')}
            onMouseUp={() => setIsDragging(null)}
            onMouseLeave={() => setIsDragging(null)}
          >
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                height: '100%',
                width: `${((controls.particleCount - 500) / 3500) * 100}%`,
                background: 'linear-gradient(90deg, #4169E1, #00FF88)',
                borderRadius: '3px',
                opacity: 0.6,
              }}
            />
            <input
              type="range"
              min="500"
              max="4000"
              step="100"
              value={controls.particleCount}
              onChange={(e) => handleSliderChange('particleCount', Number(e.target.value))}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                opacity: 0,
                cursor: 'pointer',
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: `calc(${((controls.particleCount - 500) / 3500) * 100}% - 10px)`,
                transform: `translateY(-50%) ${isDragging === 'particleCount' ? 'scale(1.2)' : 'scale(1)'}`,
                transition: 'transform 0.2s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
                width: '20px',
                height: '20px',
                background: '#00FF88',
                borderRadius: '6px',
                boxShadow: '0 0 10px rgba(0, 255, 136, 0.5)',
                pointerEvents: 'none',
              }}
            />
          </div>
        </div>

        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', lineHeight: 1.5, margin: 0 }}>
            💡 提示：拖拽画面旋转视角，滚轮缩放。对麦克风说话可控制粒子密度和速度。
          </p>
        </div>
      </div>
    </>
  )
}
