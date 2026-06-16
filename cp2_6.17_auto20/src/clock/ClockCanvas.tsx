import { useEffect, useRef, useState, useCallback } from 'react'
import {
  getCurrentEmotionValue,
  generateWaveformSamples,
  getEmotionColorRgb,
  getTimeColorAtHour,
  getAmbientSoundType,
} from './emotionData'
import './ClockCanvas.css'

const CANVAS_SIZE = 320
const CENTER = CANVAS_SIZE / 2
const RADIUS = 140
const SLICE_COUNT = 96
const WAVEFORM_SAMPLES = 24
const GLOW_RADIUS = 12
const SUBSTEP_PER_SLICE = 8

export default function ClockCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)
  const waveformPhaseRef = useRef<number>(0)
  const emotionValueRef = useRef<number>(50)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const noiseNodeRef = useRef<AudioBufferSourceNode | null>(null)
  const gainNodeRef = useRef<GainNode | null>(null)
  const [isHovering, setIsHovering] = useState(false)
  const [currentSound, setCurrentSound] = useState('')
  const lastEmotionUpdateRef = useRef<number>(0)

  const drawClock = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

    for (let i = 0; i < SLICE_COUNT; i++) {
      const startAngle = (i / SLICE_COUNT) * Math.PI * 2 - Math.PI / 2
      const endAngle = ((i + 1) / SLICE_COUNT) * Math.PI * 2 - Math.PI / 2

      const startHour = i / 4
      const endHour = (i + 1) / 4

      const startColor = getTimeColorAtHour(startHour)
      const endColor = getTimeColorAtHour(endHour)

      const x1 = CENTER + Math.cos(startAngle) * RADIUS
      const y1 = CENTER + Math.sin(startAngle) * RADIUS
      const x2 = CENTER + Math.cos(endAngle) * RADIUS
      const y2 = CENTER + Math.sin(endAngle) * RADIUS

      const gradient = ctx.createLinearGradient(x1, y1, x2, y2)
      gradient.addColorStop(
        0,
        `rgb(${startColor.r}, ${startColor.g}, ${startColor.b})`
      )
      gradient.addColorStop(
        1,
        `rgb(${endColor.r}, ${endColor.g}, ${endColor.b})`
      )

      ctx.beginPath()
      ctx.moveTo(CENTER, CENTER)
      ctx.arc(CENTER, CENTER, RADIUS, startAngle, endAngle)
      ctx.closePath()
      ctx.fillStyle = gradient
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
    const waveformSamples = generateWaveformSamples(
      emotionValue,
      WAVEFORM_SAMPLES,
      waveformPhaseRef.current
    )

    const pointerLength = RADIUS * 0.55
    const baseAmplitude = 8 + (emotionValue / 100) * 18
    const sineModulation = Math.sin(waveformPhaseRef.current * 0.5) * 4
    const waveAmplitude = baseAmplitude + sineModulation

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

      const waveOffset = sample * waveAmplitude * t

      const x = startX + waveOffset + (endX - startX) * t

      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    }

    ctx.stroke()

    const glowColor = getEmotionColorRgb(emotionValue)
    const glowOuterRadius = GLOW_RADIUS * 3

    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, glowOuterRadius)
    gradient.addColorStop(0, `rgba(${glowColor.r}, ${glowColor.g}, ${glowColor.b}, 1)`)
    gradient.addColorStop(0.4, `rgba(${glowColor.r}, ${glowColor.g}, ${glowColor.b}, 0.5)`)
    gradient.addColorStop(1, `rgba(${glowColor.r}, ${glowColor.g}, ${glowColor.b}, 0)`)

    ctx.beginPath()
    ctx.arc(0, 0, glowOuterRadius, 0, Math.PI * 2)
    ctx.fillStyle = gradient
    ctx.fill()

    ctx.beginPath()
    ctx.arc(0, 0, GLOW_RADIUS, 0, Math.PI * 2)
    ctx.fillStyle = `rgb(${glowColor.r}, ${glowColor.g}, ${glowColor.b})`
    ctx.fill()

    ctx.beginPath()
    ctx.arc(0, 0, GLOW_RADIUS * 0.5, 0, Math.PI * 2)
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

  const startAmbientSound = useCallback(() => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
      }

      const audioCtx = audioCtxRef.current
      if (audioCtx.state === 'suspended') {
        audioCtx.resume()
      }

      const bufferSize = 2 * audioCtx.sampleRate
      const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate)
      const output = noiseBuffer.getChannelData(0)

      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * 0.3
      }

      if (noiseNodeRef.current) {
        noiseNodeRef.current.stop()
      }

      const noiseNode = audioCtx.createBufferSource()
      noiseNode.buffer = noiseBuffer
      noiseNode.loop = true

      const biquadFilter = audioCtx.createBiquadFilter()
      biquadFilter.type = 'lowpass'
      biquadFilter.frequency.value = 800

      const gainNode = audioCtx.createGain()
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime)
      gainNode.gain.linearRampToValueAtTime(0.08, audioCtx.currentTime + 0.3)

      noiseNode.connect(biquadFilter)
      biquadFilter.connect(gainNode)
      gainNode.connect(audioCtx.destination)

      noiseNode.start()

      noiseNodeRef.current = noiseNode
      gainNodeRef.current = gainNode
    } catch (e) {
      console.warn('Audio playback failed:', e)
    }
  }, [])

  const stopAmbientSound = useCallback(() => {
    if (gainNodeRef.current && audioCtxRef.current) {
      const audioCtx = audioCtxRef.current
      gainNodeRef.current.gain.cancelScheduledValues(audioCtx.currentTime)
      gainNodeRef.current.gain.setValueAtTime(gainNodeRef.current.gain.value, audioCtx.currentTime)
      gainNodeRef.current.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.2)
    }

    setTimeout(() => {
      if (noiseNodeRef.current) {
        try {
          noiseNodeRef.current.stop()
        } catch (e) {
          // ignore
        }
        noiseNodeRef.current = null
      }
      gainNodeRef.current = null
    }, 300)
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

      waveformPhaseRef.current += 0.05

      drawClock(ctx)

      animationRef.current = requestAnimationFrame(animate)
    }

    emotionValueRef.current = getCurrentEmotionValue()
    lastEmotionUpdateRef.current = performance.now()

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(animationRef.current)
      stopAmbientSound()
      if (audioCtxRef.current) {
        audioCtxRef.current.close()
      }
    }
  }, [drawClock, stopAmbientSound])

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
    startAmbientSound()
  }

  const handleMouseLeave = () => {
    setIsHovering(false)
    setCurrentSound('')
    stopAmbientSound()
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
