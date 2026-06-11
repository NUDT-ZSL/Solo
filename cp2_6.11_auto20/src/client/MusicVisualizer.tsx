import { useEffect, useRef, useState, useCallback } from 'react'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  color: string
  opacity: number
  baseX: number
  baseY: number
  phase: number
  amplitude: number
  frequency: number
  emotion: number
}

interface Keyword {
  word: string
  color: string
  position: { x: number; y: number }
  emotionWeight: number
}

interface VisualParams {
  particles: {
    count: number
    colors: string[]
    sizes: number[]
    speeds: number[]
  }
  keywords: Keyword[]
  emotionPolarity: number
  bpm: number
  chordProgression: string[][]
  style: string
}

interface MusicVisualizerProps {
  params: VisualParams
  isPlaying: boolean
  onStop: () => void
}

const NOTE_FREQUENCIES: Record<string, number> = {
  'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23,
  'G4': 392.00, 'A4': 440.00, 'B4': 493.88,
  'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'F5': 698.46,
  'G5': 783.99, 'A5': 880.00, 'B5': 987.77,
  'Cm': 261.63, 'Dm': 293.66, 'Em': 329.63, 'Fm': 349.23,
  'Gm': 392.00, 'Am': 440.00, 'Bm': 493.88,
  'C': 261.63, 'D': 293.66, 'E': 329.63, 'F': 349.23,
  'G': 392.00, 'A': 440.00, 'B': 493.88,
}

function getChordNotes(chord: string): string[] {
  const chordMap: Record<string, string[]> = {
    'C': ['C4', 'E4', 'G4', 'C5'],
    'D': ['D4', 'F4', 'A4', 'D5'],
    'E': ['E4', 'G4', 'B4', 'E5'],
    'F': ['F4', 'A4', 'C5', 'F5'],
    'G': ['G4', 'B4', 'D5', 'G5'],
    'A': ['A4', 'C5', 'E5', 'A5'],
    'B': ['B4', 'D5', 'F5', 'B5'],
    'Cm': ['C4', 'D#4', 'G4', 'C5'],
    'Dm': ['D4', 'F4', 'A4', 'D5'],
    'Em': ['E4', 'G4', 'B4', 'E5'],
    'Fm': ['F4', 'G#4', 'C5', 'F5'],
    'Gm': ['G4', 'A#4', 'D5', 'G5'],
    'Am': ['A4', 'C5', 'E5', 'A5'],
    'Bm': ['B4', 'D5', 'F5', 'B5'],
  }
  return chordMap[chord] || ['C4', 'E4', 'G4', 'C5']
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 255, g: 255, b: 255 }
}

function lerpColor(color1: string, color2: string, t: number): string {
  const c1 = hexToRgb(color1)
  const c2 = hexToRgb(color2)
  const r = Math.round(c1.r + (c2.r - c1.r) * t)
  const g = Math.round(c1.g + (c2.g - c1.g) * t)
  const b = Math.round(c1.b + (c2.b - c1.b) * t)
  return `rgb(${r}, ${g}, ${b})`
}

function getEmotionColor(emotion: number): string {
  if (emotion > 0.3) {
    const t = (emotion - 0.3) / 0.7
    return lerpColor('#FFD700', '#FF69B4', t)
  } else if (emotion < -0.3) {
    const t = (Math.abs(emotion) - 0.3) / 0.7
    return lerpColor('#1E3A5F', '#7B2D8E', t)
  } else {
    return '#E0E0E0'
  }
}

