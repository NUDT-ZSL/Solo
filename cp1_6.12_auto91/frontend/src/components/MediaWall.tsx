import { useMemo, useState, useEffect } from 'react';
import type { MediaItem, EmotionType } from '../types';
import { EMOTION_COLORS, EMOTION_EMOJI, EMOTION_LABELS_CN } from '../types';

type EmotionKey = Exclude<EmotionType, 'all'>;

interface MediaWallProps {
  items: MediaItem[];
}

export default function MediaWall({ items }: MediaWallProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const cardColors = useMemo(() => {
    return items.map((item) => EMOTION_COLORS[item.emotion as EmotionKey] || '#9e9e9e');
  }, [items]);

  if (!items || items.length === 0) {
    return (
      <div
        className="empty-state"
        style={{
          opacity: visible ? 1 : 0,
          transition: 'opacity 400ms ease',
        }}
      >
        <div className="empty-state-icon">📷</div>
        <div>暂无匹配的媒体内容</div>
      </div>
    );
  }

  return (
    <div
      className="media-wall"
      style={{
        opacity: visible ? 1 : 0,
        transition: 'opacity 400ms ease',
      }}
    >
      {items.map((item, index) => (
        <div
          key={item.id}
          className="media-card"
          style={{
            borderColor: cardColors[index],
            animationDelay: `${index * 100}ms`,
            animationDuration: '400ms',
            animationTimingFunction: 'ease-out',
          }}
          title={item.caption}
        >
          <img
            src={item.image_url}
            alt={item.caption}
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect fill='%230f3460' width='400' height='300'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%2340c4ff' font-size='40'%3E🎵%3C/text%3E%3C/svg%3E`;
            }}
          />
          <div className="media-overlay">
            <div className="overlay-emoji">
              {EMOTION_EMOJI[item.emotion as EmotionKey] || '😊'}
            </div>
            <div className="overlay-caption">
              {item.caption}
            </div>
          </div>
          <div className="media-caption-bar">
            <span>
              {EMOTION_LABELS_CN[item.emotion as EmotionKey]}
            </span>
            <span className="caption-likes">
              ❤ {item.likes}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
