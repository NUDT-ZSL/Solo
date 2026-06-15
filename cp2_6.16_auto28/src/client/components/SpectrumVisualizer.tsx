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
  const isPlayingRef = useRef(false)

  useEffect(() => {
    const audio = new Audio(audioUrl)
    audio.crossOrigin = 'anonymous'
    audio.volume = 0.3
    audioRef.current = audio

    const handleEnded = () => {
      setIsPlaying(false)
      isPlayingRef.current = false
    }
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('ended', handleEnded)
      audio.pause()
      audio.src = ''
      
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = 0
      }
      
      if (sourceRef.current) {
        try {
          sourceRef.current.disconnect()
        } catch (e) {
          console.warn('Failed to disconnect source:', e)
        }
        sourceRef.current = null
      }
      
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(e => {
          console.warn('Failed to close AudioContext:', e)
        })
        audioContextRef.current = null
      }
      
      analyserRef.current = null
      audioRef.current = null
    }
  }, [audioUrl])

  const initAudioContext = () => {
    if (!audioRef.current || audioContextRef.current) return

    try {
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
    } catch (error) {
      console.error('Failed to init AudioContext:', error)
    }
  }

  const draw = () => {
    if (!canvasRef.current || !analyserRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const bufferLength = analyserRef.current.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    const renderFrame = () => {
      if (!analyserRef.current || !isPlayingRef.current) {
        return
      }

      animationRef.current = requestAnimationFrame(renderFrame)

      analyserRef.current.getByteFrequencyData(dataArray)

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

  const stopDrawing = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = 0
    }
    
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d')
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
      }
    }
  }

  const togglePlay = async () => {
    if (!audioRef.current) return

    if (isPlaying) {
      audioRef.current.pause()
      isPlayingRef.current = false
      setIsPlaying(false)
      stopDrawing()
    } else {
      try {
        initAudioContext()
        
        if (audioContextRef.current?.state === 'suspended') {
          await audioContextRef.current.resume()
        }
        
        await audioRef.current.play()
        isPlayingRef.current = true
        setIsPlaying(true)
        draw()
      } catch (error) {
        console.error('Playback failed:', error)
        isPlayingRef.current = false
        setIsPlaying(false)
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
