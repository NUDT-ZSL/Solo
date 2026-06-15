import { useState, type FC, type FormEvent } from 'react'
import { useToastStore } from '../store/toast'

export type MoodType = 'happy' | 'calm' | 'neutral' | 'down' | 'anxious'

interface MoodOption {
  type: MoodType
  emoji: string
  label: string
  className: string
}

const MOOD_OPTIONS: MoodOption[] = [
  { type: 'happy', emoji: '😄', label: '开心', className: 'mood-happy' },
  { type: 'calm', emoji: '😊', label: '平静', className: 'mood-calm' },
  { type: 'neutral', emoji: '😐', label: '一般', className: 'mood-neutral' },
  { type: 'down', emoji: '😔', label: '低落', className: 'mood-down' },
  { type: 'anxious', emoji: '😟', label: '焦虑', className: 'mood-anxious' },
]

type SubmitStatus = 'idle' | 'loading' | 'success' | 'error'

const MoodSubmit: FC = () => {
  const [selectedMood, setSelectedMood] = useState<MoodType | null>(null)
  const [text, setText] = useState<string>('')
  const [status, setStatus] = useState<SubmitStatus>('idle')
  const showToast = useToastStore((s) => s.showToast)

  const MAX_LEN = 200
  const remaining = MAX_LEN - text.length
  const showTextArea = selectedMood !== null

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!selectedMood || status !== 'idle') return

    setStatus('loading')

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const res = await fetch('/api/mood', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mood: selectedMood, text }),
      })

      if (!res.ok) throw new Error('提交失败')

      setStatus('success')
      showToast('心情提交成功，感谢分享！', 'success')

      setTimeout(() => {
        setStatus('idle')
        setSelectedMood(null)
        setText('')
      }, 2000)
    } catch {
      setStatus('error')
      showToast('提交失败，请稍后重试', 'error')

      setTimeout(() => {
        setStatus('idle')
      }, 2000)
    }
  }

  const renderBtnContent = () => {
    switch (status) {
      case 'loading':
        return <span className="spinner" />
      case 'success':
        return <span className="status-icon success">✓</span>
      case 'error':
        return <span className="status-icon error">✕</span>
      default:
        return <span>提交</span>
    }
  }

  return (
    <div className="submit-section">
      <h2 className="submit-title">今天心情如何？（匿名提交）</h2>

      <div className="mood-buttons">
        {MOOD_OPTIONS.map((opt) => (
          <button
            key={opt.type}
            type="button"
            disabled={status === 'loading'}
            className={`mood-btn ${opt.className} ${selectedMood === opt.type ? 'selected' : ''}`}
            onClick={() => {
              if (status !== 'loading') setSelectedMood(opt.type)
            }}
          >
            {opt.emoji}
          </button>
        ))}
      </div>

      <div className="mood-labels">
        {MOOD_OPTIONS.map((opt) => (
          <div key={opt.type} className="mood-label">
            {opt.label}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div className={`text-input-wrap ${showTextArea ? 'visible' : ''}`}>
          <textarea
            className="textarea"
            placeholder="分享一点感受（可选）"
            value={text}
            maxLength={MAX_LEN}
            onChange={(e) => setText(e.target.value)}
            disabled={status === 'loading'}
          />
          <div className="char-count">剩余 {remaining} 字</div>
        </div>

        <button
          type="submit"
          className="submit-btn"
          disabled={!selectedMood || status !== 'idle'}
        >
          {renderBtnContent()}
        </button>
      </form>
    </div>
  )
}

export default MoodSubmit
