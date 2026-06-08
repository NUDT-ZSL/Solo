import React, { useState } from 'react'
import { submitJournal, JournalEntry } from '../api'

const EMOTIONS: { key: JournalEntry['emotion']; emoji: string; label: string }[] = [
  { key: 'happy', emoji: '😊', label: '开心' },
  { key: 'sad', emoji: '😢', label: '伤心' },
  { key: 'anxious', emoji: '😰', label: '焦虑' },
  { key: 'calm', emoji: '😌', label: '平静' },
  { key: 'excited', emoji: '🤩', label: '兴奋' },
]

const ACTIVITIES = ['运动', '阅读', '社交', '工作', '学习']

const MAX_CHARS = 200

interface EmotionFormProps {
  onSubmitted: () => void
}

const EmotionForm: React.FC<EmotionFormProps> = ({ onSubmitted }) => {
  const [emotion, setEmotion] = useState<JournalEntry['emotion'] | null>(null)
  const [activities, setActivities] = useState<string[]>([])
  const [text, setText] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const toggleActivity = (activity: string) => {
    setActivities(prev =>
      prev.includes(activity)
        ? prev.filter(a => a !== activity)
        : [...prev, activity]
    )
  }

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    if (value.length <= MAX_CHARS) {
      setText(value)
    }
  }

  const canSubmit = emotion !== null && !isSubmitting

  const handleSubmit = async () => {
    if (!canSubmit) return

    setIsSubmitting(true)
    try {
      await submitJournal({
        emotion: emotion!,
        activities,
        text,
      })

      setShowSuccess(true)
      setTimeout(() => {
        setShowSuccess(false)
        setEmotion(null)
        setActivities([])
        setText('')
        onSubmitted()
      }, 600)
    } catch (err) {
      console.error('Submit failed:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const charCountClass =
    text.length >= MAX_CHARS
      ? 'char-count danger'
      : text.length >= MAX_CHARS * 0.8
      ? 'char-count warning'
      : 'char-count'

  return (
    <div className="form-section">
      <form className="emotion-form" onSubmit={e => { e.preventDefault(); handleSubmit() }}>
        <div>
          <h3 className="form-section-title">今天的心情如何？</h3>
          <div className="emoji-selector">
            {EMOTIONS.map(em => (
              <button
                key={em.key}
                type="button"
                className={`emoji-btn ${em.key} ${emotion === em.key ? 'selected' : ''}`}
                onClick={() => setEmotion(em.key)}
                title={em.label}
              >
                {em.emoji}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="form-section-title">今天做了什么？</h3>
          <div className="activity-tags">
            {ACTIVITIES.map(act => (
              <button
                key={act}
                type="button"
                className={`activity-tag ${activities.includes(act) ? 'selected' : ''}`}
                onClick={() => toggleActivity(act)}
              >
                {act}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="form-section-title">写下今天的感想</h3>
          <div className="textarea-wrapper">
            <textarea
              className="journal-textarea"
              placeholder="记录一下此刻的心情..."
              value={text}
              onChange={handleTextChange}
            />
            <span className={charCountClass}>
              {text.length}/{MAX_CHARS}
            </span>
          </div>
        </div>

        <button
          type="submit"
          className="submit-btn"
          disabled={!canSubmit}
        >
          {isSubmitting ? '提交中...' : '记录心情'}
        </button>
      </form>

      {showSuccess && (
        <div className="success-animation">
          <div className="success-circle">
            <span className="success-checkmark">✓</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default EmotionForm
