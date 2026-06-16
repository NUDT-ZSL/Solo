import React, { useEffect } from 'react';
import { X, ImageOff } from 'lucide-react';
import type { SavedArtwork, Emotion } from '../../utils/api';

interface GalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  artworks: SavedArtwork[];
  onLoadArtwork: (artwork: SavedArtwork) => void;
  isLoading?: boolean;
}

const emotionColors: Record<Emotion, string> = {
  happy: '#fbbf24',
  sad: '#6366f1',
  angry: '#ef4444',
  calm: '#34d399',
  anxious: '#a78bfa',
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
};

const GalleryModal: React.FC<GalleryModalProps> = ({
  isOpen,
  onClose,
  artworks,
  onLoadArtwork,
  isLoading = false,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleCardClick = (artwork: SavedArtwork) => {
    onLoadArtwork(artwork);
    onClose();
  };

  const renderSkeleton = () => {
    return Array.from({ length: 6 }).map((_, index) => (
      <div
        key={index}
        style={{
          width: '180px',
          height: '140px',
          borderRadius: '8px',
          backgroundColor: '#374151',
          animation: 'pulse 1.5s ease-in-out infinite',
        }}
      />
    ));
  };

  return (
    <div
      onClick={handleOverlayClick}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: '#000000cc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        opacity: isOpen ? 1 : 0,
        pointerEvents: isOpen ? 'auto' : 'none',
        transition: 'opacity 0.2s ease',
      }}
    >
      <div
        style={{
          backgroundColor: '#1f2937',
          borderRadius: '16px',
          padding: '24px',
          maxWidth: '90vw',
          maxHeight: '80vh',
          overflow: 'auto',
          minWidth: '400px',
          transform: isOpen ? 'scale(1)' : 'scale(0.9)',
          transition: 'transform 0.2s ease',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
          }}
        >
          <h2
            style={{
              color: 'white',
              fontSize: '20px',
              fontWeight: 'bold',
              margin: 0,
            }}
          >
            作品画廊
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              borderRadius: '8px',
              padding: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#374151';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <X size={24} color="white" />
          </button>
        </div>

        {artworks.length === 0 && !isLoading ? (
          <div
            style={{
              textAlign: 'center',
              padding: '40px',
              color: '#9ca3af',
            }}
          >
            <ImageOff
              size={48}
              style={{
                marginBottom: '12px',
                opacity: 0.5,
                display: 'inline-block',
              }}
            />
            <div>暂无保存的作品</div>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, 180px)',
              gap: '16px',
              justifyContent: 'center',
            }}
          >
            {isLoading
              ? renderSkeleton()
              : artworks.map((artwork) => (
                  <div
                    key={artwork.id}
                    onClick={() => handleCardClick(artwork)}
                    style={{
                      width: '180px',
                      height: '140px',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      position: 'relative',
                      cursor: 'pointer',
                      transition: 'transform 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.02)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  >
                    <img
                      src={artwork.thumbnail}
                      alt={artwork.emotionLabel}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                      }}
                    />
                    <div
                      className="overlay"
                      style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundColor: '#00000044',
                        transition: 'background-color 0.2s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'flex-end',
                        padding: '12px',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#00000066';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#00000044';
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        top: '8px',
                        left: '8px',
                        backgroundColor: emotionColors[artwork.emotion],
                        color: 'white',
                        fontSize: '11px',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontWeight: 500,
                      }}
                    >
                      {artwork.emotionLabel}
                    </div>
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '12px',
                        left: '12px',
                        right: '12px',
                        color: 'white',
                        fontSize: '12px',
                        opacity: 0.9,
                      }}
                    >
                      {formatDate(artwork.createdAt)}
                    </div>
                  </div>
                ))}
          </div>
        )}
      </div>
      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  );
};

export default GalleryModal;
