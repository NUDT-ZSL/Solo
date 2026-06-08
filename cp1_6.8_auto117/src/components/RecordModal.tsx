import { useState, useRef, useEffect, useCallback } from 'react'
import { Mic, Square, Send, X } from 'lucide-react'
import type { EmotionTag } from '@/types'
import { EMOTION_LABELS } from '@/types'
import SoundRecorder from '@/SoundRecorder'
import type { RecordingState } from '@/SoundRecorder'
import SoundBottle from '@/SoundBottle'
import WaveEngine from '@/WaveEngine'

interface RecordModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (text: string, emotion: EmotionTag, audioBlob: Blob) => void
}

const EMOTIONS: EmotionTag[] = ['calm', 'excited', 'sad', 'curious', 'nostalgic']
const EMOTION_EMOJIS: Record<EmotionTag, string> = {
  calm: '🌊',
  excited: '⚡',
  sad: '🌧',
  curious: '🔍',
  nostalgic: '🌅',
}

export default function RecordModal({ isOpen, onClose, onSubmit }: RecordModalProps) {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [text, setText] = useState('')
  const [emotion, setEmotion] = useState<EmotionTag>('calm')
  const [waveformData, setWaveformData] = useState<Uint8Array>(new Uint8Array(0))

  const recorderRef = useRef<SoundRecorder | null>(null)
  const audioBlobRef = useRef<Blob | null>(null)
  const waveformIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (isOpen) {
      recorderRef.current = new SoundRecorder()
      recorderRef.current.setCallbacks(
        (state) => setRecordingState(state),
        (time) => setElapsed(time)
      )
    }
    return () => {
      recorderRef.current?.reset()
      recorderRef.current = null
      if (waveformIntervalRef.current) {
        clearInterval(waveformIntervalRef.current)
      }
    }
  }, [isOpen])

  useEffect(() => {
    if (recordingState === 'recording') {
      waveformIntervalRef.current = setInterval(() => {
        if (recorderRef.current) {
          setWaveformData(recorderRef.current.getWaveformData())
        }
      }, 50)
    } else {
      if (waveformIntervalRef.current) {
        clearInterval(waveformIntervalRef.current)
        waveformIntervalRef.current = null
      }
    }
  }, [recordingState])

  const handleStartRecording = async () => {
    if (!SoundRecorder.isSupported()) {
      alert('您的浏览器不支持录音功能')
      return
    }
    try {
      await recorderRef.current?.startRecording()
    } catch {
      alert('无法访问麦克风，请检查权限设置')
    }
  }

  const handleStopRecording = async () => {
    const blob = await recorderRef.current?.stopRecording()
    if (blob) {
      audioBlobRef.current = blob
    }
  }

  const handleSubmit = () => {
    if (!text.trim()) return
    const blob = audioBlobRef.current || new Blob([], { type: 'audio/webm' })
    onSubmit(text, emotion, blob)
    handleReset()
    onClose()
  }

  const handleReset = () => {
    recorderRef.current?.reset()
    setRecordingState('idle')
    setElapsed(0)
    setText('')
    setEmotion('calm')
    setWaveformData(new Uint8Array(0))
    audioBlobRef.current = null
  }

  const handleClose = () => {
    handleReset()
    onClose()
  }

  if (!isOpen) return null

  const colors = WaveEngine.emotionColors[emotion]
  const progress = Math.min(elapsed / 60, 1)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={handleClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div
        className="relative glass-strong rounded-2xl p-6 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-white/50 hover:text-white/80 transition-colors"
        >
          <X size={20} />
        </button>

        <h2 className="font-display text-xl mb-5 text-center" style={{ color: colors.primary }}>
          🎙️ 录制漂流瓶
        </h2>

        <div className="mb-4">
          <div className="flex items-center justify-center gap-3 mb-3">
            {recordingState === 'idle' && (
              <button
                onClick={handleStartRecording}
                className="w-14 h-14 rounded-full flex items-center justify-center transition-all hover:scale-110"
                style={{
                  background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                  boxShadow: `0 4px 20px ${colors.primary}40`,
                }}
              >
                <Mic size={24} className="text-white" />
              </button>
            )}
            {recordingState === 'recording' && (
              <button
                onClick={handleStopRecording}
                className="w-14 h-14 rounded-full flex items-center justify-center bg-red-500/80 hover:bg-red-500 transition-all hover:scale-110"
              >
                <Square size={20} className="text-white" />
              </button>
            )}
            {recordingState === 'stopped' && (
              <button
                onClick={handleStartRecording}
                className="w-14 h-14 rounded-full flex items-center justify-center transition-all hover:scale-110"
                style={{
                  background: `linear-gradient(135deg, ${colors.primary}30, ${colors.secondary}30)`,
                  border: `2px solid ${colors.primary}`,
                }}
              >
                <Mic size={24} style={{ color: colors.primary }} />
              </button>
            )}
          </div>

          {recordingState === 'recording' && (
            <>
              <div className="text-center text-sm mb-2" style={{ color: colors.primary }}>
                {Math.floor(elapsed)}s / 60s
              </div>
              <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden mb-2">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${progress * 100}%`,
                    background: `linear-gradient(90deg, ${colors.primary}, ${colors.secondary})`,
                  }}
                />
              </div>
              <WaveformBars data={waveformData} emotion={emotion} />
            </>
          )}

          {recordingState === 'stopped' && (
            <div className="text-center text-xs text-white/40">
              ✅ 录音完成，可重新录制或直接提交
            </div>
          )}

          {recordingState === 'idle' && (
            <div className="text-center text-xs text-white/30">
              点击按钮开始录音，最多60秒
            </div>
          )}
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="写下此刻的心情..."
          className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white/80 placeholder-white/25 resize-none focus:outline-none focus:border-white/20 transition-colors mb-4"
          rows={3}
        />

        <div className="flex flex-wrap justify-center gap-2 mb-5">
          {EMOTIONS.map((e) => (
            <button
              key={e}
              onClick={() => setEmotion(e)}
              className="rounded-full px-3 py-1.5 text-xs flex items-center gap-1 transition-all hover:scale-105"
              style={SoundBottle.emotionTagStyle(e, emotion === e)}
            >
              <span>{EMOTION_EMOJIS[e]}</span>
              <span>{EMOTION_LABELS[e]}</span>
            </button>
          ))}
        </div>

        <button
          onClick={handleSubmit}
          disabled={!text.trim()}
          className="w-full py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
          style={{
            background: text.trim()
              ? `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`
              : 'rgba(255,255,255,0.05)',
            color: text.trim() ? 'white' : 'rgba(255,255,255,0.3)',
            boxShadow: text.trim() ? `0 4px 15px ${colors.primary}30` : 'none',
          }}
        >
          <span className="flex items-center justify-center gap-2">
            <Send size={14} />
            投入海洋
          </span>
        </button>
      </div>
    </div>
  )
}

function WaveformBars({ data, emotion }: { data: Uint8Array; emotion: EmotionTag }) {
  const colors = WaveEngine.emotionColors[emotion]
  const barCount = 32
  const bars: number[] = []

  if (data.length > 0) {
    const step = Math.max(1, Math.floor(data.length / barCount))
    for (let i = 0; i < barCount; i++) {
      const idx = i * step
      bars.push(idx < data.length ? data[idx] / 255 : 0)
    }
  } else {
    for (let i = 0; i < barCount; i++) {
      bars.push(Math.random() * 0.3 + 0.1)
    }
  }

  return (
    <div className="flex items-center justify-center gap-[2px] h-8">
      {bars.map((value, i) => (
        <div
          key={i}
          className="rounded-full transition-all duration-75"
          style={{
            width: '3px',
            height: `${Math.max(4, value * 28)}px`,
            background: `linear-gradient(to top, ${colors.primary}, ${colors.secondary})`,
            opacity: 0.6 + value * 0.4,
          }}
        />
      ))}
    </div>
  )
}
