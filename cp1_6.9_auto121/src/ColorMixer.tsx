import React, { useRef, useEffect, useState, useCallback } from 'react'
import { rgbToHex, getEmotionWords, PaletteColor } from './api'

interface ColorMixerProps {
  onAddToPalette: (color: PaletteColor) => void
}

const CANVAS_WIDTH = 480
const CANVAS_HEIGHT = 320

export default function ColorMixer({ onAddToPalette }: ColorMixerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [rgb, setRgb] = useState<[number, number, number]>([100, 150, 200])
  const [isDragging, setIsDragging] = useState(false)
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null)

  const hex = rgbToHex(...rgb)
  const emotionWord = getEmotionWords(...rgb)

  const drawGradient = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    const gradient = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, 0)
    gradient.addColorStop(0, '#FF3B30')
    gradient.addColorStop(0.5, '#FFD60A')
    gradient.addColorStop(1, '#007AFF')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    const verticalGradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT)
    verticalGradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)')
    verticalGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0)')
    verticalGradient.addColorStop(1, 'rgba(0, 0, 0, 0.3)')
    ctx.fillStyle = verticalGradient
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.06)'
    ctx.lineWidth = 1
    const gridSize = 40
    for (let x = 0; x <= CANVAS_WIDTH; x += gridSize) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, CANVAS_HEIGHT)
      ctx.stroke()
    }
    for (let y = 0; y <= CANVAS_HEIGHT; y += gridSize) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(CANVAS_WIDTH, y)
      ctx.stroke()
    }
  }, [])

  useEffect(() => {
    drawGradient()
  }, [drawGradient])

  const getAverageColor = useCallback((x: number, y: number): [number, number, number] => {
    const canvas = canvasRef.current
    if (!canvas) return [128, 128, 128]
    const ctx = canvas.getContext('2d')
    if (!ctx) return [128, 128, 128]

    const halfSize = 4
    const left = Math.max(0, Math.floor(x) - halfSize)
    const top = Math.max(0, Math.floor(y) - halfSize)
    const width = Math.min(CANVAS_WIDTH - left, 9)
    const height = Math.min(CANVAS_HEIGHT - top, 9)

    try {
      const imageData = ctx.getImageData(left, top, width, height).data
      let r = 0, g = 0, b = 0, count = 0

      for (let i = 0; i < imageData.length; i += 4) {
        r += imageData[i]
        g += imageData[i + 1]
        b += imageData[i + 2]
        count++
      }

      if (count > 0) {
        return [
          Math.round(r / count),
          Math.round(g / count),
          Math.round(b / count),
        ]
      }
    } catch (e) {
      // ignore
    }
    return [128, 128, 128]
  }, [])

  const handleCanvasInteraction = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const scaleX = CANVAS_WIDTH / rect.width
    const scaleY = CANVAS_HEIGHT / rect.height
    const x = (clientX - rect.left) * scaleX
    const y = (clientY - rect.top) * scaleY

    const clampedX = Math.max(0, Math.min(CANVAS_WIDTH - 1, x))
    const clampedY = Math.max(0, Math.min(CANVAS_HEIGHT - 1, y))

    setCursorPos({ x: clampedX, y: clampedY })
    const colors = getAverageColor(clampedX, clampedY)
    setRgb(colors)
  }, [getAverageColor])

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    handleCanvasInteraction(e.clientX, e.clientY)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    handleCanvasInteraction(e.clientX, e.clientY)
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleMouseLeave = () => {
    setIsDragging(false)
  }

  const handleSliderChange = (channel: 0 | 1 | 2, value: number) => {
    setRgb(prev => {
      const next = [...prev] as [number, number, number]
      next[channel] = value
      return next
    })
  }

  const handleAddToPalette = () => {
    onAddToPalette({ hex, emotion: emotionWord })
  }

  const styles: Record<string, React.CSSProperties> = {
    mixerContainer: {
      display: 'flex',
      flexDirection: 'column',
      gap: 24,
    },
    canvasRow: {
      display: 'flex',
      gap: 24,
      alignItems: 'flex-start',
      flexWrap: 'wrap',
    },
    canvasWrapper: {
      position: 'relative',
      borderRadius: 12,
      overflow: 'hidden',
      cursor: 'crosshair',
      userSelect: 'none',
    },
    canvas: {
      display: 'block',
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      maxWidth: '100%',
    },
    cursorMarker: {
      position: 'absolute',
      width: 20,
      height: 20,
      border: '2px solid white',
      borderRadius: '50%',
      transform: 'translate(-50%, -50%)',
      pointerEvents: 'none',
      boxShadow: '0 0 0 1px rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.2)',
    },
    previewSection: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 16,
      minWidth: 160,
    },
    colorCircle: {
      width: 60,
      height: 60,
      borderRadius: '50%',
      backgroundColor: hex,
      boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
      transition: 'background-color 0.1s ease',
      border: '3px solid white',
    },
    colorInfo: {
      textAlign: 'center',
    },
    hexCode: {
      fontSize: 18,
      fontWeight: 600,
      fontFamily: 'monospace',
      color: '#2C3E50',
      marginBottom: 4,
    },
    emotionTag: {
      display: 'inline-block',
      padding: '4px 12px',
      backgroundColor: hex + '33',
      color: '#333',
      borderRadius: 20,
      fontSize: 13,
      fontWeight: 500,
    },
    slidersSection: {
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
    },
    sliderGroup: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
    },
    sliderLabel: {
      width: 24,
      fontSize: 14,
      fontWeight: 600,
      color: '#5B6C7F',
    },
    slider: {
      flex: 1,
      height: 8,
      appearance: 'none' as any,
      borderRadius: 4,
      outline: 'none',
      cursor: 'pointer',
    },
    sliderValue: {
      width: 40,
      textAlign: 'right',
      fontSize: 13,
      fontFamily: 'monospace',
      color: '#666',
    },
    actionRow: {
      display: 'flex',
      justifyContent: 'center',
    },
    hint: {
      fontSize: 13,
      color: '#888',
      textAlign: 'center',
      marginTop: 8,
    },
  }

  return (
    <div style={styles.mixerContainer}>
      <div style={styles.canvasRow}>
        <div style={styles.canvasWrapper}>
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            style={styles.canvas}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
          />
          {cursorPos && (
            <div
              style={{
                ...styles.cursorMarker,
                left: `${(cursorPos.x / CANVAS_WIDTH) * 100}%`,
                top: `${(cursorPos.y / CANVAS_HEIGHT) * 100}%`,
                backgroundColor: hex,
              }}
            />
          )}
        </div>

        <div style={styles.previewSection}>
          <div style={styles.colorCircle} />
          <div style={styles.colorInfo}>
            <div style={styles.hexCode}>{hex}</div>
            <div style={styles.emotionTag}>{emotionWord}</div>
          </div>
        </div>
      </div>

      <div style={styles.slidersSection}>
        {(['R', 'G', 'B'] as const).map((label, i) => (
          <div key={label} style={styles.sliderGroup}>
            <span style={{ ...styles.sliderLabel, color: label === 'R' ? '#E74C3C' : label === 'G' ? '#27AE60' : '#3498DB' }}>
              {label}
            </span>
            <input
              type="range"
              min={0}
              max={255}
              value={rgb[i]}
              onChange={e => handleSliderChange(i as 0 | 1 | 2, parseInt(e.target.value))}
              style={{
                ...styles.slider,
                background: label === 'R'
                  ? `linear-gradient(to right, #000, rgb(${rgb[i]},0,0), #FF0000)`
                  : label === 'G'
                  ? `linear-gradient(to right, #000, rgb(0,${rgb[i]},0), #00FF00)`
                  : `linear-gradient(to right, #000, rgb(0,0,${rgb[i]}), #0000FF)`,
              }}
            />
            <span style={styles.sliderValue}>{rgb[i]}</span>
          </div>
        ))}
      </div>

      <div style={styles.actionRow}>
        <button className="btn btn-primary" onClick={handleAddToPalette}>
          ➕ 添加到调色板
        </button>
      </div>
      <p style={styles.hint}>提示：按住鼠标左键在上方渐变区域拖拽，松开后提取颜色</p>
    </div>
  )
}
