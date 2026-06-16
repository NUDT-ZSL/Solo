import { useState } from 'react';
import dayjs from 'dayjs';
import type { CareRecord } from '../types';
import './TimelineItem.css';

interface TimelineItemProps {
  record: CareRecord;
  index?: number;
  onLike?: (id: string) => void;
}

const typeConfig: Record<string, { icon: string; label: string; color: string }> = {
  water: { icon: '💧', label: '浇水', color: '#64b5f6' },
  fertilize: { icon: '🌱', label: '施肥', color: '#81c784' },
  repot: { icon: '🪴', label: '换盆', color: '#a1887f' },
  prune: { icon: '✂️', label: '修剪', color: '#ba68c8' },
  other: { icon: '📝', label: '其他', color: '#90a4ae' },
};

function TimelineItem({ record, index = 0, onLike }: TimelineItemProps) {
  const [liked, setLiked] = useState(record.liked);
  const [likes, setLikes] = useState(record.likes);
  const config = typeConfig[record.type] || typeConfig.other;

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newLiked = !liked;
    setLiked(newLiked);
    setLikes((prev) => (newLiked ? prev + 1 : prev - 1));
    if (onLike) {
      onLike(record.id);
    }
  };

  return (
    <div
      className="timeline-item"
      style={{ '--delay': `${index * 0.1}s` } as React.CSSProperties}
    >
      <div className="timeline-item__icon" style={{ backgroundColor: config.color }}>
        <span className="timeline-item__icon-text">{config.icon}</span>
      </div>

      <div className="timeline-item__line" />

      <div className="timeline-item__content">
        <div className="timeline-item__header">
          <span className="timeline-item__type" style={{ color: config.color }}>
            {config.label}
          </span>
          <span className="timeline-item__time">
            {dayjs(record.time).format('YYYY-MM-DD HH:mm')}
          </span>
        </div>

        <p className="timeline-item__description">{record.description}</p>

        {record.note && <p className="timeline-item__note">📌 {record.note}</p>}

        <div className="timeline-item__footer">
          <button
            className={`timeline-item__like-btn ${liked ? 'timeline-item__like-btn--active' : ''}`}
            onClick={handleLike}
          >
            <span className="timeline-item__like-icon">{liked ? '❤️' : '🤍'}</span>
            <span className="timeline-item__like-text">觉得有用</span>
            {likes > 0 && <span className="timeline-item__like-count">({likes})</span>}
          </button>
        </div>
      </div>
    </div>
  );
}

export default TimelineItem;
