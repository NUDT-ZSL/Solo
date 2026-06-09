import { useState, useEffect, useMemo } from 'react';
import type { Hall, Artwork } from '../types';

interface GalleryRoomProps {
  hall: Hall;
  transitioning: boolean;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  duration: number;
  delay: number;
}

export default function GalleryRoom({ hall, transitioning }: GalleryRoomProps) {
  const [selectedArtwork, setSelectedArtwork] = useState<Artwork | null>(null);

  const particles = useMemo<Particle[]>(() => {
    const count = hall.particleType === 'pixels' ? 40 : 25;
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * (hall.particleType === 'petals' ? 14 : 6) + 2,
      opacity: Math.random() * 0.5 + 0.3,
      duration: Math.random() * 15 + 10,
      delay: Math.random() * 10
    }));
  }, [hall.id, hall.particleType]);

  useEffect(() => {
    setSelectedArtwork(null);
  }, [hall.id]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setSelectedArtwork(null);
    }
  };

  return (
    <div
      className={`room-container ${transitioning ? 'fade-out' : 'fade-in'}`}
      style={{
        background: `linear-gradient(135deg, ${hall.gradientFrom} 0%, ${hall.gradientTo} 100%)`
      }}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <div className="particle-background">
        {particles.map((p) => {
          const isPetal = hall.particleType === 'petals';
          const isPixel = hall.particleType === 'pixels';
          return (
            <div
              key={p.id}
              className="particle"
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                width: `${p.size}px`,
                height: isPetal ? `${p.size * 0.7}px` : `${p.size}px`,
                borderRadius: isPetal ? '50% 0 50% 50%' : isPixel ? '2px' : '50%',
                background: isPixel
                  ? `rgba(255,255,255,${p.opacity})`
                  : isPetal
                  ? `rgba(255, 200, 150, ${p.opacity})`
                  : `rgba(255,255,255,${p.opacity})`,
                boxShadow: !isPixel && !isPetal ? `0 0 ${p.size * 2}px rgba(255,255,255,${p.opacity * 0.5})` : 'none',
                animation: `floatParticle ${p.duration}s ease-in-out ${p.delay}s infinite alternate`,
                transform: isPetal ? 'rotate(45deg)' : 'none'
              }}
            />
          );
        })}
      </div>

      <div className="artwork-grid">
        {hall.artworks.map((artwork) => (
          <div
            key={artwork.id}
            className="artwork-card"
            onClick={() => setSelectedArtwork(artwork)}
          >
            <img
              src={artwork.image}
              alt={artwork.title}
              className="artwork-image"
            />
            <div className="artwork-title">{artwork.title}</div>
          </div>
        ))}
      </div>

      {selectedArtwork && (
        <div
          className="modal-overlay"
          onClick={() => setSelectedArtwork(null)}
        >
          <button
            className="modal-close"
            onClick={() => setSelectedArtwork(null)}
          >
            ×
          </button>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <img
              src={selectedArtwork.image}
              alt={selectedArtwork.title}
              className="modal-image"
            />
            <div className="modal-info">
              <h2 className="modal-title">{selectedArtwork.title}</h2>
              <p className="modal-artist">作者：{selectedArtwork.artist}</p>
              <p className="modal-year">年代：{selectedArtwork.year}</p>
              <p className="modal-description">{selectedArtwork.description}</p>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes floatParticle {
          0% {
            transform: translate(0, 0) ${hall.particleType === 'petals' ? 'rotate(45deg)' : ''};
          }
          25% {
            transform: translate(${Math.random() > 0.5 ? '' : '-'}${10 + Math.random() * 20}px, -${20 + Math.random() * 30}px) ${hall.particleType === 'petals' ? `rotate(${45 + Math.random() * 90}deg)` : ''};
          }
          50% {
            transform: translate(${Math.random() > 0.5 ? '' : '-'}${20 + Math.random() * 30}px, -${40 + Math.random() * 40}px) ${hall.particleType === 'petals' ? `rotate(${45 + Math.random() * 180}deg)` : ''};
          }
          75% {
            transform: translate(${Math.random() > 0.5 ? '' : '-'}${10 + Math.random() * 20}px, -${20 + Math.random() * 30}px) ${hall.particleType === 'petals' ? `rotate(${45 + Math.random() * 270}deg)` : ''};
          }
          100% {
            transform: translate(0, 0) ${hall.particleType === 'petals' ? 'rotate(405deg)' : ''};
          }
        }
      `}</style>
    </div>
  );
}
