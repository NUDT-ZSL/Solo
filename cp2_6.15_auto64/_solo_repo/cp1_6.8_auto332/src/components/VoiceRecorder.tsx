import { useState, useRef, useCallback, useEffect } from 'react'
import { Mic, Square } from 'lucide-react'

interface VoiceRecorderProps {
  onRecordingComplete: (blob: Blob) => void
  maxDuration?: number
}

export default function VoiceRecorder({ onRecordingComplete, maxDuration = 30 }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [ripples, setRipples] = useState<number[]>([])
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const rippleTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        onRecordingComplete(blob)
        stream.getTracks().forEach(t => t.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
      setSeconds(0)

      timerRef.current = setInterval(() => {
        setSeconds(s => {
          if (s + 1 >= maxDuration) {
            mediaRecorder.stop()
            return maxDuration
          }
          return s + 1
        })
      }, 1000)

      rippleTimerRef.current = setInterval(() => {
        setRipples(prev => [...prev.slice(-3), Date.now()])
      }, 800)
    } catch {
      console.error('Microphone access denied')
    }
  }, [maxDuration, onRecordingComplete])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
    setIsRecording(false)
    if (timerRef.current) clearInterval(timerRef.current)
    if (rippleTimerRef.current) clearInterval(rippleTimerRef.current)
    setRipples([])
  }, [])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (rippleTimerRef.current) clearInterval(rippleTimerRef.current)
    }
  }, [])

  const progress = (seconds / maxDuration) * 100

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        {isRecording && ripples.map((id) => (
          <div
            key={id}
            className="absolute inset-0 rounded-full border-2 border-ocean-300 animate-ripple pointer-events-none"
          />
        ))}
        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={`
            relative w-16 h-16 rounded-full flex items-center justify-center
            transition-all duration-300 z-10
            ${isRecording
              ? 'bg-red-500/80 hover:bg-red-500 shadow-[0_0_30px_rgba(239,68,68,0.5)]'
              : 'bg-ocean-300/30 hover:bg-ocean-300/50 backdrop-blur-sm border border-ocean-200/40 shadow-[0_0_20px_rgba(125,211,252,0.3)] hover:shadow-[0_0_40px_rgba(125,211,252,0.6)]'
            }
          `}
        >
          {isRecording ? (
            <Square className="w-6 h-6 text-white fill-white" />
          ) : (
            <Mic className="w-6 h-6 text-ocean-50" />
          )}
        </button>
      </div>

      {isRecording && (
        <div className="w-40">
          <div className="h-1 bg-ocean-800/50 rounded-full overflow-hidden backdrop-blur-sm">
            <div
              className="h-full bg-gradient-to-r from-ocean-300 to-seafoam-300 rounded-full transition-all duration-1000"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-ocean-200 text-xs text-center mt-1 font-body">
            {seconds}s / {maxDuration}s
          </p>
        </div>
      )}

      {!isRecording && (
        <p className="text-ocean-300/60 text-xs font-body">轻触录音</p>
      )}
    </div>
  )
}
