import React, { useState, useEffect, useCallback } from 'react';
import { Theme, ExtractedColor } from '../themeEngine';

export interface Artwork {
  id: string;
  title: string;
  colors: string[];
  thumbnailColor: string;
  createdAt: number;
}

interface PortfolioGridProps {
  artworks: Artwork[];
  currentTheme: Theme;
  extractedColors: ExtractedColor[];
  onArtworkClick: (artwork: Artwork) => void;
}

const PortfolioGrid: React.FC<PortfolioGridProps> = ({
  artworks,
  currentTheme: _currentTheme,
  extractedColors,
  onArtworkClick,
}) => {
  const [lightboxArtwork, setLightboxArtwork] = useState<Artwork | null>(null);
  const [isLightboxClosing, setIsLightboxClosing] = useState(false);

  const handleCardClick = useCallback((artwork: Artwork) => {
    setLightboxArtwork(artwork);
    onArtworkClick(artwork);
  }, [onArtworkClick]);

  const handleCloseLightbox = useCallback(() => {
    setIsLightboxClosing(true);
    setTimeout(() => {
      setLightboxArtwork(null);
      setIsLightboxClosing(false);
    }, 300);
  }, []);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleCloseLightbox();
    }
  }, [handleCloseLightbox]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && lightboxArtwork && !isLightboxClosing) {
        handleCloseLightbox();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxArtwork, isLightboxClosing, handleCloseLightbox]);

  const getGradientColors = (artwork: Artwork) => {
    const colors = artwork.colors.length >= 2 
      ? artwork.colors 
      : [artwork.thumbnailColor, '#FFFFFF'];
    return `linear-gradient(135deg, ${colors[0]}, ${colors[1]})`;
  };

  return (
    <>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '20px',
        }}
      >
        {artworks.map((artwork, index) => (
          <div
            key={artwork.id}
            onClick={() => handleCardClick(artwork)}
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '12px',
              overflow: 'hidden',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              animation: `fadeInUp 0.5s ease ${index * 0.05}s both`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)';
              e.currentTarget.style.borderColor = 'var(--color-secondary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.borderColor = 'var(--color-border)';
            }}
          >
            <div
              style={{
                width: '100%',
                paddingBottom: '100%',
                position: 'relative',
                background: getGradientColors(artwork),
                transition: 'background 0.3s ease',
              }}
              onMouseEnter={(e) => {
                if (extractedColors.length >= 2) {
                  e.currentTarget.style.background = `linear-gradient(135deg, ${extractedColors[0].hex}, ${extractedColors[1].hex})`;
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = getGradientColors(artwork);
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div
                  style={{
                    width: '160px',
                    height: '160px',
                    backgroundColor: artwork.thumbnailColor,
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  }}
                />
              </div>
            </div>
            <div
              style={{
                padding: '16px',
              }}
            >
              <h3
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontWeight: 700,
                  fontSize: '18px',
                  margin: 0,
                  color: 'var(--color-text)',
                  transition: 'color 0.3s ease',
                }}
              >
                {artwork.title}
              </h3>
              <div
                style={{
                  display: 'flex',
                  gap: '4px',
                  marginTop: '12px',
                }}
              >
                {artwork.colors.slice(0, 5).map((color, ci) => (
                  <div
                    key={ci}
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '4px',
                      backgroundColor: color,
                      transition: 'transform 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.2)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {lightboxArtwork && (
        <>
          <div
            onClick={handleBackdropClick}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: '#111111',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: isLightboxClosing ? 'fadeOut 0.3s ease forwards' : 'fadeIn 0.4s ease',
            }}
          >
            <button
              onClick={handleCloseLightbox}
              style={{
                position: 'absolute',
                top: '24px',
                right: '24px',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: 'rgba(255,255,255,0.1)',
                color: '#FFFFFF',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                transition: 'background-color 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
              }}
            >
              ×
            </button>
            
            <div
              style={{
                animation: isLightboxClosing ? 'zoomOut 0.3s ease forwards' : 'zoomIn 0.4s ease',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                maxWidth: '90vw',
                maxHeight: '90vh',
              }}
            >
              <div
                style={{
                  width: '400px',
                  height: '400px',
                  maxWidth: '80vw',
                  maxHeight: '60vh',
                  background: getGradientColors(lightboxArtwork),
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                }}
              >
                <div
                  style={{
                    width: '320px',
                    height: '320px',
                    maxWidth: '70vw',
                    maxHeight: '50vh',
                    backgroundColor: lightboxArtwork.thumbnailColor,
                    borderRadius: '12px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                  }}
                />
              </div>
              
              <h2
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontWeight: 700,
                  fontSize: '32px',
                  color: '#FFFFFF',
                  marginTop: '24px',
                  marginBottom: '16px',
                  textAlign: 'center',
                }}
              >
                {lightboxArtwork.title}
              </h2>
              
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                }}
              >
                {lightboxArtwork.colors.map((color, ci) => (
                  <div
                    key={ci}
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '8px',
                      backgroundColor: color,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                    }}
                    title={color}
                  />
                ))}
              </div>
            </div>
          </div>
          
          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes fadeOut {
              from { opacity: 1; }
              to { opacity: 0; }
            }
            @keyframes zoomIn {
              from { opacity: 0; transform: scale(0.9); }
              to { opacity: 1; transform: scale(1); }
            }
            @keyframes zoomOut {
              from { opacity: 1; transform: scale(1); }
              to { opacity: 0; transform: scale(0.9); }
            }
            @keyframes fadeInUp {
              from {
                opacity: 0;
                transform: translateY(20px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
          `}</style>
        </>
      )}
    </>
  );
};

export default PortfolioGrid;
