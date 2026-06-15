import { useRef, useEffect, useCallback } from 'react'
import type { BeatPoint } from './utils/types'

interface WaveformCanvasProps {
  audioBuffer: AudioBuffer | null
  currentTime: number
  duration: number
  beatPoints: BeatPoint[]
  onBeatAdd: (time: number) => void
  onBeatRemove: (index: number) => void
  onSeek: (time: number) => void
  isPlaying: boolean
  waveformColor?: string
  backgroundColor?: string
  progressColor?: string
  showProgressBar?: boolean
  height?: number
}

const BEAT_CLICK_THRESHOLD = 5

export default function WaveformCanvas({
  audioBuffer,
  currentTime,
  duration,
  beatPoints,
  onBeatAdd,
  onBeatRemove,
  onSeek,
  isPlaying,
  waveformColor = '#6C63FF',
  backgroundColor = '#1A1A2E',
  progressColor = '#FF6584',
  showProgressBar = true,
  height = 200
}: WaveformCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number>(0)
  const isDraggingRef = useRef(false)

  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const dpr = window.devicePixelRatio || 1
    const displayWidth = container.clientWidth
    const displayHeight = height

    canvas.width = displayWidth * dpr
    canvas.height = displayHeight * dpr
    canvas.style.width = displayWidth + 'px'
    canvas.style.height = displayHeight + 'px'

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.scale(dpr, dpr)

    ctx.fillStyle = backgroundColor
    ctx.fillRect(0, 0, displayWidth, displayHeight)

    if (!audioBuffer || duration === 0) return

    const channelData = audioBuffer.getChannelData(0)
    const samplesPerPixel = Math.floor(channelData.length / displayWidth)

    ctx.fillStyle = waveformColor
    ctx.beginPath()

    const centerY = displayHeight / 2

    for (let x = 0; x < displayWidth; x++) {
      const startSample = x * samplesPerPixel
      let min = 1
      let max = -1

      for (let i = 0; i < samplesPerPixel; i++) {
        const sample = channelData[startSample + i]
        if (sample < min) min = sample
        if (sample > max) max = sample
      }

      const yMin = centerY + min * centerY * 0.9
      const yMax = centerY + max * centerY * 0.9

      ctx.moveTo(x, yMin)
      ctx.lineTo(x, yMax)
    }

    ctx.strokeStyle = waveformColor
    ctx.lineWidth = 1
    ctx.stroke()

    const progressX = duration > 0 ? (currentTime / duration) * displayWidth : 0

    if (showProgressBar) {
      ctx.fillStyle = progressColor
      ctx.fillRect(0, displayHeight - 4, progressX, 4)

      ctx.fillStyle = 'rgba(255, 101, 132, 0.3)'
      ctx.fillRect(progressX, displayHeight - 4, displayWidth - progressX, 4)
    }

    for (const point of beatPoints) {
      const x = duration > 0 ? (point.time / duration) * displayWidth : 0
      ctx.strokeStyle = point.color
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(x, 10)
      ctx.lineTo(x, displayHeight - 10)
      ctx.stroke()

      ctx.beginPath()
      ctx.arc(x, 10, 5, 0, Math.PI * 2)
      ctx.fillStyle = point.color
      ctx.fill()
    }
  }, [audioBuffer, currentTime, duration, beatPoints, waveformColor, backgroundColor, progressColor, showProgressBar, height])

  const findBeatAtPosition = useCallback((clientX: number): number => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container || duration === 0) return -1

    const rect = canvas.getBoundingClientRect()
    const x = clientX - rect.left

    for (let i = 0; i < beatPoints.length; i++) {
      const point = beatPoints[i]
      const pointX = (point.time / duration) * rect.width
      if (Math.abs(x - pointX) <= BEAT_CLICK_THRESHOLD) {
        return i
      }
    }
    return -1
  }, [beatPoints, duration])

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas || duration === 0) return

    const beatIndex = findBeatAtPosition(e.clientX)
    if (beatIndex !== -1) {
      onBeatRemove(beatIndex)
      return
    }

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const time = (x / rect.width) * duration
    onBeatAdd(time)
  }, [duration, findBeatAtPosition, onBeatAdd, onBeatRemove])

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas || !showProgressBar) return

    const rect = canvas.getBoundingClientRect()
    const y = e.clientY - rect.top

    if (y >= height - 20) {
      isDraggingRef.current = true
      const x = e.clientX - rect.left
      const time = (x / rect.width) * duration
      onSeek(time)
    }
  }, [duration, height, onSeek, showProgressBar])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) return

    const canvas = canvasRef.current
    if (!canvas || duration === 0) return

    const rect = canvas.getBoundingClientRect()
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width))
    const time = (x / rect.width) * duration
    onSeek(time)
  }, [duration, onSeek])

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false
  }, [])

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      isDraggingRef.current = false
    }
    window.addEventListener('mouseup', handleGlobalMouseUp)
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp)
  }, [])

  useEffect(() => {
    let lastTime = 0
    const minFrameTime = 1000 / 60

    const animate = (timestamp: number) => {
      if (timestamp - lastTime >= minFrameTime) {
        drawWaveform()
        lastTime = timestamp
      }
      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [drawWaveform])

  useEffect(() => {
    const handleResize = () => drawWaveform()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [drawWaveform])

  return (
    <div ref={containerRef} style={{ width: '100%', position: 'relative' }}>
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{
          display: 'block',
          cursor: 'crosshair',
          borderRadius: '8px'
        }}
      />
    </div>
  )
}
