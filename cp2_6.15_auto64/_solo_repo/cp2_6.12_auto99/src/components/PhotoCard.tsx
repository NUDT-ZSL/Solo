import { useState, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useHotkeys } from 'react-hotkeys-hook';
import type { Photo } from '../data/albums';

interface PhotoCardProps {
  photo: Photo;
  onClick?: () => void;
}

export default function PhotoCard({ photo, onClick }: PhotoCardProps) {
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  const handlePhotoClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsZoomed(true);
    setZoomScale(1);
  };

  const handleClose = useCallback(() => {
    setIsZoomed(false);
    setZoomScale(1);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoomScale((prev) => {
      const step = 0.1;
      let next = prev;
      if (e.deltaY < 0) {
        next = Math.min(3, prev + step);
      } else {
        next = Math.max(1, prev - step);
      }
      return Math.round(next * 10) / 10;
    });
  }, []);

  useHotkeys('escape', handleClose, { enabled: isZoomed });

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px',
        backgroundColor: '#fff',
      }}
    >
      <div
        onClick={handlePhotoClick}
        style={{
          width: '80%',
          maxHeight: '80%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          cursor: 'zoom-in',
        }}
      >
        <motion.img
          src={photo.url}
          alt={photo.title}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          style={{
            width: '100%',
            height: 'auto',
            maxHeight: '60vh',
            objectFit: 'contain',
            display: 'block',
          }}
          layoutId={`photo-${photo.id}`}
        />
        <div
          style={{
            marginTop: '16px',
            textAlign: 'center',
          }}
        >
          <h3 style={{ fontSize: '18px', color: '#333', fontWeight: 500, marginBottom: '4px' }}>
            {photo.title}
          </h3>
          <p style={{ fontSize: '14px', color: '#888' }}>
            {photo.date} · {photo.camera}
          </p>
        </div>
      </div>

      {onClick && (
        <div
          onClick={onClick}
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 0,
          }}
        />
      )}

      <AnimatePresence>
        {isZoomed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.9)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
            }}
            onClick={handleClose}
          >
            <motion.img
              src={photo.url}
              alt={photo.title}
              layoutId={`photo-${photo.id}`}
              initial={{ scale: 1 }}
              animate={{ scale: zoomScale }}
              exit={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              onWheel={handleWheel}
              style={{
                maxWidth: '90vw',
                maxHeight: '90vh',
                objectFit: 'contain',
                cursor: 'zoom-out',
              }}
              onClick={(e) => e.stopPropagation()}
            />
            <div
              style={{
                position: 'absolute',
                bottom: '32px',
                left: '50%',
                transform: 'translateX(-50%)',
                color: '#f0f0f0',
                fontSize: '14px',
                backgroundColor: 'rgba(255,255,255,0.1)',
                padding: '8px 16px',
                borderRadius: '20px',
                backdropFilter: 'blur(8px)',
              }}
            >
              {zoomScale.toFixed(1)}x · 滚轮缩放 · ESC 关闭
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
