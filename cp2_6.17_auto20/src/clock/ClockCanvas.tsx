import { useEffect, useRef, useState, useCallback } from 'react'
import {
  getCurrentEmotionValue,
  generateWaveformSamples,
  getEmotionColor,
  getTimeSliceColor,
  getAmbientSoundType,
} from './emotionData'
import './ClockCanvas.css'

const CANVAS_SIZE = 320
const CENTER = CANVAS_SIZE / 2
const RADIUS = 140
const SLICE_COUNT = 96
const WAVEFORM_SAMPLES = 12

export default function ClockCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)
  const waveformPhaseRef = useRef<number>(0)
  const emotionValueRef = useRef<number>(50)
  const [isHovering, setIsHovering] = useState(false)
  const [currentSound, setCurrentSound] = useState('')
  const lastEmotionUpdateRef = useRef<number>(0)

  const drawClock = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

    for (let i = 0; i < SLICE_COUNT; i++) {
      const startAngle = (i / SLICE_COUNT) * Math.PI * 2 - Math.PI / 2
      const endAngle = ((i + 1) / SLICE_COUNT) * Math.PI * 2 - Math.PI / 2

      const hourSegment = i / 4
      const color = getTimeSliceColor(hourSegment, hourSegment + 0.25)

      ctx.beginPath()
      ctx.moveTo(CENTER, CENTER)
      ctx.arc(CENTER, CENTER, RADIUS, startAngle, endAngle)
      ctx.closePath()
      ctx.fillStyle = color
      ctx.fill()

      ctx.beginPath()
      ctx.moveTo(CENTER, CENTER)
      ctx.arc(CENTER, CENTER, RADIUS, startAngle, startAngle)
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)'
      ctx.lineWidth = 1
      ctx.stroke()
    }

    ctx.beginPath()
    ctx.arc(CENTER, CENTER, RADIUS * 0.65, 0, Math.PI * 2)
    ctx.fillStyle = '#0f172a'
    ctx.fill()

    const now = new Date()
    const hours = now.getHours()
    const minutes = now.getMinutes()
    const seconds = now.getSeconds()
    const milliseconds = now.getMilliseconds()

    const totalMinutes = hours * 60 + minutes + seconds / 60 + milliseconds / 60000
    const angle = (totalMinutes / 1440) * Math.PI * 2 - Math.PI / 2

    const emotionValue = emotionValueRef.current
    const waveformSamples = generateWaveformSamples(emotionValue, WAVEFORM_SAMPLES)

    const pointerLength = RADIUS * 0.55
    const waveAmplitude = 12 + (emotionValue / 100) * 15

    ctx.save()
    ctx.translate(CENTER, CENTER)
    ctx.rotate(angle + Math.PI / 2)

    ctx.beginPath()
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    const startX = 0
    const startY = 0
    const endX = 0
    const endY = -pointerLength

    for (let i = 0; i <= WAVEFORM_SAMPLES; i++) {
      const t = i / WAVEFORM_SAMPLES
      const y = startY + (endY - startY) * t

      let sampleIndex = Math.floor(i)
      if (sampleIndex >= WAVEFORM_SAMPLES) sampleIndex = WAVEFORM_SAMPLES - 1
      const sample = waveformSamples[sampleIndex]

      const wavePhase = waveformPhaseRef.current + t * Math.PI * 2
      const waveOffset = Math.sin(wavePhase) * sample * waveAmplitude * t

      const x = startX + waveOffset + (endX - startX) * t

      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    }

    ctx.stroke()

    const glowColor = getEmotionColor(emotionValue)
    const glowRadius = 8

    const rgbMatch = glowColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
    const r = rgbMatch ? parseInt(rgbMatch[1]) : 0
    const g = rgbMatch ? parseInt(rgbMatch[2]) : 210
    const b = rgbMatch ? parseInt(rgbMatch[3]) : 255

    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, glowRadius * 2.5)
    gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 1)`)
    gradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, 0.5)`)
    gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`)

    ctx.beginPath()
    ctx.arc(0, 0, glowRadius * 2.5, 0, Math.PI * 2)
    ctx.fillStyle = gradient
    ctx.fill()

    ctx.beginPath()
    ctx.arc(0, 0, glowRadius, 0, Math.PI * 2)
    ctx.fillStyle = glowColor
    ctx.fill()

    ctx.beginPath()
    ctx.arc(0, 0, glowRadius * 0.5, 0, Math.PI * 2)
    ctx.fillStyle = '#ffffff'
    ctx.fill()

    ctx.restore()

    const outerGradient = ctx.createRadialGradient(
      CENTER, CENTER, RADIUS - 5,
      CENTER, CENTER, RADIUS + 10
    )
    outerGradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)')
    outerGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.05)')
    outerGradient.addColorStop(1, 'transparent')

    ctx.beginPath()
    ctx.arc(CENTER, CENTER, RADIUS + 10, 0, Math.PI * 2)
    ctx.fillStyle = outerGradient
    ctx.fill()

    ctx.font = 'bold 11px -apple-system, sans-serif'
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    const hourMarkers = [0, 3, 6, 9, 12, 15, 18, 21]
    hourMarkers.forEach((hour) => {
      const markerAngle = (hour / 24) * Math.PI * 2 - Math.PI / 2
      const x = CENTER + Math.cos(markerAngle) * (RADIUS - 15)
      const y = CENTER + Math.sin(markerAngle) * (RADIUS - 15)
      ctx.fillText(hour.toString().padStart(2, '0'), x, y)
    })
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const animate = (timestamp: number) => {
      if (timestamp - lastEmotionUpdateRef.current > 5000) {
        emotionValueRef.current = getCurrentEmotionValue()
        lastEmotionUpdateRef.current = timestamp
      }

      waveformPhaseRef.current += 0.08

      drawClock(ctx)

      animationRef.current = requestAnimationFrame(animate)
    }

    emotionValueRef.current = getCurrentEmotionValue()
    lastEmotionUpdateRef.current = performance.now()

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(animationRef.current)
    }
  }, [drawClock])

  const handleMouseEnter = () => {
    setIsHovering(true)
    const hour = new Date().getHours()
    const soundType = getAmbientSoundType(hour)
    const soundNames: Record<string, string> = {
      morning_birds: '清晨鸟鸣',
      morning_chirp: '晨间啁啾',
      afternoon_cicada: '午后蝉鸣',
      evening_wind: '黄昏晚风',
      night_cricket: '深夜虫鸣',
      night_rain: '深夜雨声',
    }
    setCurrentSound(soundNames[soundType] || soundType)
  }

  const handleMouseLeave = () => {
    setIsHovering(false)
    setCurrentSound('')
  }

  return (
    <div className="clock-canvas-container">
      <canvas
        ref={canvasRef}
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
        className={`clock-canvas ${isHovering ? 'hovering' : ''}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      />
      {isHovering && currentSound && (
        <div className="sound-indicator">
          <span className="sound-icon">🔊</span>
          <span className="sound-name">{currentSound}</span>
        </div>
      )}
    </div>
  )
}
