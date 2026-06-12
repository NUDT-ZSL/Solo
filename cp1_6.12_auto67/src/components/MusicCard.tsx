import React, { useState, useEffect, useRef } from 'react';
import type { MusicRecord } from '../types';

interface MusicCardProps {
  record: MusicRecord;
  index: number;
  onDelete: (id: number) => void;
  onTagClick: (tag: string) => void;
}

const sceneGradients: Record<string, string> = {
  '雨夜': 'linear-gradient(135deg, #1a1a2e 0%, #2c3e50 50%, #0f3460 100%)',
  '公路旅行': 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  '晨跑': 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
  '自习': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'rainy_night': 'linear-gradient(135deg, #1a1a2e 0%, #2c3e50 50%, #0f3460 100%)',
  'road_trip': 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'morning_run': 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
  'study': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
};

const sceneNames: Record<string, string> = {
  'rainy_night': '雨夜',
  'road_trip': '公路旅行',
  'morning_run': '晨跑',
  'study': '自习',
};

const StarRating: React.FC<{
  rating: number;
  onRate?: (rating: number) => void;
  interactive?: boolean;
}> = ({ rating, onRate, interactive = false }) => {
  const [animatedStars, setAnimatedStars] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);

  useEffect(() => {
    setAnimatedStars(0);
    const timers: NodeJS.Timeout[] = [];
    for (let i = 1; i <= rating; i++) {
      timers.push(setTimeout(() => {
        setAnimatedStars(i);
      }, i * 80));
    }
    return () => timers.forEach(t => clearTimeout(t));
  }, [rating]);

  const displayRating = interactive && hoverRating > 0 ? hoverRating : animatedStars;

  return (
    <div className="star-rating">
      {[1, 2, 3, 4, 5].map(star => (
        <span
          key={star}
          className={`star ${star <= displayRating ? 'filled' : ''} ${interactive ? 'interactive' : ''}`}
          onClick={() => interactive && onRate && onRate(star)}
          onMouseEnter={() => interactive && setHoverRating(star)}
          onMouseLeave={() => interactive && setHoverRating(0)}
        >
          ★
        </span>
      ))}
    </div>
  );
};

const MusicCard: React.FC<MusicCardProps> = ({ record, index, onDelete, onTagClick }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const sceneName = sceneNames[record.scene] || record.scene;
  const gradient = sceneGradients[record.scene] || sceneGradients['自习'];

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, index * 100);
    return () => clearTimeout(timer);
  }, [index]);

  const handleCardClick = () => {
    setIsPressed(true);
    setTimeout(() => {
      setIsPressed(false);
      setIsExpanded(!isExpanded);
    }, 250);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  const confirmDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(record.id);
    setShowDeleteConfirm(false);
  };

  const getTagColor = (tag: string) => {
    let hash = 0;
    for (let i = 0; i < tag.length; i++) {
      hash = tag.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 80%, 60%)`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <>
      <div
        ref={cardRef}
        className={`music-card ${isExpanded ? 'expanded' : ''} ${isVisible ? 'visible' : ''} ${isPressed ? 'pressed' : ''}`}
        onClick={handleCard}
        style={{ animationDelay: `${index * 100}ms` }}
      >
        <div className="card-gradient" style={{ background: gradient }}>
          <div className="scene-badge">{sceneName}</div>
        </div>

        <div className="card-content">
          <div className="card-cover">
            {record.image ? (
              <img src={record.image} alt={record.songName} />
            ) : (
              <div className="cover-placeholder">
                <span className="music-icon">♪</span>
              </div>
            )}
          </div>

          <div className="card-info">
            <h3 className="song-title">{record.songName}</h3>
            <p className="artist-name">{record.artist}</p>

            <StarRating rating={record.rating} />

            {record.tags.length > 0 && (
              <div className="tags-container">
                {record.tags.map((tag, i) => (
                  <span
                    key={i}
                    className="tag-pill"
                    style={{ backgroundColor: getTagColor(tag) }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onTagClick(tag);
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {isExpanded && (
          <div className="card-details">
            <div className="detail-row">
              <span className="detail-label">创建时间</span>
              <span className="detail-value">{formatDate(record.createdAt)}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">情境</span>
              <span className="detail-value">{sceneName}</span>
            </div>
            <button
              className="delete-btn"
              onClick={handleDelete}
            >
              删除记录
            </button>
          </div>
        )}
      </div>

      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>确认删除</h3>
            <p>确定要删除这条记录吗？此操作无法撤销。</p>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowDeleteConfirm(false)}>
                取消
              </button>
              <button className="btn-delete" onClick={confirmDelete}>
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MusicCard;
