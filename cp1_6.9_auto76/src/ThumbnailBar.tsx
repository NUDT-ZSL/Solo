import React from 'react';
import type { Theme } from './theme';

interface ThumbnailBarProps {
  images: string[];
  currentIndex: number;
  onSelect: (index: number) => void;
  theme: Theme;
}

const ThumbnailBar: React.FC<ThumbnailBarProps> = ({
  images,
  currentIndex,
  onSelect,
  theme,
}) => {
  if (images.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '14px 20px 18px',
        background: `linear-gradient(transparent, ${theme.shadowColor.replace('0.4', '0.15')} 30%, ${theme.shadowColor.replace('0.4', '0.25')})`,
        zIndex: 100,
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: '10px',
          overflowX: 'auto',
          padding: '6px 10px',
          maxWidth: '90vw',
          scrollbarWidth: 'thin',
          scrollbarColor: `${theme.primary} transparent`,
        }}
      >
        {images.map((src, index) => (
          <button
            key={index}
            onClick={() => onSelect(index)}
            style={{
              flexShrink: 0,
              width: '60px',
              height: '40px',
              padding: 0,
              border: index === currentIndex
                ? `2px solid ${theme.thumbnailActiveBorder}`
                : `2px solid transparent`,
              borderRadius: '4px',
              overflow: 'hidden',
              cursor: 'pointer',
              background: '#fff',
              boxShadow: index === currentIndex
                ? `0 0 10px ${theme.thumbnailActiveBorder}80, 0 2px 6px ${theme.shadowColor}`
                : `0 2px 6px ${theme.shadowColor.replace('0.4', '0.25')}`,
              transition: 'all 0.3s ease',
              transform: index === currentIndex ? 'translateY(-3px)' : 'translateY(0)',
            }}
            aria-label={`跳转到第 ${index + 1} 页`}
          >
            <img
              src={src}
              alt={`缩略图 ${index + 1}`}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
              }}
              draggable={false}
            />
          </button>
        ))}
      </div>

      <style>{`
        div::-webkit-scrollbar {
          height: 4px;
        }
        div::-webkit-scrollbar-track {
          background: transparent;
        }
        div::-webkit-scrollbar-thumb {
          background: ${theme.primary}60;
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
};

export default ThumbnailBar;
