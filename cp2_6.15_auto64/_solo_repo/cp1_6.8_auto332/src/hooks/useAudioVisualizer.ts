import { useRef, useCallback, useEffect } from 'react'

interface UseAudioVisualizerOptions {
  fftSize?: number
  smoothingTimeConstant?: number
}

export function useAudioVisualizer(options: UseAudioVisualizerOptions = {}) {
  const { fftSize = 256, smoothingTimeConstant = 0.8 } = options
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number>(0)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null)

  const connectAudio = useCallback((audioElement: HTMLAudioElement) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext()
    }
    const ctx = audioContextRef.current

    if (sourceRef.current) {
      try { sourceRef.current.disconnect() } catch { /* noop */ }
    }

    try {
      const source = ctx.createMediaElementSource(audioElement)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = fftSize
      analyser.smoothingTimeConstant = smoothingTimeConstant
      source.connect(analyser)
      analyser.connect(ctx.destination)
      analyserRef.current = analyser
      sourceRef.current = source
    } catch {
      const analyser = ctx.createAnalyser()
      analyser.fftSize = fftSize
      analyser.smoothingTimeConstant = smoothingTimeConstant
      analyserRef.current = analyser
    }
  }, [fftSize, smoothingTimeConstant])

  const startVisualization = useCallback(() => {
    const canvas = canvasRef.current
    const analyser = analyserRef.current
    if (!canvas || !analyser) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw)
      analyser.getByteFrequencyData(dataArray)

      const width = canvas.width
      const height = canvas.height
      ctx.clearRect(0, 0, width, height)

      const centerX = width / 2
      const centerY = height / 2
      const maxRadius = Math.min(centerX, centerY) * 0.85
      const bars = bufferLength
      const angleStep = (Math.PI * 2) / bars

      for (let i = 0; i < bars; i++) {
        const angle = i * angleStep - Math.PI / 2
        const value = dataArray[i] / 255
        const barHeight = value * maxRadius * 0.6

        const innerRadius = maxRadius * 0.3
        const outerRadius = innerRadius + barHeight

        const x1 = centerX + Math.cos(angle) * innerRadius
        const y1 = centerY + Math.sin(angle) * innerRadius
        const x2 = centerX + Math.cos(angle) * outerRadius
        const y2 = centerY + Math.sin(angle) * outerRadius

        const gradient = ctx.createLinearGradient(x1, y1, x2, y2)
        gradient.addColorStop(0, `rgba(125, 211, 252, ${0.3 + value * 0.5})`)
        gradient.addColorStop(1, `rgba(167, 243, 208, ${0.1 + value * 0.6})`)

        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.lineTo(x2, y2)
        ctx.strokeStyle = gradient
        ctx.lineWidth = 2
        ctx.lineCap = 'round'
        ctx.stroke()
      }

      const glowGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, maxRadius * 0.3)
      glowGradient.addColorStop(0, 'rgba(125, 211, 252, 0.15)')
      glowGradient.addColorStop(1, 'rgba(125, 211, 252, 0)')
      ctx.beginPath()
      ctx.arc(centerX, centerY, maxRadius * 0.3, 0, Math.PI * 2)
      ctx.fillStyle = glowGradient
      ctx.fill()
    }

    draw()
  }, [])

  const stopVisualization = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = 0
    }
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
  }, [])

  useEffect(() => {
    return () => {
      stopVisualization()
      if (sourceRef.current) {
        try { sourceRef.current.disconnect() } catch { /* noop */ }
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [stopVisualization])

  return {
    canvasRef,
    connectAudio,
    startVisualization,
    stopVisualization,
  }
}
