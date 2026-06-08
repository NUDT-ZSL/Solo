import { useState, useRef } from 'react'
import { useMysteryStore } from '@/store/useMysteryStore'
import { Send, X } from 'lucide-react'

interface VerifyModalProps {
  mysteryId: string
  riddle: string
  color: string
  onClose: () => void
  onCorrect: (color: string) => void
  onWrong: () => void
}

const TEXT_COLORS: Record<string, string> = {
  'warm-yellow': 'text-warm-yellow',
  'cyan-green': 'text-cyan-green',
  'light-blue': 'text-light-blue',
}

const BORDER_COLORS: Record<string, string> = {
  'warm-yellow': 'border-warm-yellow/20 focus:border-warm-yellow/50',
  'cyan-green': 'border-cyan-green/20 focus:border-cyan-green/50',
  'light-blue': 'border-light-blue/20 focus:border-light-blue/50',
}

const BTN_GRADIENTS: Record<string, string> = {
  'warm-yellow': 'from-amber-500/80 to-yellow-600/80',
  'cyan-green': 'from-emerald-500/80 to-teal-600/80',
  'light-blue': 'from-blue-500/80 to-indigo-600/80',
}

export default function VerifyModal({ mysteryId, riddle, color, onClose, onCorrect, onWrong }: VerifyModalProps) {
  const [answer, setAnswer] = useState('')
  const [wrong, setWrong] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const verifyAnswer = useMysteryStore((s) => s.verifyAnswer)

  const handleSubmit = async () => {
    if (!answer.trim() || submitting) return
    setSubmitting(true)
    const result = await verifyAnswer(mysteryId, answer.trim())
    setSubmitting(false)
    if (!result) return

    if (result.correct) {
      onCorrect(color)
    } else {
      setWrong(true)
      onWrong()
      setTimeout(() => setWrong(false), 1000)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={`modal-card ${wrong ? 'animate-shake' : ''}`}
        style={{
          borderColor: wrong ? 'rgba(239, 68, 68, 0.4)' : undefined,
          background: wrong
            ? 'rgba(239, 68, 68, 0.08)'
            : undefined,
          transition: 'border-color 0.3s, background 0.3s',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-6">
          <div className={`text-xs tracking-widest uppercase ${TEXT_COLORS[color]} opacity-60`}>
            解谜挑战
          </div>
          <button
            onClick={onClose}
            className="text-white/30 hover:text-white/60 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mb-8">
          <p className="text-lg font-serif text-white/90 leading-relaxed text-center">
            {riddle}
          </p>
        </div>

        <div className="space-y-4">
          <input
            ref={inputRef}
            type="text"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入你的答案..."
            className={`w-full px-4 py-3 rounded-xl bg-white/5 border ${BORDER_COLORS[color]} text-white placeholder-white/25 outline-none transition-colors text-center font-serif`}
            autoFocus
          />

          <button
            onClick={handleSubmit}
            disabled={!answer.trim() || submitting}
            className={`w-full py-3 rounded-xl bg-gradient-to-r ${BTN_GRADIENTS[color]} text-white font-medium tracking-wider transition-all duration-200 hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
          >
            <Send size={16} />
            {submitting ? '验证中...' : '提交答案'}
          </button>
        </div>
      </div>
    </div>
  )
}
