import { useEffect, useState } from 'react';
import type { KnowledgePoint, Difficulty } from '../types';
import './KnowledgeDetailModal.css';

interface KnowledgeDetailModalProps {
  point: KnowledgePoint | null;
  onClose: () => void;
  onMarkReviewed?: () => void;
  showReviewButton?: boolean;
  isReviewed?: boolean;
}

const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  '初级': '#81c784',
  '中级': '#ffb74d',
  '高级': '#e57373'
};

function KnowledgeDetailModal({
  point,
  onClose,
  onMarkReviewed,
  showReviewButton = false,
  isReviewed = false
}: KnowledgeDetailModalProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (point) {
      requestAnimationFrame(() => {
        setIsVisible(true);
      });
    } else {
      setIsVisible(false);
    }
  }, [point]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  if (!point) return null;

  return (
    <div
      className={`modal-backdrop ${isVisible ? 'visible' : ''}`}
      onClick={handleBackdropClick}
    >
      <div className={`detail-modal ${isVisible ? 'visible' : ''}`}>
        <button className="modal-close-btn" onClick={handleClose}>
          ✕
        </button>

        <div className="modal-header">
          <h2 className="modal-title">{point.title}</h2>
          <span
            className="difficulty-badge"
            style={{ backgroundColor: DIFFICULTY_COLORS[point.difficulty] }}
          >
            {point.difficulty}
          </span>
        </div>

        <div className="modal-body">
          <p className="modal-description">{point.description}</p>

          <div className="modal-tags">
            <h4 className="tags-title">相关标签</h4>
            <div className="tags-list">
              {point.tags.map((tag, index) => (
                <span key={index} className="tag-chip">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        {showReviewButton && (
          <div className="modal-footer">
            {isReviewed ? (
              <button className="review-btn reviewed" disabled>
                ✓ 已复习
              </button>
            ) : (
              <button className="review-btn" onClick={onMarkReviewed}>
                完成复习
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default KnowledgeDetailModal;
