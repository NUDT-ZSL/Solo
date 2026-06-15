import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { cardsApi, reviewApi, Card } from '../api';
import { useAuth } from '../App';

export default function ReviewPage() {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();
  const { refreshStats } = useAuth();

  const [cards, setCards] = useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reviewedCount, setReviewedCount] = useState(0);

  useEffect(() => {
    if (!deckId) return;

    const fetchReviewCards = async () => {
      try {
        const data = await cardsApi.getReviewCards(deckId);
        setCards(data);
      } catch (err) {
        console.error('Failed to fetch review cards:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchReviewCards();
  }, [deckId]);

  const currentCard = cards[currentIndex] as Card | undefined;

  const handleShowAnswer = useCallback(() => {
    setIsFlipped(true);
  }, []);

  const handleDifficulty = useCallback(async (rating: 'easy' | 'medium' | 'hard') => {
    if (!currentCard || !deckId) return;

    try {
      await reviewApi.submitReview({
        cardId: currentCard.id,
        deckId,
        rating,
      });

      setReviewedCount((prev) => prev + 1);
      setIsFlipped(false);

      if (currentIndex + 1 < cards.length) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        setCards([]);
      }

      await refreshStats();
    } catch (err) {
      console.error('Failed to submit review:', err);
    }
  }, [currentCard, deckId, currentIndex, cards.length, refreshStats]);

  if (loading) {
    return (
      <div className="review-container">
        <div className="empty-state">
          <div className="empty-state-icon">⏳</div>
          <p className="empty-state-text">加载复习卡片中...</p>
        </div>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="review-container">
        <button className="back-btn" onClick={() => navigate('/')}>
          ← 返回仪表盘
        </button>
        <div className="review-complete">
          <h2>🎉 复习完成！</h2>
          <p>你已完成本次所有复习，共复习了 {reviewedCount} 个单词</p>
          <button className="btn btn-primary" onClick={() => navigate('/')}>
            返回仪表盘
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="review-container">
      <button className="back-btn" onClick={() => navigate('/')}>
        ← 返回仪表盘
      </button>

      <div className="review-progress">
        {currentIndex + 1} / {cards.length}
      </div>

      <div className="flashcard-wrapper">
        <div
          className={`flashcard ${isFlipped ? 'flipped' : ''}`}
          onClick={!isFlipped ? handleShowAnswer : undefined}
        >
          <div className="flashcard-face flashcard-front">
            <div className="flashcard-word">{currentCard?.word}</div>
            <div className="flashcard-hint">点击卡片查看释义</div>
          </div>
          <div className="flashcard-face flashcard-back">
            <div className="flashcard-meaning">{currentCard?.meaning}</div>
            {currentCard?.example && (
              <div className="flashcard-example">{currentCard.example}</div>
            )}
          </div>
        </div>
      </div>

      <div className="review-actions">
        {!isFlipped ? (
          <button className="btn btn-primary" onClick={handleShowAnswer}>
            显示答案
          </button>
        ) : (
          <div className="difficulty-buttons">
            <button
              className="difficulty-btn btn-hard"
              onClick={() => handleDifficulty('hard')}
            >
              困难
            </button>
            <button
              className="difficulty-btn btn-medium"
              onClick={() => handleDifficulty('medium')}
            >
              一般
            </button>
            <button
              className="difficulty-btn btn-easy"
              onClick={() => handleDifficulty('easy')}
            >
              简单
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
