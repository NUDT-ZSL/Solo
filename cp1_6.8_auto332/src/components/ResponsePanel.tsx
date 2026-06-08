import { useState, useRef, useCallback } from 'react'
import { Send, X, Mic, Square } from 'lucide-react'

interface ResponsePanelProps {
  onSubmit: (text: string, audioBlob?: Blob) => void
  onClose: () => void
}

export default function ResponsePanel({ onSubmit, onClose }: ResponsePanelProps) {
  const [text, setText] = useState('')
  const [isRecordingResponse, setIsRecordingResponse] = useState(false)
  const [responseBlob, setResponseBlob] = useState<Blob | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const startResponseRecording = useCallback(async () => {
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
        setResponseBlob(blob)
        stream.getTracks().forEach(t => t.stop())
      }
      mediaRecorder.start()
      setIsRecordingResponse(true)
    } catch {
      console.error('Microphone access denied')
    }
  }, [])

  const stopResponseRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
    setIsRecordingResponse(false)
  }, [])

  const handleSubmit = () => {
    if (!text.trim()) return
    onSubmit(text, responseBlob || undefined)
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 animate-slide-up">
      <div className="mx-auto max-w-lg">
        <div className="bg-ocean-900/70 backdrop-blur-xl border-t border-ocean-400/20 rounded-t-2xl p-5 shadow-[0_-8px_30px_rgba(0,0,0,0.3)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-ocean-100 text-lg">回声回应</h3>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-ocean-800/50 flex items-center justify-center hover:bg-ocean-700/50 transition-colors"
            >
              <X className="w-4 h-4 text-ocean-300" />
            </button>
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="写下你的回应..."
            className="w-full h-24 bg-ocean-800/40 border border-ocean-400/20 rounded-xl p-3 text-ocean-100 placeholder-ocean-400/50 font-body text-sm resize-none focus:outline-none focus:border-ocean-300/40 transition-colors"
          />

          <div className="flex items-center gap-3 mt-3">
            <button
              onClick={isRecordingResponse ? stopResponseRecording : startResponseRecording}
              className={`
                w-10 h-10 rounded-full flex items-center justify-center transition-all
                ${isRecordingResponse
                  ? 'bg-red-500/70 animate-glow-pulse'
                  : responseBlob
                    ? 'bg-seafoam-400/30 border border-seafoam-300/40'
                    : 'bg-ocean-700/40 border border-ocean-400/20 hover:border-ocean-300/40'
                }
              `}
            >
              {isRecordingResponse ? (
                <Square className="w-4 h-4 text-white fill-white" />
              ) : (
                <Mic className="w-4 h-4 text-ocean-200" />
              )}
            </button>

            {responseBlob && (
              <span className="text-seafoam-300 text-xs font-body flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-seafoam-300 animate-pulse" />
                语音已录制
              </span>
            )}

            <div className="flex-1" />

            <button
              onClick={handleSubmit}
              disabled={!text.trim()}
              className={`
                flex items-center gap-2 px-5 py-2.5 rounded-full font-body text-sm transition-all
                ${text.trim()
                  ? 'bg-gradient-to-r from-ocean-400 to-ocean-500 text-white shadow-[0_0_20px_rgba(56,189,248,0.3)] hover:shadow-[0_0_30px_rgba(56,189,248,0.5)]'
                  : 'bg-ocean-800/40 text-ocean-500 cursor-not-allowed'
                }
              `}
            >
              <Send className="w-4 h-4" />
              发送回声
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
