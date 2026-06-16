import React, { useState } from 'react';
import type { CoffeeLog, Flavor } from '../types';
import '../styles/cards.css';

interface CoffeeCardProps {
  log: CoffeeLog;
  index?: number;
  isLiked?: boolean;
  likeCount?: number;
  onLike?: (id: string) => void;
  onComment?: (id: string) => void;
  onChallenge?: (id: string) => void;
  onCardClick?: (id: string) => void;
}

const CoffeeCard: React.FC<CoffeeCardProps> = ({
  log,
  index = 0,
  isLiked = false,
  likeCount,
  onLike,
  onComment,
  onChallenge,
  onCardClick,
}) => {
  const [activeFlavor, setActiveFlavor] = useState<Flavor | null>(null);
  const [imgLoaded, setImgLoaded] = useState(false);

  const displayLikes = likeCount !== undefined ? likeCount : log.likes;

  const handleFlavorClick = (flavor: Flavor, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveFlavor((prev) => (prev?.name === flavor.name ? null : flavor));
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  };

  return (
    <article
      className="coffee-card"
      style={{
        animationDelay: `${Math.min(index * 60, 600)}ms`,
      }}
      onClick={() => onCardClick?.(log.id)}
    >
      <div style={{ position: 'relative', backgroundColor: 'var(--color-panel)' }}>
        {!imgLoaded && <div style={{ height: 180, backgroundColor: 'var(--color-panel)' }} />}
        <img
          src={log.photoUrl}
          alt={log.beanName}
          className="coffee-card-photo"
          loading="lazy"
          onLoad={() => setImgLoaded(true)}
          style={imgLoaded ? {} : { display: 'none' }}
        />
      </div>

      <div className="coffee-card-body">
        <h3 className="coffee-card-title">
          {log.beanName} · {log.origin}
        </h3>

        <div className="coffee-card-meta">
          <span className="coffee-card-tag">{log.roast}</span>
          <span className="coffee-card-tag">{log.process}</span>
          <span className="coffee-card-tag">{formatDate(log.createdAt)}</span>
        </div>

        <div className="coffee-card-flavors">
          {log.flavors.map((flavor) => (
            <button
              key={flavor.name}
              className={`flavor-chip ${activeFlavor?.name === flavor.name ? 'active' : ''}`}
              style={{ backgroundColor: flavor.color }}
              onClick={(e) => handleFlavorClick(flavor, e)}
            >
              {flavor.name}
            </button>
          ))}
        </div>

        {activeFlavor && (
          <div className="flavor-preview" onClick={(e) => e.stopPropagation()}>
            <div className="flavor-preview-title">
              {activeFlavor.category} · {activeFlavor.name}
            </div>
            <div className="flavor-preview-desc">{activeFlavor.description}</div>
            <div className="flavor-preview-brew">
              <strong>冲煮备注：</strong>
              {log.notes}
            </div>
          </div>
        )}

        <div className="coffee-card-brew">
          <span>🌡 {log.waterTemp}°C</span>
          <span>⚙ {log.grindSize}</span>
          <span>⏱ {log.brewTime}</span>
        </div>

        <div className="coffee-card-actions">
          <button
            className="action-btn"
            style={isLiked ? { color: '#e53935', opacity: 1 } : undefined}
            onClick={(e) => {
              e.stopPropagation();
              onLike?.(log.id);
            }}
          >
            <span className="action-btn-icon">{isLiked ? '♥' : '♡'}</span>
            <span>{displayLikes}</span>
            <span className="action-tooltip">{isLiked ? '取消点赞' : '点赞'}</span>
          </button>
          <button
            className="action-btn"
            onClick={(e) => {
              e.stopPropagation();
              onComment?.(log.id);
            }}
          >
            <span className="action-btn-icon">💬</span>
            <span>{log.comments}</span>
            <span className="action-tooltip">评论</span>
          </button>
          <button
            className="action-btn"
            onClick={(e) => {
              e.stopPropagation();
              onChallenge?.(log.id);
            }}
          >
            <span className="action-btn-icon">🎯</span>
            <span className="action-tooltip">加入挑战</span>
          </button>
        </div>
      </div>
    </article>
  );
};

export default CoffeeCard;
