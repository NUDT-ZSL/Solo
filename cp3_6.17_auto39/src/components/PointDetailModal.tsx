import React from 'react';
import { KnowledgePoint, DIFFICULTY_COLORS, DIFFICULTY_LABELS, Difficulty } from '../types';

interface PointDetailModalProps {
  point: KnowledgePoint | null;
  onClose: () => void;
  onMarkReviewed?: () => void;
  isReviewed?: boolean;
  showReviewButton?: boolean;
}

const PointDetailModal: React.FC<PointDetailModalProps> = ({
  point,
  onClose,
  onMarkReviewed,
  isReviewed = false,
  showReviewButton = false
}) => {
  if (!point) return null;

  const difficulty = point.difficulty as Difficulty;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center'
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 380,
          backgroundColor: '#fff',
          borderRadius: 12,
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          padding: 24,
          marginRight: 24,
          maxHeight: '80vh',
          overflowY: 'auto',
          animation: 'slideIn 0.3s ease-out'
        }}
      >
        <style>{`
          @keyframes slideIn {
            from {
              transform: translateX(100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
        `}</style>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <h2 style={{ fontSize: 20, color: '#212121', margin: 0, flex: 1 }}>{point.title}</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 20,
              cursor: 'pointer',
              color: '#9e9e9e',
              padding: 4
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ marginBottom: 16 }}>
          <span
            style={{
              display: 'inline-block',
              padding: '4px 12px',
              borderRadius: 12,
              backgroundColor: DIFFICULTY_COLORS[difficulty],
              color: '#fff',
              fontSize: 12,
              fontWeight: 500
            }}
          >
            {DIFFICULTY_LABELS[difficulty]}
          </span>
        </div>

        <div style={{ marginBottom: 16 }}>
          <h4 style={{ fontSize: 14, color: '#757575', marginBottom: 8, fontWeight: 500 }}>详情描述</h4>
          <p style={{ fontSize: 14, color: '#212121', lineHeight: 1.6, margin: 0 }}>
            {point.description}
          </p>
        </div>

        {point.tags.length > 0 && (
          <div>
            <h4 style={{ fontSize: 14, color: '#757575', marginBottom: 8, fontWeight: 500 }}>相关标签</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {point.tags.map((tag, idx) => (
                <span
                  key={idx}
                  style={{
                    padding: '4px 10px',
                    backgroundColor: '#e3f2fd',
                    color: '#1976d2',
                    borderRadius: 4,
                    fontSize: 12
                  }}
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {showReviewButton && (
          <div style={{ marginTop: 24 }}>
            {isReviewed ? (
              <div
                style={{
                  padding: 12,
                  backgroundColor: '#e8f5e9',
                  color: '#388e3c',
                  borderRadius: 8,
                  textAlign: 'center',
                  fontSize: 14
                }}
              >
                ✓ 已完成复习
              </div>
            ) : (
              <button
                onClick={onMarkReviewed}
                style={{
                  width: '100%',
                  padding: 12,
                  backgroundColor: '#4caf50',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                完成复习
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PointDetailModal;
