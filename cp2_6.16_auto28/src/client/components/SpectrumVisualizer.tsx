import { useEffect, useRef, useState } from 'react'
import { Play, Pause } from 'lucide-react'

interface SpectrumVisualizerProps {
  audioUrl: string
}

const SpectrumVisualizer = ({ audioUrl }: SpectrumVisualizerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null)
  const animationRef = useRef<number>(0)
  const [isPlaying, setIsPlaying] = useState(false)

  useEffect(() => {
    const audio = new Audio(audioUrl)
    audio.crossOrigin = 'anonymous'
    audio.volume = 0.3
    audioRef.current = audio

    return () => {
      audio.pause()
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [audioUrl])

  const initAudioContext = () => {
    if (!audioRef.current || audioContextRef.current) return

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const analyser = audioContext.createAnalyser()
    const source = audioContext.createMediaElementSource(audioRef.current)

    analyser.fftSize = 256
    analyser.smoothingTimeConstant = 0.8

    source.connect(analyser)
    analyser.connect(audioContext.destination)

    audioContextRef.current = audioContext
    analyserRef.current = analyser
    sourceRef.current = source
  }

  const draw = () => {
    if (!canvasRef.current || !analyserRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const bufferLength = analyserRef.current.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    const renderFrame = () => {
      animationRef.current = requestAnimationFrame(renderFrame)

      analyserRef.current!.getByteFrequencyData(dataArray)

      const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0)
      gradient.addColorStop(0, '#e040fb')
      gradient.addColorStop(1, '#00e5ff')

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const barWidth = 4
      const barGap = 2
      const barCount = Math.floor(canvas.width / (barWidth + barGap))
      const startX = (canvas.width - barCount * (barWidth + barGap)) / 2

      for (let i = 0; i < barCount; i++) {
        const dataIndex = Math.floor(i * bufferLength / barCount)
        const barHeight = (dataArray[dataIndex] / 255) * canvas.height * 0.9
        const x = startX + i * (barWidth + barGap)
        const y = canvas.height - barHeight

        ctx.fillStyle = gradient
        ctx.fillRect(x, y, barWidth, barHeight)

        ctx.fillStyle = 'rgba(224, 64, 251, 0.3)'
        ctx.fillRect(x, canvas.height, barWidth, -barHeight * 0.3)
      }
    }

    renderFrame()
  }

  const togglePlay = async () => {
    if (!audioRef.current) return

    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      initAudioContext()
      try {
        await audioRef.current.play()
        setIsPlaying(true)
        draw()
      } catch (error) {
        console.error('Playback failed:', error)
      }
    }
  }

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={800}
        height={200}
        className="w-full h-48 rounded-xl"
        style={{ background: 'rgba(0, 0, 0, 0.3)' }}
      />
      
      <button
        onClick={togglePlay}
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 glass-effect p-4 rounded-full hover:bg-white/20 transition-colors"
      >
        {isPlaying ? (
          <Pause className="w-8 h-8 text-white" />
        ) : (
          <Play className="w-8 h-8 text-white ml-1" />
        )}
      </button>
      
      <div className="absolute bottom-4 left-4 text-white/50 text-xs">
        点击播放按钮查看实时频谱
      </div>
    </div>
  )
}

export default SpectrumVisualizer
