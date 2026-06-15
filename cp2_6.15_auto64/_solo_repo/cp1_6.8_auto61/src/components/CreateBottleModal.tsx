import { useState, useRef, useEffect } from 'react'
import { useBottleStore } from '@/store/bottleStore'
import { SCENT_TAGS } from '@/utils/api'

export default function CreateBottleModal() {
  const { showCreateModal, setShowCreateModal, createBottle } = useBottleStore()
  const [content, setContent] = useState('')
  const [selectedTag, setSelectedTag] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (showCreateModal && cardRef.current) {
      cardRef.current.style.opacity = '0'
      cardRef.current.style.transform = 'scale(0.9) translateY(30px)'
      requestAnimationFrame(() => {
        if (cardRef.current) {
          cardRef.current.style.transition = 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
          cardRef.current.style.opacity = '1'
          cardRef.current.style.transform = 'scale(1) translateY(0)'
        }
      })
    }
  }, [showCreateModal])

  if (!showCreateModal) return null

  const handleClose = () => {
    if (cardRef.current) {
      cardRef.current.style.transition = 'all 0.25s ease-in'
      cardRef.current.style.opacity = '0'
      cardRef.current.style.transform = 'scale(0.9) translateY(30px)'
      setTimeout(() => {
        setShowCreateModal(false)
        setContent('')
        setSelectedTag('')
      }, 250)
    }
  }

  const handleSubmit = async () => {
    if (!content.trim() || !selectedTag || submitting) return
    setSubmitting(true)
    const bottle = await createBottle(content.trim(), selectedTag)
    setSubmitting(false)
    if (bottle) {
      handleClose()
    }
  }

  const charCount = content.length
  const isValid = content.trim().length > 0 && selectedTag && charCount <= 150

  return (
    <div className="bottle-card-overlay" ref={overlayRef} onClick={handleClose}>
      <div
        ref={cardRef}
        className="create-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="bottle-card-close" onClick={handleClose}>✕</button>

        <h2 className="create-modal-title">投放漂流瓶</h2>
        <p className="create-modal-subtitle">将你的气味记忆封入瓶中，让它漂流到陌生人的海洋</p>

        <div className="create-modal-field">
          <label className="create-modal-label">气味笔记</label>
          <textarea
            className="create-modal-textarea"
            placeholder="描述一种让你难忘的气味..."
            value={content}
            onChange={(e) => setContent(e.target.value.slice(0, 150))}
            rows={3}
          />
          <span className={`create-modal-counter ${charCount > 130 ? 'warn' : ''}`}>
            {charCount}/150
          </span>
        </div>

        <div className="create-modal-field">
          <label className="create-modal-label">气味标签</label>
          <div className="create-modal-tags">
            {SCENT_TAGS.map((tag) => (
              <button
                key={tag.label}
                className={`create-modal-tag ${selectedTag === tag.label ? 'selected' : ''}`}
                style={{
                  borderColor: selectedTag === tag.label ? tag.color : 'rgba(255,255,255,0.1)',
                  background: selectedTag === tag.label ? `${tag.color}25` : 'rgba(255,255,255,0.03)',
                  color: selectedTag === tag.label ? tag.color : 'rgba(255,255,255,0.6)',
                }}
                onClick={() => setSelectedTag(tag.label)}
              >
                <span className="create-modal-tag-dot" style={{ background: tag.color }} />
                {tag.label}
              </button>
            ))}
          </div>
        </div>

        <button
          className="create-modal-submit"
          disabled={!isValid || submitting}
          style={{
            opacity: isValid && !submitting ? 1 : 0.4,
            background: selectedTag
              ? `linear-gradient(135deg, ${SCENT_TAGS.find(t => t.label === selectedTag)?.color || '#4A9BD9'}60, ${SCENT_TAGS.find(t => t.label === selectedTag)?.color || '#4A9BD9'}30)`
              : 'rgba(255,255,255,0.1)',
          }}
          onClick={handleSubmit}
        >
          {submitting ? '投放中...' : '投入海洋'}
        </button>
      </div>
    </div>
  )
}
