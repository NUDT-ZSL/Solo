import React, { useRef, useState, useEffect, useCallback } from 'react'

interface AudioRecorderProps {
  onRecordingComplete: (audioBlob: Blob, waveform: number[], duration: number) => void
}

const MAX_DURATION = 30

const AudioRecorder: React.FC<AudioRecorderProps> = ({ onRecordingComplete }) => {
  const [isRecording, setIsRecording] = useState(false)
  const [remainingTime, setRemainingTime] = useState(MAX_DURATION)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationRef = useRef<number>(0)
  const waveformDataRef = useRef<number[]>([])
  const startTimeRef = useRef<number>(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !analyserRef.current) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const analyser = analyserRef.current
    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    analyser.getByteFrequencyData(dataArray)

    const width = canvas.width
    const height = canvas.height

    ctx.clearRect(0, 0, width, height)

    const barCount = 60
    const step = Math.floor(bufferLength / barCount)
    const barWidth = (width - 20) / barCount

    let sum = 0
    for (let i = 0; i < barCount; i++) {
      const value = dataArray[i * step]
      const barHeight = (value / 255) * 60
      sum += value / 255
      const x = 10 + i * barWidth
      const y = (height - barHeight) / 2

      const gradient = ctx.createLinearGradient(x, y, x, y + barHeight)
      gradient.addColorStop(0, '#4ADE80')
      gradient.addColorStop(1, '#22C55E')
      ctx.fillStyle = gradient
      ctx.fillRect(x, y, barWidth - 2, barHeight)
    }

    waveformDataRef.current.push(sum / barCount)
    animationRef.current = requestAnimationFrame(drawWaveform)
  }, [])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      const source = audioContext.createMediaStreamSource(stream)
      source.connect(analyser)

      audioContextRef.current = audioContext
      analyserRef.current = analyser
      waveformDataRef.current = []

      const mediaRecorder = new MediaRecorder(stream)
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const duration = Math.min(MAX_DURATION, Math.floor((Date.now() - startTimeRef.current) / 1000))
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const waveform = waveformDataRef.current
        cancelAnimationFrame(animationRef.current)
        stream.getTracks().forEach(track => track.stop())
        if (audioContextRef.current) {
          audioContextRef.current.close()
        }
        onRecordingComplete(audioBlob, waveform, Math.max(1, duration))
      }

      mediaRecorder.start()
      mediaRecorderRef.current = mediaRecorder
      startTimeRef.current = Date.now()
      setIsRecording(true)
      setRemainingTime(MAX_DURATION)

      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000)
        const remaining = MAX_DURATION - elapsed
        setRemainingTime(remaining)
        if (remaining <= 0) {
          stopRecording()
        }
      }, 100)

      drawWaveform()
    } catch (error) {
      console.error('Failed to start recording:', error)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    setIsRecording(false)
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  const handleClick = () => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  useEffect(() => {
    return () => {
      cancelAnimationFrame(animationRef.current)
      if (timerRef.current) clearInterval(timerRef.current)
      if (audioContextRef.current) audioContextRef.current.close()
    }
  }, [])

  return (
    <div style={styles.container}>
      <div style={styles.timeDisplay}>
        {isRecording ? (
          <span style={{ color: remainingTime <= 5 ? '#EF4444' : '#9CA3AF', fontSize: '18px', fontWeight: 600 }}>
            {remainingTime}s
          </span>
        ) : (
          <span style={{ color: '#6B7280', fontSize: '14px' }}>点击开始录音（最长30秒）</span>
        )}
      </div>

      <canvas
        ref={canvasRef}
        width={300}
        height={80}
        style={{
          ...styles.waveform,
          opacity: isRecording ? 1 : 0.3,
        }}
      />

      <div style={styles.buttonWrapper}>
        {isRecording && <div style={styles.pulseRing} />}
        {isRecording && <div style={{ ...styles.pulseRing, animationDelay: '0.5s' }} />}
        <button
          onClick={handleClick}
          style={{
            ...styles.recordButton,
            backgroundColor: isRecording ? '#EF4444' : '#3A3A4A',
          }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            {isRecording ? (
              <rect x="6" y="6" width="12" height="12" rx="2" fill="white" />
            ) : (
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" fill="white" />
            )}
            {!isRecording && (
              <path d="M19 10v2a7 7 0 0 1-14 0v-2 M12 19v4" stroke="white" strokeWidth="2" />
            )}
          </svg>
        </button>
      </div>

      <style>{`
        @keyframes pulse {
          0% {
            transform: scale(1);
            opacity: 0.8;
          }
          100% {
            transform: scale(1.8);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '24px',
    padding: '40px',
  },
  timeDisplay: {
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  waveform: {
    backgroundColor: '#16161E',
    borderRadius: '8px',
    transition: 'opacity 0.3s',
  },
  buttonWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '64px',
    height: '64px',
  },
  pulseRing: {
    position: 'absolute',
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    backgroundColor: '#EF4444',
    animation: 'pulse 2s ease-out infinite',
  },
  recordButton: {
    position: 'relative',
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.3s, transform 0.1s',
    zIndex: 1,
  },
}

export default AudioRecorder
