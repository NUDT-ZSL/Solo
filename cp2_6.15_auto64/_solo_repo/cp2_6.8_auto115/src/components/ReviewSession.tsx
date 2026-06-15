import { useState, useEffect, useCallback } from 'react'
import { Card, Rating, submitReview } from '../api'

interface ReviewSessionProps {
  cards: Card[]
  deckTitle: string
}

const shuffleArray = <T,>(array: T[]): T[] => {
  const result = [...array]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

const ReviewSession = ({ cards, deckTitle }: ReviewSessionProps) => {
  const [reviewQueue, setReviewQueue] = useState<Card[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const now = new Date()
    const dueCards = cards.filter(
      (card) => new Date(card.nextReview) <= now
    )
    setReviewQueue(shuffleArray(dueCards.length > 0 ? dueCards : cards))
    setCurrentIndex(0)
    setIsFlipped(false)
  }, [cards])

  const currentCard = reviewQueue[currentIndex]

  const handleFlip = useCallback(() => {
    setIsFlipped((prev) => !prev)
  }, [])

  const handleRating = useCallback(
    async (rating: Rating) => {
      if (!currentCard || isSubmitting) return
      setIsSubmitting(true)

      try {
        await submitReview(currentCard.id, rating)
      } catch (error) {
        console.error('提交评分失败:', error)
      }

      setTimeout(() => {
        if (currentIndex < reviewQueue.length - 1) {
          setCurrentIndex((prev) => prev + 1)
          setIsFlipped(false)
        } else {
          setReviewQueue([])
        }
        setIsSubmitting(false)
      }, 100)
    },
    [currentCard, currentIndex, reviewQueue.length, isSubmitting]
  )

  if (reviewQueue.length === 0) {
    return (
      <div className="review-container">
        <div className="empty-state">
          <div className="empty-state-title">🎉 复习完成！</div>
          <p>{deckTitle} 中的所有卡片都已复习完毕</p>
        </div>
      </div>
    )
  }

  if (!currentCard) {
    return null
  }

  return (
    <div className="review-container">
      <div className="review-progress">
        {deckTitle} · {currentIndex + 1} / {reviewQueue.length}
      </div>

      <div className="flashcard-wrapper">
        <div
          className={`flashcard ${isFlipped ? 'flipped' : ''}`}
          onClick={handleFlip}
        >
          <div className="flashcard-face flashcard-front">
            {currentCard.front}
          </div>
          <div className="flashcard-face flashcard-back">
            {currentCard.back}
          </div>
        </div>
      </div>

      {!isFlipped ? (
        <div className="flip-hint">点击卡片翻转查看答案</div>
      ) : (
        <div className="rating-buttons">
          <button
            className="rating-btn hard"
            onClick={() => handleRating('hard')}
            disabled={isSubmitting}
          >
            困难
          </button>
          <button
            className="rating-btn good"
            onClick={() => handleRating('good')}
            disabled={isSubmitting}
          >
            良好
          </button>
          <button
            className="rating-btn easy"
            onClick={() => handleRating('easy')}
            disabled={isSubmitting}
          >
            简单
          </button>
        </div>
      )}
    </div>
  )
}

export default ReviewSession
