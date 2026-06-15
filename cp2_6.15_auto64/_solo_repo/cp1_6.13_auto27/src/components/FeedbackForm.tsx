import { useState } from 'react'
import { Feedback } from '../types'

interface FeedbackFormProps {
  exhibitionId: string
  onSubmitted: () => void
}

function FeedbackForm({ exhibitionId, onSubmitted }: FeedbackFormProps) {
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (rating === 0 || !content.trim()) return

    setIsSubmitting(true)
    try {
      await fetch('/api/feedbacks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exhibitionId,
          rating,
          content: content.trim()
        })
      })
      setRating(0)
      setContent('')
      onSubmitted()
    } catch (err) {
      console.error('Failed to submit feedback:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const isDisabled = rating === 0 || !content.trim() || isSubmitting

  return (
    <div className="feedback-form">
      <div className="feedback-form-row">
        <div className="star-rating">
          {[1, 2, 3, 4, 5].map((star) => (
            <span
              key={star}
              className={`star ${(hoverRating || rating) >= star ? 'filled' : ''}`}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              onClick={() => setRating(star)}
            >
              ★
            </span>
          ))}
        </div>
        <textarea
          className="feedback-textarea"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="分享您的观展感受..."
        />
      </div>
      <button
        className="btn-submit"
        onClick={handleSubmit}
        disabled={isDisabled}
      >
        {isSubmitting ? '提交中...' : '提交反馈'}
      </button>
    </div>
  )
}

export default FeedbackForm
