import React, { useEffect, useState } from 'react';
import { Artwork } from '../services/api';

interface ArtworkPopupProps {
  artwork: Artwork | null;
  onClose: () => void;
}

const EASING = 'cubic-bezier(0.4, 0, 0.2, 1)';

const ArtworkPopup: React.FC<ArtworkPopupProps> = ({ artwork, onClose }) => {
  const [phase, setPhase] = useState<'entering' | 'visible' | 'exiting'>('entering');

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setPhase('visible'));
    });
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (!artwork) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        triggerExit();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [artwork, phase]);

  const triggerExit = () => {
    if (phase === 'exiting' || phase === 'entering') {
      onClose();
      return;
    }
    setPhase('exiting');
  };

  const handleTransitionEnd = (e: React.TransitionEvent) => {
    if (e.propertyName === 'transform' && phase === 'exiting') {
      onClose();
    }
  };

  if (!artwork) return null;

  const backdropStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    background: 'rgba(0,0,0,0.6)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    opacity: phase === 'visible' ? 1 : 0,
    transition: `opacity 0.25s ${EASING}`,
  };

  const getCardTransform = () => {
    switch (phase) {
      case 'entering':
        return 'scale(0.85)';
      case 'visible':
        return 'scale(1)';
      case 'exiting':
        return 'scale(0.6)';
    }
  };

  const getCardOpacity = () => {
    switch (phase) {
      case 'entering':
        return 0;
      case 'visible':
        return 1;
      case 'exiting':
        return 0;
    }
  };

  const cardStyle: React.CSSProperties = {
    maxWidth: 600,
    width: '90%',
    background: '#FAF8F2',
    borderRadius: 8,
    border: '2px solid #C5A55A',
    overflow: 'hidden',
    position: 'relative',
    transform: getCardTransform(),
    opacity: getCardOpacity(),
    transition: `transform 0.3s ${EASING}, opacity 0.3s ${EASING}`,
    fontFamily: '"Georgia", "Times New Roman", serif',
  };

  const imageStyle: React.CSSProperties = {
    width: '100%',
    maxHeight: 350,
    objectFit: 'contain',
    display: 'block',
    background: '#F0EDE5',
  };

  const contentStyle: React.CSSProperties = {
    padding: '24px 32px 32px',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: 24,
    color: '#3E2723',
    fontWeight: 'bold',
    margin: '0 0 8px',
    fontFamily: '"Georgia", "Times New Roman", serif',
  };

  const artistStyle: React.CSSProperties = {
    fontSize: 16,
    color: '#5D4037',
    margin: '0 0 4px',
    fontFamily: '"Georgia", "Times New Roman", serif',
  };

  const yearStyle: React.CSSProperties = {
    fontSize: 14,
    color: '#8D6E63',
    margin: '0 0 16px',
    fontFamily: '"Georgia", "Times New Roman", serif',
  };

  const descriptionStyle: React.CSSProperties = {
    fontSize: 14,
    color: '#4E342E',
    lineHeight: 1.8,
    margin: 0,
    fontFamily: '"Georgia", "Times New Roman", serif',
  };

  const closeButtonStyle: React.CSSProperties = {
    position: 'absolute',
    top: 12,
    right: 12,
    background: 'none',
    border: 'none',
    color: '#C5A55A',
    fontSize: 24,
    cursor: 'pointer',
    lineHeight: 1,
    padding: '4px 8px',
    zIndex: 1,
    fontFamily: '"Georgia", "Times New Roman", serif',
  };

  return (
    <div style={backdropStyle} onClick={triggerExit}>
      <div style={cardStyle} onClick={(e) => e.stopPropagation()} onTransitionEnd={handleTransitionEnd}>
        <button style={closeButtonStyle} onClick={triggerExit}>
          ✕
        </button>
        {artwork.imageUrl && <img src={artwork.imageUrl} alt={artwork.title} style={imageStyle} />}
        <div style={contentStyle}>
          <h2 style={titleStyle}>{artwork.title}</h2>
          <p style={artistStyle}>{artwork.artist}</p>
          <p style={yearStyle}>{artwork.year}</p>
          <p style={descriptionStyle}>{artwork.description}</p>
        </div>
      </div>
    </div>
  );
};

export default ArtworkPopup;
