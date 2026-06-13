import { useEffect, useState, useCallback } from 'react';
import type { Photo } from './types';

interface SlideshowProps {
  photos: Photo[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
}

export default function Slideshow({
  photos,
  currentIndex,
  isOpen,
  onClose,
  onNext,
  onPrev,
}: SlideshowProps) {
  const [isFading, setIsFading] = useState(false);
  const [displayIndex, setDisplayIndex] = useState(currentIndex);

  const currentPhoto = photos[displayIndex];

  const handleNext = useCallback(() => {
    if (isFading || photos.length <= 1) return;
    setIsFading(true);
    setTimeout(() => {
      onNext();
      setIsFading(false);
    }, 250);
  }, [isFading, photos.length, onNext]);

  const handlePrev = useCallback(() => {
    if (isFading || photos.length <= 1) return;
    setIsFading(true);
    setTimeout(() => {
      onPrev();
      setIsFading(false);
    }, 250);
  }, [isFading, photos.length, onPrev]);

  useEffect(() => {
    setDisplayIndex(currentIndex);
  }, [currentIndex]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose, handleNext, handlePrev]);

  if (!isOpen || !currentPhoto) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#000000b3',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        animation: 'fadeInBg 0.3s ease-out',
      }}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        style={{
          position: 'absolute',
          top: 24,
          right: 24,
          width: 44,
          height: 44,
          borderRadius: '50%',
          border: 'none',
          backgroundColor: 'rgba(255,255,255,0.1)',
          color: '#ffffff',
          fontSize: 24,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background-color 0.2s ease, transform 0.1s ease',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)')}
        onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.95)')}
        onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      >
        ×
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          handlePrev();
        }}
        style={{
          position: 'absolute',
          left: 24,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 56,
          height: 56,
          borderRadius: '50%',
          border: 'none',
          backgroundColor: 'rgba(255,255,255,0.1)',
          color: '#ffffff',
          fontSize: 32,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background-color 0.2s ease, transform 0.1s ease',
          lineHeight: 1,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)')}
        onMouseDown={(e) => (e.currentTarget.style.transform = 'translateY(-50%) scale(0.95)')}
        onMouseUp={(e) => (e.currentTarget.style.transform = 'translateY(-50%) scale(1)')}
      >
        ‹
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          handleNext();
        }}
        style={{
          position: 'absolute',
          right: 24,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 56,
          height: 56,
          borderRadius: '50%',
          border: 'none',
          backgroundColor: 'rgba(255,255,255,0.1)',
          color: '#ffffff',
          fontSize: 32,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background-color 0.2s ease, transform 0.1s ease',
          lineHeight: 1,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)')}
        onMouseDown={(e) => (e.currentTarget.style.transform = 'translateY(-50%) scale(0.95)')}
        onMouseUp={(e) => (e.currentTarget.style.transform = 'translateY(-50%) scale(1)')}
      >
        ›
      </button>

      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '80vw',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 24,
        }}
      >
        <img
          src={currentPhoto.thumbnails.w1200}
          alt={currentPhoto.title}
          style={{
            maxWidth: '80vw',
            maxHeight: '70vh',
            objectFit: 'contain',
            borderRadius: '8px',
            boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
            opacity: isFading ? 0 : 1,
            transition: 'opacity 0.5s ease-in-out',
          }}
        />

        <div
          style={{
            textAlign: 'center',
            color: '#ffffff',
            opacity: isFading ? 0 : 1,
            transition: 'opacity 0.5s ease-in-out',
          }}
        >
          <h3
            style={{
              margin: 0,
              marginBottom: 8,
              fontSize: 20,
              fontWeight: 600,
              fontFamily: "'Playfair Display', serif",
            }}
          >
            {currentPhoto.title}
          </h3>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: 8,
              marginBottom: 8,
            }}
          >
            {currentPhoto.tags.map((tag) => (
              <span
                key={tag}
                style={{
                  padding: '4px 12px',
                  borderRadius: '999px',
                  backgroundColor: '#6366f1',
                  color: '#ffffff',
                  fontSize: 13,
                }}
              >
                {tag}
              </span>
            ))}
          </div>
          <p style={{ margin: 0, fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>
            拍摄于 {currentPhoto.captureDate}
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
            {displayIndex + 1} / {photos.length}
          </p>
        </div>
      </div>
    </div>
  );
}
