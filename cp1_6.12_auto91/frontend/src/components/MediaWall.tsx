import { useMemo, useState, useEffect, useRef } from 'react';
import type { MediaItem, EmotionType } from '../types';
import { EMOTION_COLORS, EMOTION_EMOJI, EMOTION_LABELS_CN } from '../types';

type EmotionKey = Exclude<EmotionType, 'all'>;

interface MediaWallProps {
  items: MediaItem[];
}

const getBorderColor = (emotion: string): string => {
  switch (emotion) {
    case 'joy':
      return '#4caf50';
    case 'sadness':
      return '#2196f3';
    case 'anger':
      return '#f44336';
    case 'surprise':
      return '#ffc107';
    case 'fear':
      return '#9c27b0';
    default:
      return '#9e9e9e';
  }
};

export default function MediaWall({ items }: MediaWallProps) {
  const [visible, setVisible] = useState(false);
  const renderStartRef = useRef(0);
  const renderEndRef = useRef(0);
  const [loadedCount, setLoadedCount] = useState(0);

  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  useEffect(() => {
    renderEndRef.current = performance.now();
    if (renderStartRef.current > 0) {
      const duration = renderEndRef.current - renderStartRef.current;
      console.debug(
        `[性能] 媒体墙渲染完成: ${duration.toFixed(2)}ms (${items.length} 张图片)`
      );
    }
  });

  const handleImageLoad = () => {
    setLoadedCount((prev) => prev + 1);
  };

  useEffect(() => {
    if (loadedCount > 0 && loadedCount === items.length) {
      console.debug(`[性能] 媒体墙图片全部加载完成 (${loadedCount} 张)`);
    }
  }, [loadedCount, items.length]);

  renderStartRef.current = performance.now();

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
      {items.map((item, index) => {
        const borderColor = getBorderColor(item.emotion);
        return (
          <div
            key={item.id}
            className="media-card"
            style={{
              borderColor: borderColor,
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
              onLoad={handleImageLoad}
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect fill='%230f3460' width='400' height='300'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%2340c4ff' font-size='40'%3E🎵%3C/text%3E%3C/svg%3E`;
                handleImageLoad();
              }}
            />
            <div className="media-overlay">
              <div className="overlay-emoji">
                {EMOTION_EMOJI[item.emotion as EmotionKey] || '😊'}
              </div>
              <div className="overlay-caption">{item.caption}</div>
            </div>
            <div className="media-caption-bar">
              <span style={{ color: borderColor }}>
                {EMOTION_LABELS_CN[item.emotion as EmotionKey]}
              </span>
              <span className="caption-likes">❤ {item.likes}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
