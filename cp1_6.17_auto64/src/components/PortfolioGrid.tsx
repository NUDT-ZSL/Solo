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
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [isLightboxClosing, setIsLightboxClosing] = useState(false);

  const handleCardClick = useCallback((artwork: Artwork, index: number) => {
    setLightboxIndex(index);
    onArtworkClick(artwork);
  }, [onArtworkClick]);

  const handleCloseLightbox = useCallback(() => {
    setIsLightboxClosing(true);
    setTimeout(() => {
      setLightboxIndex(null);
      setIsLightboxClosing(false);
    }, 300);
  }, []);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleCloseLightbox();
    }
  }, [handleCloseLightbox]);

  const handlePrevArtwork = useCallback(() => {
    if (lightboxIndex === null || artworks.length <= 1) return;
    const newIndex = lightboxIndex > 0 ? lightboxIndex - 1 : artworks.length - 1;
    if (newIndex >= 0 && newIndex < artworks.length && artworks[newIndex]) {
      setLightboxIndex(newIndex);
      onArtworkClick(artworks[newIndex]);
    }
  }, [lightboxIndex, artworks, onArtworkClick]);

  const handleNextArtwork = useCallback(() => {
    if (lightboxIndex === null || artworks.length <= 1) return;
    const newIndex = lightboxIndex < artworks.length - 1 ? lightboxIndex + 1 : 0;
    if (newIndex >= 0 && newIndex < artworks.length && artworks[newIndex]) {
      setLightboxIndex(newIndex);
      onArtworkClick(artworks[newIndex]);
    }
  }, [lightboxIndex, artworks, onArtworkClick]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lightboxIndex === null || isLightboxClosing) return;
      switch (e.key) {
        case 'Escape':
          handleCloseLightbox();
          break;
        case 'ArrowLeft':
          handlePrevArtwork();
          break;
        case 'ArrowRight':
          handleNextArtwork();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, isLightboxClosing, handleCloseLightbox, handlePrevArtwork, handleNextArtwork]);

  const getGradientColors = (artwork: Artwork) => {
    const colors = artwork.colors.length >= 2
      ? artwork.colors
      : [artwork.thumbnailColor, '#FFFFFF'];
    return `linear-gradient(135deg, ${colors[0]}, ${colors[1]})`;
  };

  const currentLightboxArtwork = lightboxIndex !== null ? artworks[lightboxIndex] : null;

  return (
    <>
      <div className="portfolio-grid">
        {artworks.map((artwork, index) => (
          <div
            key={artwork.id}
            onClick={() => handleCardClick(artwork, index)}
            className="portfolio-card"
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '14px',
              overflow: 'hidden',
              cursor: 'pointer',
              transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
              animation: `fadeInUp 0.55s cubic-bezier(0.4, 0, 0.2, 1) ${index * 0.04}s both`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-6px)';
              e.currentTarget.style.boxShadow = '0 14px 36px rgba(0,0,0,0.12)';
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
                transition: 'background 0.35s ease',
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
                  className="portfolio-thumbnail"
                  style={{
                    maxWidth: '80%',
                    maxHeight: '80%',
                    aspectRatio: '1',
                    backgroundColor: artwork.thumbnailColor,
                    borderRadius: '14px',
                    boxShadow: '0 8px 28px rgba(0,0,0,0.18)',
                    transition: 'all 0.35s ease',
                  }}
                />
              </div>
              <div
                style={{
                  position: 'absolute',
                  top: '12px',
                  left: '12px',
                  padding: '4px 10px',
                  backgroundColor: 'rgba(0,0,0,0.35)',
                  backdropFilter: 'blur(8px)',
                  borderRadius: '20px',
                  color: '#FFFFFF',
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '11px',
                  fontWeight: 600,
                }}
              >
                #{index + 1}
              </div>
            </div>
            <div
              className="portfolio-card-content"
            >
              <h3
                className="portfolio-card-title"
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontWeight: 700,
                  margin: '0 0 10px 0',
                  color: 'var(--color-text)',
                  transition: 'color 0.3s ease',
                }}
              >
                {artwork.title}
              </h3>
              <div
                style={{
                  display: 'flex',
                  gap: '5px',
                }}
              >
                {artwork.colors.slice(0, 5).map((color, ci) => (
                  <div
                    key={ci}
                    style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '6px',
                      backgroundColor: color,
                      transition: 'all 0.2s ease',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.transform = 'scale(1.3) translateY(-2px)';
                      (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 10px rgba(0,0,0,0.2)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.transform = 'scale(1) translateY(0)';
                      (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.1)';
                    }}
                    title={color}
                  />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {currentLightboxArtwork && (
        <>
          <div
            onClick={handleBackdropClick}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: '#0D0D0D',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: isLightboxClosing
                ? 'fadeOut 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards'
                : 'fadeIn 0.45s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            <button
              onClick={handleCloseLightbox}
              style={{
                position: 'absolute',
                top: '24px',
                right: '24px',
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: 'rgba(255,255,255,0.1)',
                color: '#FFFFFF',
                border: 'none',
                fontSize: '26px',
                cursor: 'pointer',
                transition: 'all 0.25s ease',
                zIndex: 1002,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backdropFilter: 'blur(10px)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.2)';
                (e.currentTarget as HTMLElement).style.transform = 'rotate(90deg) scale(1.1)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.1)';
                (e.currentTarget as HTMLElement).style.transform = 'rotate(0) scale(1)';
              }}
            >
              ×
            </button>

            {artworks.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePrevArtwork();
                  }}
                  style={{
                    position: 'absolute',
                    left: '24px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255,255,255,0.12)',
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: '28px',
                    cursor: 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    zIndex: 1002,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backdropFilter: 'blur(12px)',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.25)';
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(-50%) translateX(-6px) scale(1.1)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.12)';
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(-50%) translateX(0) scale(1)';
                  }}
                  title="上一张 (←)"
                >
                  ‹
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNextArtwork();
                  }}
                  style={{
                    position: 'absolute',
                    right: '24px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255,255,255,0.12)',
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: '28px',
                    cursor: 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    zIndex: 1002,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backdropFilter: 'blur(12px)',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.25)';
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(-50%) translateX(6px) scale(1.1)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.12)';
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(-50%) translateX(0) scale(1)';
                  }}
                  title="下一张 (→)"
                >
                  ›
                </button>
              </>
            )}

            <div
              style={{
                position: 'absolute',
                top: '24px',
                left: '50%',
                transform: 'translateX(-50%)',
                padding: '8px 18px',
                backgroundColor: 'rgba(255,255,255,0.12)',
                backdropFilter: 'blur(10px)',
                borderRadius: '20px',
                color: '#FFFFFF',
                fontFamily: "'Inter', sans-serif",
                fontSize: '14px',
                fontWeight: 600,
                zIndex: 1002,
                letterSpacing: '0.5px',
              }}
            >
              {(lightboxIndex ?? 0) + 1} / {artworks.length}
            </div>

            <div
              style={{
                animation: isLightboxClosing
                  ? 'zoomOut 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards'
                  : 'zoomIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                maxWidth: '92vw',
                maxHeight: '88vh',
                gap: '28px',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  width: '460px',
                  height: '460px',
                  maxWidth: 'min(80vw, 70vh)',
                  maxHeight: 'min(80vw, 70vh)',
                  aspectRatio: '1',
                  background: getGradientColors(currentLightboxArtwork),
                  borderRadius: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 30px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.1)',
                  transition: 'all 0.5s ease',
                }}
              >
                <div
                  style={{
                    width: '72%',
                    height: '72%',
                    maxWidth: '360px',
                    maxHeight: '360px',
                    aspectRatio: '1',
                    backgroundColor: currentLightboxArtwork.thumbnailColor,
                    borderRadius: '20px',
                    boxShadow: '0 16px 48px rgba(0,0,0,0.35)',
                    transition: 'all 0.5s ease',
                  }}
                />
              </div>

              <div
                style={{
                  textAlign: 'center',
                }}
              >
                <h2
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontWeight: 700,
                    fontSize: 'clamp(24px, 5vw, 40px)',
                    color: '#FFFFFF',
                    margin: '0 0 8px 0',
                    letterSpacing: '0.5px',
                    textShadow: '0 2px 12px rgba(0,0,0,0.3)',
                  }}
                >
                  {currentLightboxArtwork.title}
                </h2>
                <p
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '14px',
                    color: 'rgba(255,255,255,0.6)',
                    margin: 0,
                    letterSpacing: '1px',
                  }}
                >
                  {currentLightboxArtwork.colors.length} 种主色调提取
                </p>
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: '10px',
                  padding: '14px 18px',
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  borderRadius: '16px',
                  backdropFilter: 'blur(12px)',
                }}
              >
                {currentLightboxArtwork.colors.map((color, ci) => (
                  <div
                    key={ci}
                    style={{
                      width: '50px',
                      height: '50px',
                      borderRadius: '12px',
                      backgroundColor: color,
                      boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      display: 'flex',
                      alignItems: 'flex-end',
                      justifyContent: 'center',
                      paddingBottom: '4px',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.transform = 'scale(1.15) translateY(-6px)';
                      (e.currentTarget as HTMLElement).style.boxShadow = '0 10px 24px rgba(0,0,0,0.35)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.transform = 'scale(1) translateY(0)';
                      (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 14px rgba(0,0,0,0.25)';
                    }}
                    title={`色值 ${ci + 1}：${color.toUpperCase()}`}
                  >
                    <span
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: '9px',
                        fontWeight: 700,
                        color: 'rgba(255,255,255,0.9)',
                        textShadow: '0 1px 3px rgba(0,0,0,0.4)',
                      }}
                    >
                      {color.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <style>{`
            .portfolio-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 20px;
              transition: grid-template-columns 0.3s ease;
            }
            @media (max-width: 768px) {
              .portfolio-grid {
                grid-template-columns: repeat(2, 1fr);
                gap: 18px;
              }
            }
            @media (max-width: 480px) {
              .portfolio-grid {
                grid-template-columns: 1fr;
                gap: 16px;
              }
            }

            .portfolio-thumbnail {
              width: 150px;
              height: 150px;
            }
            @media (max-width: 768px) {
              .portfolio-thumbnail {
                width: 160px;
                height: 160px;
              }
            }
            @media (max-width: 480px) {
              .portfolio-thumbnail {
                width: 180px;
                height: 180px;
              }
            }

            .portfolio-card-content {
              padding: 16px;
            }
            @media (max-width: 480px) {
              .portfolio-card-content {
                padding: 18px;
              }
            }

            .portfolio-card-title {
              font-size: 17px;
            }
            @media (max-width: 480px) {
              .portfolio-card-title {
                font-size: 20px;
              }
            }

            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes fadeOut {
              from { opacity: 1; }
              to { opacity: 0; }
            }
            @keyframes zoomIn {
              from {
                opacity: 0;
                transform: scale(0.85) translateY(20px);
              }
              to {
                opacity: 1;
                transform: scale(1) translateY(0);
              }
            }
            @keyframes zoomOut {
              from {
                opacity: 1;
                transform: scale(1);
              }
              to {
                opacity: 0;
                transform: scale(0.9);
              }
            }
            @keyframes fadeInUp {
              from {
                opacity: 0;
                transform: translateY(28px);
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
