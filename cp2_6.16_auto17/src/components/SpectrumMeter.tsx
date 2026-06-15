import { useEffect, useRef } from 'react'
import { interpolateColor, withAlpha } from '../utils/color'

interface SpectrumMeterProps {
  spectrumData: Uint8Array | null
}

export function SpectrumMeter({ spectrumData }: SpectrumMeterProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isVisibleRef = useRef(true)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = 240
    canvas.height = 60

    const colorStart = '#00e676'
    const colorEnd = '#00bcd4'

    const draw = () => {
      if (!isVisibleRef.current || !spectrumData) return

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const barCount = 32
      const barWidth = canvas.width / barCount - 2
      const barGap = 2

      for (let i = 0; i < barCount; i++) {
        const dataIndex = Math.floor(i * (spectrumData.length / barCount))
        const value = spectrumData[dataIndex] || 0
        const barHeight = (value / 255) * (canvas.height - 8) + 4

        const t = i / barCount
        const color = interpolateColor(colorStart, colorEnd, t)
        const gradient = ctx.createLinearGradient(0, canvas.height - barHeight, 0, canvas.height)
        gradient.addColorStop(0, color)
        gradient.addColorStop(1, withAlpha(color, 0.25))

        ctx.fillStyle = gradient
        ctx.fillRect(
          i * (barWidth + barGap),
          canvas.height - barHeight,
          barWidth,
          barHeight
        )
      }
    }

    draw()
  }, [spectrumData])

  return (
    <div
      style={{
        position: 'absolute',
        top: '24px',
        right: '24px',
        width: '240px',
        height: '60px',
        borderRadius: '8px',
        background: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(8px)',
        padding: '4px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block'
        }}
      />
    </div>
  )
}
