import React from 'react';
import type { KnowledgePoint, Difficulty } from '../types';
import { DIFFICULTY_COLORS } from '../types';

interface KnowledgePointDetailProps {
  knowledgePoint: KnowledgePoint;
  onClose: () => void;
  showReviewButton?: boolean;
  onReview?: () => void;
  score?: number;
}

export const KnowledgePointDetail: React.FC<KnowledgePointDetailProps> = ({
  knowledgePoint,
  onClose,
  showReviewButton = false,
  onReview,
  score,
}) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="detail-modal" onClick={e => e.stopPropagation()}>
        <h2 className="detail-title">{knowledgePoint.title}</h2>
        <span
          className="detail-difficulty"
          style={{ backgroundColor: DIFFICULTY_COLORS[knowledgePoint.difficulty as Difficulty] }}
        >
          {knowledgePoint.difficulty}
        </span>
        {score !== undefined && (
          <div style={{ marginLeft: '8px', display: 'inline-block', fontSize: '12px', color: score < 60 ? '#e57373' : '#81c784', fontWeight: 600 }}>
            测评得分: {score}
          </div>
        )}
        <p className="detail-description">{knowledgePoint.description}</p>
        <div className="detail-tags">
          {knowledgePoint.tags.map(tag => (
            <span key={tag} className="detail-tag">{tag}</span>
          ))}
        </div>
        <div className="detail-actions">
          {showReviewButton && (
            <button className="btn btn-primary" onClick={onReview}>
              完成复习
            </button>
          )}
          <button className="btn btn-secondary" onClick={onClose}>
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};
