import { useState } from 'react'
import { useMysteryStore } from '@/store/useMysteryStore'
import { Sparkles, X } from 'lucide-react'

interface CreateModalProps {
  onClose: () => void
  onCreated: () => void
}

export default function CreateModal({ onClose, onCreated }: CreateModalProps) {
  const [riddle, setRiddle] = useState('')
  const [answer, setAnswer] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const createMystery = useMysteryStore((s) => s.createMystery)

  const handleSubmit = async () => {
    if (!riddle.trim() || !answer.trim() || submitting) return
    setSubmitting(true)
    await createMystery(riddle.trim(), answer.trim())
    setSubmitting(false)
    onCreated()
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-warm-yellow/70" />
            <span className="text-xs tracking-widest uppercase text-warm-yellow/60">
              创建谜语
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-white/30 hover:text-white/60 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-xs text-white/40 mb-2 tracking-wider">谜面</label>
            <textarea
              value={riddle}
              onChange={(e) => setRiddle(e.target.value)}
              placeholder="写下你的谜面..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-warm-yellow/30 text-white placeholder-white/25 outline-none transition-colors resize-none font-serif"
            />
          </div>

          <div>
            <label className="block text-xs text-white/40 mb-2 tracking-wider">谜底</label>
            <input
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="谜底是什么..."
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-warm-yellow/30 text-white placeholder-white/25 outline-none transition-colors font-serif"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={!riddle.trim() || !answer.trim() || submitting}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500/80 to-yellow-600/80 text-white font-medium tracking-wider transition-all duration-200 hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Sparkles size={16} />
            {submitting ? '封装中...' : '封装谜语'}
          </button>
        </div>
      </div>
    </div>
  )
}
