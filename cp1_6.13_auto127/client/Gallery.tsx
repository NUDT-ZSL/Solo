import { useEffect, useRef, useCallback, useState } from 'react';
import type { Photo, Tag } from './types';

interface GalleryProps {
  photos: Photo[];
  tags: Tag[];
  selectedTags: string[];
  isLoading: boolean;
  hasMore: boolean;
  onTagToggle: (tag: string) => void;
  onPhotoClick: (photo: Photo, index: number) => void;
  onLoadMore: () => void;
}

export default function Gallery({
  photos,
  tags,
  selectedTags,
  isLoading,
  hasMore,
  onTagToggle,
  onPhotoClick,
  onLoadMore,
}: GalleryProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleScroll = useCallback(() => {
    if (isLoading || !hasMore) return;
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const windowHeight = window.innerHeight;
    const docHeight = document.documentElement.scrollHeight;
    if (scrollTop + windowHeight >= docHeight - 200) {
      onLoadMore();
    }
  }, [isLoading, hasMore, onLoadMore]);

  useEffect(() => {
    let lastCall = 0;
    const throttledScroll = () => {
      const now = Date.now();
      if (now - lastCall >= 100) {
        lastCall = now;
        handleScroll();
      }
    };
    window.addEventListener('scroll', throttledScroll, { passive: true });
    return () => window.removeEventListener('scroll', throttledScroll);
  }, [handleScroll]);

  const cardWidth = isMobile ? 160 : 280;
  const gap = isMobile ? 8 : 16;

  const galleryStyle: React.CSSProperties = {
    columnCount: 'auto',
    columnWidth: `${cardWidth}px`,
    columnGap: `${gap}px`,
    width: '100%',
    maxWidth: '1200px',
    margin: '0 auto',
    padding: `${gap}px`,
  };

  const cardStyle = (photo: Photo): React.CSSProperties => ({
    width: `${cardWidth}px`,
    height: `${cardWidth / photo.aspectRatio}px`,
    borderRadius: '12px',
    backgroundColor: '#ffffff',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    overflow: 'hidden',
    marginBottom: `${gap}px`,
    breakInside: 'avoid',
    cursor: 'pointer',
    transition: 'box-shadow 0.3s ease-out, transform 0.3s ease-out',
    position: 'relative',
    animation: 'fadeIn 0.4s ease-out',
  });

  return (
    <div ref={scrollContainerRef} style={{ width: '100%' }}>
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: isMobile ? '16px 8px' : '24px 16px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          position: 'sticky',
          top: 64,
          backgroundColor: 'rgba(248, 250, 252, 0.9)',
          backdropFilter: 'blur(8px)',
          zIndex: 50,
        }}
      >
        <button
          onClick={() => selectedTags.length > 0 && selectedTags.forEach(t => onTagToggle(t))}
          style={{
            padding: '6px 16px',
            borderRadius: '999px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 500,
            transition: 'all 0.2s ease',
            backgroundColor: selectedTags.length === 0 ? '#6366f1' : '#e2e8f0',
            color: selectedTags.length === 0 ? '#ffffff' : '#1e293b',
            minHeight: '32px',
          }}
          onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.97)')}
          onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          全部
        </button>
        {tags.map((tag) => {
          const isSelected = selectedTags.includes(tag.name);
          return (
            <button
              key={tag.name}
              onClick={() => onTagToggle(tag.name)}
              style={{
                padding: '6px 16px',
                borderRadius: '999px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
                transition: 'all 0.2s ease',
                backgroundColor: isSelected ? '#6366f1' : '#e2e8f0',
                color: isSelected ? '#ffffff' : '#1e293b',
                minHeight: '32px',
              }}
              onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.97)')}
              onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              {tag.name} <span style={{ opacity: 0.7, fontSize: '12px' }}>({tag.count})</span>
            </button>
          );
        })}
      </div>

      <div style={galleryStyle}>
        {photos.map((photo, index) => (
          <div
            key={photo.id}
            style={cardStyle(photo)}
            onClick={() => onPhotoClick(photo, index)}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)';
              e.currentTarget.style.transform = 'scale(1.02)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'scale(0.99)';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'scale(1.02)';
            }}
          >
            <img
              src={photo.thumbnails.w600}
              alt={photo.title}
              loading="lazy"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
              }}
            />
          </div>
        ))}
      </div>

      {isLoading && (
        <div
          style={{
            textAlign: 'center',
            padding: '32px',
            color: '#64748b',
            fontSize: '14px',
          }}
        >
          加载中...
        </div>
      )}

      {!hasMore && photos.length > 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '32px',
            color: '#94a3b8',
            fontSize: '14px',
          }}
        >
          — 已经到底啦 —
        </div>
      )}

      {photos.length === 0 && !isLoading && (
        <div
          style={{
            textAlign: 'center',
            padding: '64px 16px',
            color: '#64748b',
            fontSize: '16px',
          }}
        >
          {selectedTags.length > 0 ? '没有匹配该标签的作品' : '还没有上传任何作品，点击右上角上传按钮开始吧'}
        </div>
      )}
    </div>
  );
}
