import { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useHotkeys } from 'react-hotkeys-hook';
import PhotoCard from './PhotoCard';
import type { Album } from '../data/albums';

interface AlbumViewerProps {
  album: Album;
  onBack: () => void;
}

interface Ripple {
  id: number;
  x: number;
  y: number;
  side: 'left' | 'right';
}

export default function AlbumViewer({ album, onBack }: AlbumViewerProps) {
  const { photos } = album;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<'next' | 'prev'>('next');
  const [isFlipping, setIsFlipping] = useState(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const autoPlayTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rippleIdRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const preloadImages = async () => {
      await Promise.all(
        photos.map(
          (photo) =>
            new Promise<void>((resolve) => {
              const img = new Image();
              img.onload = () => resolve();
              img.onerror = () => resolve();
              img.src = photo.url;
            }),
        ),
      );
    };
    preloadImages();
  }, [photos]);

  const goToNext = useCallback(() => {
    if (isFlipping) return;
    if (currentIndex < photos.length - 1) {
      setDirection('next');
      setIsFlipping(true);
      setProgress(0);
      setTimeout(() => {
        setCurrentIndex((prev) => prev + 1);
        setIsFlipping(false);
      }, 600);
    }
  }, [currentIndex, photos.length, isFlipping]);

  const goToPrev = useCallback(() => {
    if (isFlipping) return;
    if (currentIndex > 0) {
      setDirection('prev');
      setIsFlipping(true);
      setProgress(0);
      setTimeout(() => {
        setCurrentIndex((prev) => prev - 1);
        setIsFlipping(false);
      }, 600);
    }
  }, [currentIndex, isFlipping]);

  const toggleAutoPlay = useCallback(() => {
    setIsAutoPlaying((prev) => !prev);
  }, []);

  useEffect(() => {
    if (isAutoPlaying) {
      const duration = 5000;
      const startTime = Date.now();
      progressTimerRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        setProgress(Math.min(100, (elapsed / duration) * 100));
      }, 50);
      autoPlayTimerRef.current = setInterval(() => {
        if (currentIndex < photos.length - 1) {
          goToNext();
        } else {
          setIsAutoPlaying(false);
        }
      }, duration);
    } else {
      if (autoPlayTimerRef.current) {
        clearInterval(autoPlayTimerRef.current);
        autoPlayTimerRef.current = null;
      }
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
      setProgress(0);
    }
    return () => {
      if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current);
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, [isAutoPlaying, currentIndex, photos.length, goToNext]);

  useHotkeys('arrowright', goToNext);
  useHotkeys('arrowleft', goToPrev);
  useHotkeys('space', (e) => {
    e.preventDefault();
    toggleAutoPlay();
  });

  const handlePageClick = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const third = rect.width / 3;

    const ripple: Ripple = {
      id: rippleIdRef.current++,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      side: clickX < third ? 'left' : 'right',
    };
    setRipples((prev) => [...prev, ripple]);
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== ripple.id));
    }, 150);

    if (clickX < third) {
      goToPrev();
    } else if (clickX > rect.width - third) {
      goToNext();
    }
  };

  const currentPhoto = photos[currentIndex];
  const prevPhoto = currentIndex > 0 ? photos[currentIndex - 1] : null;
  const nextPhoto = currentIndex < photos.length - 1 ? photos[currentIndex + 1] : null;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: 'radial-gradient(circle at center, #0f3460 0%, #1a1a2e 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          backgroundColor: 'rgba(26, 26, 46, 0.6)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          zIndex: 100,
        }}
      >
        <button
          onClick={onBack}
          style={{
            background: 'none',
            border: 'none',
            color: '#f0f0f0',
            fontSize: '16px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '8px',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          ← 返回
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <span style={{ fontSize: '18px', fontWeight: 500, color: '#f0f0f0' }}>
            {album.title}
          </span>
          <button
            onClick={toggleAutoPlay}
            style={{
              background: 'none',
              border: 'none',
              color: '#f0f0f0',
              fontSize: '20px',
              cursor: 'pointer',
              padding: '8px 12px',
              borderRadius: '8px',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            {isAutoPlaying ? '⏸' : '▶'}
          </button>
          <span style={{ fontSize: '14px', color: '#888' }}>
            {currentIndex + 1} / {photos.length}
          </span>
        </div>
      </div>

      <div
        ref={containerRef}
        onClick={handlePageClick}
        style={{
          position: 'absolute',
          inset: '60px 0 3px 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          perspective: '2000px',
          cursor: 'pointer',
        }}
      >
        <div
          style={{
            width: 'min(90vw, 1200px)',
            height: 'min(75vh, 700px)',
            position: 'relative',
            transformStyle: 'preserve-3d',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: '50%',
              height: '100%',
              backgroundColor: '#f5f5f5',
              boxShadow: 'inset -8px 0 16px rgba(0,0,0,0.08)',
              overflow: 'hidden',
              borderTopLeftRadius: '8px',
              borderBottomLeftRadius: '8px',
            }}
          >
            {prevPhoto && <PhotoCard photo={prevPhoto} />}
            {!prevPhoto && (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  backgroundColor: '#f0f0f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#999',
                  fontSize: '16px',
                }}
              >
                相册封面
              </div>
            )}
          </div>

          <AnimatePresence mode="wait">
            {direction === 'next' ? (
              <motion.div
                key={`flip-next-${currentIndex}`}
                initial={{ rotateY: 0, boxShadow: '4px 0 12px rgba(0,0,0,0.15)' }}
                animate={{
                  rotateY: -180,
                  boxShadow: '-4px 0 20px rgba(0,0,0,0.25)',
                }}
                exit={{
                  rotateY: -180,
                  boxShadow: '-4px 0 20px rgba(0,0,0,0.25)',
                }}
                transition={{ duration: 0.6, ease: [0.4, 0.0, 0.2, 1] }}
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 0,
                  width: '50%',
                  height: '100%',
                  backgroundColor: '#fff',
                  transformOrigin: 'left center',
                  transformStyle: 'preserve-3d',
                  backfaceVisibility: 'hidden',
                  overflow: 'hidden',
                  borderTopRightRadius: '8px',
                  borderBottomRightRadius: '8px',
                  zIndex: 10,
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    backfaceVisibility: 'hidden',
                  }}
                >
                  <PhotoCard photo={currentPhoto} />
                </div>
              </motion.div>
            ) : (
              <motion.div
                key={`flip-prev-${currentIndex}`}
                initial={{ rotateY: -180, boxShadow: '-4px 0 20px rgba(0,0,0,0.25)' }}
                animate={{
                  rotateY: 0,
                  boxShadow: '4px 0 12px rgba(0,0,0,0.15)',
                }}
                exit={{
                  rotateY: 0,
                  boxShadow: '4px 0 12px rgba(0,0,0,0.15)',
                }}
                transition={{ duration: 0.6, ease: [0.4, 0.0, 0.2, 1] }}
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 0,
                  width: '50%',
                  height: '100%',
                  backgroundColor: '#fff',
                  transformOrigin: 'left center',
                  transformStyle: 'preserve-3d',
                  backfaceVisibility: 'hidden',
                  overflow: 'hidden',
                  borderTopRightRadius: '8px',
                  borderBottomRightRadius: '8px',
                  zIndex: 10,
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    backfaceVisibility: 'hidden',
                  }}
                >
                  <PhotoCard photo={currentPhoto} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div
            style={{
              position: 'absolute',
              right: 0,
              top: 0,
              width: '50%',
              height: '100%',
              backgroundColor: '#f5f5f5',
              boxShadow: 'inset 8px 0 16px rgba(0,0,0,0.08)',
              overflow: 'hidden',
              borderTopRightRadius: '8px',
              borderBottomRightRadius: '8px',
              zIndex: 1,
            }}
          >
            {direction === 'next' && nextPhoto && <PhotoCard photo={nextPhoto} />}
            {direction === 'prev' && <PhotoCard photo={currentPhoto} />}
          </div>

          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: 0,
              bottom: 0,
              width: '2px',
              transform: 'translateX(-1px)',
              background: 'linear-gradient(to right, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.05) 50%, rgba(0,0,0,0.2) 100%)',
              pointerEvents: 'none',
              zIndex: 20,
            }}
          />

          <AnimatePresence>
            {ripples.map((ripple) => (
              <motion.div
                key={ripple.id}
                initial={{ scale: 0, opacity: 0.8 }}
                animate={{ scale: 1, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                style={{
                  position: 'absolute',
                  left: ripple.x - 50,
                  top: ripple.y - 50,
                  width: 100,
                  height: 100,
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255, 255, 255, 0.6)',
                  pointerEvents: 'none',
                  zIndex: 100,
                }}
              />
            ))}
          </AnimatePresence>
        </div>

        <div
          style={{
            position: 'absolute',
            left: '3%',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'rgba(255,255,255,0.3)',
            fontSize: '14px',
            pointerEvents: 'none',
          }}
        >
          ← 上一页
        </div>
        <div
          style={{
            position: 'absolute',
            right: '3%',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'rgba(255,255,255,0.3)',
            fontSize: '14px',
            pointerEvents: 'none',
          }}
        >
          下一页 →
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '3px',
          backgroundColor: 'rgba(255,255,255,0.1)',
          overflow: 'hidden',
          zIndex: 100,
        }}
      >
        <motion.div
          style={{
            width: `${isAutoPlaying ? progress : 0}%`,
            height: '100%',
            background: 'linear-gradient(to right, #667eea, #764ba2)',
          }}
          transition={{ ease: 'linear', duration: 0.05 }}
        />
      </div>
    </div>
  );
}
