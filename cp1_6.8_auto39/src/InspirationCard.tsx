import React, { useState } from 'react';

interface InspirationData {
  id: string;
  content: string;
  emoji: string;
  sentiment: string;
  created_at: string;
  resonance_count: number;
  has_resonance?: boolean;
  user_id: string;
}

interface InspirationCardProps {
  data: InspirationData;
  onResonance: (id: string) => void;
  onClose: () => void;
}

const SENTIMENT_LABEL: Record<string, string> = {
  positive: '✦ 积极暖黄',
  neutral: '✦ 中性淡蓝',
  negative: '✦ 消极暗紫',
};

const InspirationCard: React.FC<InspirationCardProps> = ({ data, onResonance, onClose }) => {
  const [resonating, setResonating] = useState(false);
  const [hasResonated, setHasResonated] = useState(data.has_resonance || false);

  const formatTime = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleString('zh-CN', {
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  const handleResonance = () => {
    if (hasResonated || resonating) return;
    setResonating(true);
    onResonance(data.id);
    setTimeout(() => {
      setResonating(false);
      setHasResonated(true);
    }, 800);
  };

  const sentimentClass = `sentiment-${data.sentiment}`;

  return (
    <div className="modal-overlay" onClick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}>
      <div className="editor-modal" style={{ animation: 'slideUp 0.3s ease' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <span style={{ fontSize: 36 }}>{data.emoji}</span>
          <span className={`star-card-sentiment ${sentimentClass}`}>
            {SENTIMENT_LABEL[data.sentiment] || '✦ 未知'}
          </span>
        </div>

        <p style={{
          fontSize: 16,
          lineHeight: 1.8,
          marginBottom: 16,
          color: 'var(--text-primary)',
        }}>
          {data.content}
        </p>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 20,
        }}>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            {formatTime(data.created_at)}
          </span>
          <span style={{ fontSize: 12, color: 'var(--accent-pink)' }}>
            ♥ {data.resonance_count} 次共鸣
          </span>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="submit-btn"
            style={{
              flex: 1,
              background: hasResonated
                ? 'linear-gradient(135deg, var(--accent-pink), var(--accent-purple))'
                : 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))',
              opacity: resonating ? 0.6 : 1,
              transform: resonating ? 'scale(0.96)' : undefined,
              transition: 'all 0.3s ease',
            }}
            onClick={handleResonance}
            disabled={hasResonated || resonating}
          >
            {hasResonated ? '已共鸣 ✧' : resonating ? '共鸣中...' : '共鸣 ✧'}
          </button>
          <button
            className="submit-btn"
            style={{
              flex: 0,
              padding: '10px 20px',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid var(--glass-border)',
            }}
            onClick={onClose}
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};

export default InspirationCard;