export default function MusicVisualizer({ params, isPlaying, onStop }: MusicVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const oscillatorsRef = useRef<OscillatorNode[]>([])
  const gainsRef = useRef<GainNode[]>([])
  const animationRef = useRef<number>(0)
  const particlesRef = useRef<Particle[]>([])
  const timeRef = useRef<number>(0)
  const beatRef = useRef<number>(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])
  const isRecordingRef = useRef<boolean>(false)

  const [isRecording, setIsRecording] = useState(false)
  const [recordingProgress, setRecordingProgress] = useState(0)
  const beatIntervalRef = useRef<number | null>(null)

  const initParticles = useCallback((width: number, height: number) => {
    const particles: Particle[] = []
    const count = params.particles.count || 300
    const emotionPolarity = params.emotionPolarity || 0

    for (let i = 0; i < count; i++) {
      const emotionOffset = (Math.random() - 0.5) * 0.6
      const particleEmotion = Math.max(-1, Math.min(1, emotionPolarity + emotionOffset))
      const color = getEmotionColor(particleEmotion)

      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: 3 + Math.random() * 7,
        color,
        opacity: 0.3 + Math.random() * 0.6,
        baseX: Math.random() * width,
        baseY: Math.random() * height,
        phase: Math.random() * Math.PI * 2,
        amplitude: 2 + Math.random() * 6,
        frequency: 0.002 + Math.random() * 0.005,
        emotion: particleEmotion,
      })
    }

    particlesRef.current = particles
  }, [params.particles.count, params.emotionPolarity])

  const initAudio = useCallback(() => {
    if (audioContextRef.current) {
      audioContextRef.current.close()
    }

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    audioContextRef.current = audioContext

    const waveTypes: OscillatorType[] = ['sine', 'triangle', 'sawtooth', 'square']
    const oscillators: OscillatorNode[] = []
    const gains: GainNode[] = []

    waveTypes.forEach((type, index) => {
      const osc = audioContext.createOscillator()
      const gain = audioContext.createGain()
      osc.type = type
      gain.gain.value = 0
      osc.connect(gain)
      gain.connect(audioContext.destination)
      osc.start()
      oscillators.push(osc)
      gains.push(gain)
    })

    oscillatorsRef.current = oscillators
    gainsRef.current = gains
  }, [])

  const playChord = useCallback((chord: string, duration: number) => {
    const audioContext = audioContextRef.current
    if (!audioContext || oscillatorsRef.current.length === 0) return

    const notes = getChordNotes(chord)
    const attack = 0.05
    const release = 0.1
    const style = params.style

    const gains = gainsRef.current
    const oscillators = oscillatorsRef.current

    let oscIndex = 0
    if (style === 'dreamy') {
      oscIndex = 0
    } else if (style === 'tense') {
      oscIndex = 2
    } else if (style === 'healing') {
      oscIndex = 0
    } else if (style === 'epic') {
      oscIndex = 3
    }

    for (let i = 0; i < Math.min(notes.length, 4); i++) {
      const osc = oscillators[(oscIndex + i) % 4]
      const gain = gains[(oscIndex + i) % 4]
      const freq = NOTE_FREQUENCIES[notes[i]] || 440

      osc.frequency.setValueAtTime(freq, audioContext.currentTime)

      const volume = style === 'healing' ? 0.12 : style === 'dreamy' ? 0.1 : style === 'tense' ? 0.08 : 0.1
      gain.gain.cancelScheduledValues(audioContext.currentTime)
      gain.gain.setValueAtTime(0, audioContext.currentTime)
      gain.gain.linearRampToValueAtTime(volume, audioContext.currentTime + attack)
      gain.gain.setValueAtTime(volume, audioContext.currentTime + duration - release)
      gain.gain.linearRampToValueAtTime(0, audioContext.currentTime + duration)
    }
  }, [params.style])

  const startMusic = useCallback(() => {
    if (!audioContextRef.current) {
      initAudio()
    }

    const bpm = params.bpm || 80
    const beatDuration = 60 / bpm
    const chordProgression = params.chordProgression

    let chordIndex = 0
    let beatCount = 0
    const beatsPerChord = 2

    const playNextBeat = () => {
      if (!isPlaying) return
      if (beatCount % beatsPerChord === 0) {
        const chord = chordProgression[chordIndex % chordProgression.length]
        playChord(chord.join(''), beatDuration * beatsPerChord)
        chordIndex++
      }
      beatRef.current = (beatRef.current + 1) % 4
      beatCount++
    }

    playNextBeat()
    beatIntervalRef.current = window.setInterval(playNextBeat, beatDuration * 1000)
  }, [params.bpm, params.chordProgression, isPlaying, initAudio, playChord])

  const stopMusic = useCallback(() => {
    if (beatIntervalRef.current) {
      clearInterval(beatIntervalRef.current)
      beatIntervalRef.current = null
    }
  }, [])

  const drawParticles = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number, time: number) => {
    const particles = particlesRef.current
    const beatIntensity = 1 + 0.3 * Math.sin(time * 0.01 + beatRef.current * Math.PI / 2)

    particles.forEach((p) => {
      p.phase += p.frequency
      p.baseX += p.vx * 0.3
      p.baseY += p.vy * 0.3

      if (p.baseX < -50) p.baseX = width + 50
      if (p.baseX > width + 50) p.baseX = -50
      if (p.baseY < -50) p.baseY = height + 50
      if (p.baseY > height + 50) p.baseY = -50

      p.x = p.baseX + Math.sin(p.phase) * p.amplitude * beatIntensity
      p.y = p.baseY + Math.cos(p.phase * 1.3) * p.amplitude * 0.5 * beatIntensity

      const sizePulse = p.size * (1 + 0.2 * Math.sin(time * 0.003 + p.phase))

      ctx.beginPath()
      ctx.arc(p.x, p.y, sizePulse, 0, Math.PI * 2)

      const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, sizePulse * 2)
      gradient.addColorStop(0, p.color)
      gradient.addColorStop(1, 'transparent')

      ctx.fillStyle = gradient
      ctx.globalAlpha = p.opacity * 0.8
      ctx.fill()
      ctx.globalAlpha = 1
    })
  }, [])

  const drawKeywords = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number, time: number) => {
    const keywords = params.keywords || []
    const beatTime = beatRef.current

    keywords.forEach((kw, index) => {
      const fadeInStart = index * 0.3
      const elapsed = time / 60
      let alpha = 1

      if (elapsed < fadeInStart) {
        alpha = 0
      } else if (elapsed < fadeInStart + 1) {
        alpha = (elapsed - fadeInStart) / 1
      }

      const bouncePhase = (time * 0.05 + index * 0.7) % (Math.PI * 2)
      const bounceY = Math.sin(bouncePhase) * (8 + index * 2)

      const baseSize = 20 + (kw.emotionWeight + 1) * 8
      const scalePulse = 1 + 0.3 * Math.sin(time * 0.03 + beatTime + index)
      const fontSize = baseSize * scalePulse

      const x = width * kw.position.x
      const y = height * kw.position.y + bounceY

      ctx.save()
      ctx.globalAlpha = alpha
      ctx.font = `700 ${fontSize}px 'Noto Sans SC', sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      ctx.shadowColor = kw.color
      ctx.shadowBlur = 12
      ctx.fillStyle = kw.color
      ctx.fillText(kw.word, x, y)

      ctx.restore()
    })
  }, [params.keywords])

  const animate = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height

    ctx.fillStyle = '#0A0A1A'
    ctx.fillRect(0, 0, width, height)

    drawParticles(ctx, width, height, timeRef.current)
    drawKeywords(ctx, width, height, timeRef.current)

    timeRef.current++
    animationRef.current = requestAnimationFrame(animate)
  }, [drawParticles, drawKeywords])

  const startRecording = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    setIsRecording(true)
    setRecordingProgress(0)
    isRecordingRef.current = true
    recordedChunksRef.current = []

    const stream = canvas.captureStream(30)
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp9',
    })

    mediaRecorderRef.current = mediaRecorder

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        recordedChunksRef.current.push(e.data)
      }
    }

    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      a.href = url
      a.download = `yuyin_zhimeng_${timestamp}.webm`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setIsRecording(false)
      isRecordingRef.current = false
    }

    mediaRecorder.start()

    const duration = 30000
    const startTime = Date.now()

    const updateProgress = () => {
      if (!isRecordingRef.current) return
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      setRecordingProgress(progress)

      if (progress < 1) {
        requestAnimationFrame(updateProgress)
      }
    }
    updateProgress()

    setTimeout(() => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop()
      }
    }, duration)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resizeCanvas = () => {
      const container = canvas.parentElement
      if (container) {
        const rect = container.getBoundingClientRect()
        canvas.width = rect.width
        canvas.height = Math.max(500, window.innerHeight * 0.5)
        initParticles(canvas.width, canvas.height)
      }
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    return () => {
      window.removeEventListener('resize', resizeCanvas)
    }
  }, [initParticles])

  useEffect(() => {
    if (isPlaying) {
      animate()
      startMusic()
    } else {
      cancelAnimationFrame(animationRef.current)
      stopMusic()
    }

    return () => {
      cancelAnimationFrame(animationRef.current)
      stopMusic()
    }
  }, [isPlaying, animate, startMusic, stopMusic])

  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
      if (beatIntervalRef.current) {
        clearInterval(beatIntervalRef.current)
      }
    }
  }, [])

  return (
    <div style={containerStyle}>
      <div style={canvasWrapperStyle}>
        <canvas ref={canvasRef} style={canvasStyle} />
        {isRecording && (
          <div style={recordingOverlayStyle}>
            <div style={recordingIndicatorStyle}>
              <div style={recordingDotStyle}></div>
              <span>录制中 {Math.round(recordingProgress * 30)}s / 30s</span>
            </div>
            <div style={progressBarStyle}>
              <div style={{ ...progressFillStyle, width: `${recordingProgress * 100}%` }}></div>
            </div>
          </div>
        )}
      </div>

      <div style={controlsStyle}>
        <button
          onClick={startRecording}
          disabled={isRecording || !isPlaying}
          style={{
            ...recordButtonStyle,
            opacity: isRecording || !isPlaying ? 0.5 : 1,
            cursor: isRecording || !isPlaying ? 'not-allowed' : 'pointer',
          }}
        >
          {isRecording ? '录制中...' : '生成并下载视频'}
        </button>
        <button
          onClick={onStop}
          style={stopButtonStyle}
        >
          停止
        </button>
      </div>

      <div style={infoBarStyle}>
        <span style={infoItemStyle}>
          风格：<span style={{ color: '#7B68EE' }}>
            {params.style === 'dreamy' ? '梦幻' :
             params.style === 'tense' ? '紧张' :
             params.style === 'healing' ? '治愈' : '史诗'}
          </span>
        </span>
        <span style={infoItemStyle}>
          BPM：<span style={{ color: '#7B68EE' }}>{params.bpm}</span>
        </span>
        <span style={infoItemStyle}>
          粒子数：<span style={{ color: '#7B68EE' }}>{params.particles.count}</span>
        </span>
        <span style={infoItemStyle}>
          情感极性：<span style={{ color: params.emotionPolarity > 0 ? '#FFD700' : params.emotionPolarity < 0 ? '#7B2D8E' : '#E0E0E0' }}>
            {params.emotionPolarity > 0.3 ? '积极' : params.emotionPolarity < -0.3 ? '消极' : '中性'}
          </span>
        </span>
      </div>
    </div>
  )
}

const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  width: '100%',
}

const canvasWrapperStyle: React.CSSProperties = {
  width: '100%',
  position: 'relative',
  borderRadius: '12px',
  overflow: 'hidden',
  boxShadow: '0 4px 24px rgba(0, 0, 0, 0.4)',
  border: '1px solid #333',
}

const canvasStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  minHeight: '500px',
}

const recordingOverlayStyle: React.CSSProperties = {
  position: 'absolute',
  top: '20px',
  left: '20px',
  right: '20px',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
}

const recordingIndicatorStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  color: '#FF4444',
  fontSize: '14px',
  fontWeight: 600,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  padding: '6px 12px',
  borderRadius: '999px',
  alignSelf: 'flex-start',
}

const recordingDotStyle: React.CSSProperties = {
  width: '10px',
  height: '10px',
  borderRadius: '50%',
  backgroundColor: '#FF4444',
  animation: 'pulse 1s infinite',
}

const progressBarStyle: React.CSSProperties = {
  width: '100%',
  height: '4px',
  backgroundColor: 'rgba(255, 255, 255, 0.2)',
  borderRadius: '2px',
  overflow: 'hidden',
}

const progressFillStyle: React.CSSProperties = {
  height: '100%',
  background: 'linear-gradient(90deg, #7B68EE, #FF69B4)',
  transition: 'width 0.1s linear',
}

const controlsStyle: React.CSSProperties = {
  display: 'flex',
  gap: '16px',
  marginTop: '24px',
}

const recordButtonStyle: React.CSSProperties = {
  padding: '14px 36px',
  background: 'linear-gradient(135deg, #FF69B4 0%, #FFD700 100%)',
  border: 'none',
  borderRadius: '999px',
  color: '#1A1A2E',
  fontSize: '15px',
  fontWeight: 700,
  cursor: 'pointer',
  boxShadow: '0 4px 20px rgba(255, 105, 180, 0.3)',
  transition: 'transform 0.2s, box-shadow 0.2s',
}

const stopButtonStyle: React.CSSProperties = {
  padding: '14px 36px',
  backgroundColor: 'transparent',
  border: '1px solid #666',
  borderRadius: '999px',
  color: '#888',
  fontSize: '15px',
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'border-color 0.2s, color 0.2s',
}

const infoBarStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  flexWrap: 'wrap',
  gap: '24px',
  marginTop: '20px',
  fontSize: '13px',
  color: '#666',
}

const infoItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
}

const styleSheet = document.createElement('style')
styleSheet.textContent = `
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
  
  @media (max-width: 768px) {
    canvas { min-height: 400px !important; height: 400px !important; }
  }
`
if (!document.querySelector('style[data-visualizer]')) {
  styleSheet.setAttribute('data-visualizer', 'true')
  document.head.appendChild(styleSheet)
}
