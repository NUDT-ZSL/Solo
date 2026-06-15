import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Artwork, FilterState } from './types';
import { artworks, genreLabels, yearRanges } from './data/artworks';

type AnimationPhase = 'idle' | 'fading-out' | 'fading-in';

interface AssetLibraryProps {
  onDragStart: (artwork: Artwork) => void;
  onDragEnd: () => void;
}

const ANIMATION_DURATION = 250;

const AssetLibrary: React.FC<AssetLibraryProps> = ({ onDragStart, onDragEnd }) => {
  const [filter, setFilter] = useState<FilterState>({
    genre: 'all',
    yearRange: [1400, 2000]
  });

  const [displayFilter, setDisplayFilter] = useState<FilterState>({
    genre: 'all',
    yearRange: [1400, 2000]
  });

  const [animationPhase, setAnimationPhase] = useState<AnimationPhase>('idle');
  const [animProgress, setAnimProgress] = useState(1);
  const rafRef = useRef<number | null>(null);
  const animStartTimeRef = useRef<number>(0);
  const animStartProgressRef = useRef<number>(1);
  const animDirectionRef = useRef<'in' | 'out'>('in');
  const pendingFilterRef = useRef<FilterState | null>(null);

  const currentArtworks = useMemo(() => {
    return artworks.filter(art => {
      const genreMatch = filter.genre === 'all' || art.genre === filter.genre;
      const yearMatch = art.year >= filter.yearRange[0] && art.year <= filter.yearRange[1];
      return genreMatch && yearMatch;
    });
  }, [filter]);

  const displayArtworks = useMemo(() => {
    return artworks.filter(art => {
      const genreMatch = displayFilter.genre === 'all' || art.genre === displayFilter.genre;
      const yearMatch = art.year >= displayFilter.yearRange[0] && art.year <= displayFilter.yearRange[1];
      return genreMatch && yearMatch;
    });
  }, [displayFilter]);

  const cancelAnimation = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => cancelAnimation();
  }, [cancelAnimation]);

  const runFadeAnimation = useCallback((direction: 'in' | 'out', onComplete: () => void) => {
    cancelAnimation();
    animStartTimeRef.current = performance.now();
    animStartProgressRef.current = animProgress;
    animDirectionRef.current = direction;

    const targetProgress = direction === 'out' ? 0 : 1;
    const startProgress = animStartProgressRef.current;
    const totalDistance = Math.abs(targetProgress - startProgress);
    const adjustedDuration = totalDistance * ANIMATION_DURATION;

    const animate = (now: number) => {
      const elapsed = now - animStartTimeRef.current;
      const rawProgress = adjustedDuration === 0 ? 1 : Math.min(1, elapsed / adjustedDuration);
      const current = startProgress + (targetProgress - startProgress) * rawProgress;
      setAnimProgress(current);

      if (rawProgress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        rafRef.current = null;
        onComplete();
      }
    };
    rafRef.current = requestAnimationFrame(animate);
  }, [cancelAnimation, animProgress]);

  const handleFilterChange = useCallback((newFilter: Partial<FilterState>) => {
    const updatedFilter = { ...filter, ...newFilter };
    const isSame = 
      updatedFilter.genre === filter.genre &&
      updatedFilter.yearRange[0] === filter.yearRange[0] &&
      updatedFilter.yearRange[1] === filter.yearRange[1];
    
    if (isSame) return;

    pendingFilterRef.current = updatedFilter;
    setFilter(updatedFilter);

    if (animationPhase === 'idle') {
      setAnimationPhase('fading-out');
      runFadeAnimation('out', () => {
        const finalFilter = pendingFilterRef.current!;
        setDisplayFilter(finalFilter);
        setAnimationPhase('fading-in');

        runFadeAnimation('in', () => {
          pendingFilterRef.current = null;
          setAnimationPhase('idle');
        });
      });
    } else if (animationPhase === 'fading-in') {
      setAnimationPhase('fading-out');
      cancelAnimation();
      runFadeAnimation('out', () => {
        const finalFilter = pendingFilterRef.current!;
        setDisplayFilter(finalFilter);
        setAnimationPhase('fading-in');

        runFadeAnimation('in', () => {
          pendingFilterRef.current = null;
          setAnimationPhase('idle');
        });
      });
    }
  }, [filter, animationPhase, runFadeAnimation, cancelAnimation]);

  const handleDragStart = useCallback((e: React.DragEvent, artwork: Artwork) => {
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('application/json', JSON.stringify(artwork));
    const dragImage = e.currentTarget.cloneNode(true) as HTMLElement;
    dragImage.style.opacity = '0';
    dragImage.style.position = 'absolute';
    dragImage.style.top = '-9999px';
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 0, 0);
    setTimeout(() => document.body.removeChild(dragImage), 0);
    onDragStart(artwork);
  }, [onDragStart]);

  const getTransformStyle = (artwork: Artwork): React.CSSProperties => {
    const isInNew = currentArtworks.some(a => a.id === artwork.id);
    const isInDisplay = displayArtworks.some(a => a.id === artwork.id);
    
    let scale: number;
    let opacity: number;

    if (animationPhase === 'idle') {
      scale = isInDisplay ? 1 : 0;
      opacity = isInDisplay ? 1 : 0;
    } else if (animationPhase === 'fading-out') {
      scale = isInDisplay ? 0.6 + 0.4 * animProgress : 0;
      opacity = isInDisplay ? animProgress : 0;
    } else {
      scale = isInNew ? 0.6 + 0.4 * animProgress : 0;
      opacity = isInNew ? animProgress : 0;
    }

    return {
      transform: `scale(${scale})`,
      opacity,
      visibility: scale === 0 && opacity === 0 ? 'hidden' : 'visible',
      position: 'relative' as const
    };
  };

  const renderThumbnail = (artwork: Artwork) => {
    const style = getTransformStyle(artwork);
    const isVisible = style.visibility !== 'hidden';
    
    return (
      <div
        key={artwork.id}
        draggable={isVisible}
        onDragStart={isVisible ? (e) => handleDragStart(e, artwork) : undefined}
        onDragEnd={onDragEnd}
        className="artwork-card"
        style={style}
      >
        <div className="artwork-thumbnail">
          {artwork.type === 'painting' ? (
            <div 
              className="painting-thumb"
              style={{ backgroundColor: artwork.color }}
            />
          ) : (
            <div 
              className="sculpture-thumb"
              style={{ backgroundColor: artwork.color }}
            />
          )}
        </div>
        <div className="artwork-info">
          <div className="artwork-title">{artwork.title}</div>
          <div className="artwork-artist">{artwork.artist}</div>
          <div className="artwork-year">{artwork.year}</div>
        </div>
      </div>
    );
  };

  return (
    <div className="asset-library">
      <div className="library-header">
        <h2>素材库</h2>
        <p className="library-subtitle">{currentArtworks.length} / {artworks.length} 件艺术品</p>
      </div>

      <div className="filter-section">
        <div className="filter-group">
          <label>流派</label>
          <div className="filter-buttons">
            {Object.entries(genreLabels).map(([key, label]) => {
              const isActive = filter.genre === key;
              const isDisabled = animationPhase !== 'idle';
              return (
                <button
                  key={key}
                  className={`filter-btn ${isActive ? 'active' : ''}`}
                  onClick={() => handleFilterChange({ genre: key as FilterState['genre'] })}
                  disabled={isDisabled}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="filter-group">
          <label>年代</label>
          <div className="filter-buttons">
            {yearRanges.map(({ label, range }) => {
              const isActive = filter.yearRange[0] === range[0] && filter.yearRange[1] === range[1];
              const isDisabled = animationPhase !== 'idle';
              return (
                <button
                  key={label}
                  className={`filter-btn ${isActive ? 'active' : ''}`}
                  onClick={() => handleFilterChange({ yearRange: range })}
                  disabled={isDisabled}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="artworks-grid">
        {artworks.map(artwork => renderThumbnail(artwork))}
      </div>

      <style>{`
        .asset-library {
          width: 320px;
          height: 100vh;
          background: #2C2C2C;
          color: #F5F0EB;
          display: flex;
          flex-direction: column;
          padding: 20px;
          box-sizing: border-box;
          overflow-y: auto;
        }

        .library-header {
          margin-bottom: 20px;
          flex-shrink: 0;
        }

        .library-header h2 {
          font-family: 'Playfair Display', serif;
          font-size: 24px;
          font-weight: 600;
          margin: 0 0 4px 0;
          color: #F5F0EB;
        }

        .library-subtitle {
          font-family: 'Cormorant Garamond', serif;
          font-size: 14px;
          font-style: italic;
          color: #8B7D72;
          margin: 0;
        }

        .filter-section {
          margin-bottom: 20px;
          flex-shrink: 0;
        }

        .filter-group {
          margin-bottom: 16px;
        }

        .filter-group label {
          display: block;
          font-family: 'Cormorant Garamond', serif;
          font-size: 14px;
          font-weight: 500;
          margin-bottom: 8px;
          color: #8B7D72;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .filter-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .filter-btn {
          padding: 6px 12px;
          border: 1px solid #8B7D72;
          background: transparent;
          color: #8B7D72;
          font-family: 'Cormorant Garamond', serif;
          font-size: 13px;
          cursor: pointer;
          border-radius: 2px;
          transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease, opacity 0.2s ease;
        }

        .filter-btn:hover:not(:disabled) {
          background: #8B7D72;
          border-color: #8B7D72;
          color: #F5F0EB;
        }

        .filter-btn:active:not(:disabled) {
          background: #5C4F44;
          border-color: #5C4F44;
          color: #F5F0EB;
        }

        .filter-btn.active {
          background: #8B7D72;
          border-color: #8B7D72;
          color: #F5F0EB;
        }

        .filter-btn.active:hover {
          background: #5C4F44;
          border-color: #5C4F44;
        }

        .filter-btn:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }

        .artworks-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          flex: 1;
          overflow-y: auto;
          padding-right: 4px;
        }

        .artworks-grid::-webkit-scrollbar {
          width: 4px;
        }

        .artworks-grid::-webkit-scrollbar-track {
          background: #1A1A1A;
        }

        .artworks-grid::-webkit-scrollbar-thumb {
          background: #8B7D72;
          border-radius: 2px;
          transition: background-color 0.2s ease;
        }

        .artworks-grid::-webkit-scrollbar-thumb:hover {
          background: #5C4F44;
        }

        .artwork-card {
          background: #1A1A1A;
          border-radius: 4px;
          overflow: hidden;
          user-select: none;
          will-change: transform, opacity;
          transform-origin: center center;
        }

        .artwork-card:not([style*="visibility: hidden"]):not([style*="scale(0)"]) {
          transition: box-shadow 0.2s ease;
          cursor: grab;
        }

        .artwork-card:not([style*="visibility: hidden"]):not([style*="scale(0)"]):hover {
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
        }

        .artwork-card:not([style*="visibility: hidden"]):not([style*="scale(0)"]):active {
          cursor: grabbing;
        }

        .artwork-thumbnail {
          aspect-ratio: 1;
          background: #3A3A3A;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 12px;
          box-sizing: border-box;
        }

        .painting-thumb {
          width: 100%;
          height: 100%;
          border: 4px solid #8B7D72;
          box-sizing: border-box;
        }

        .sculpture-thumb {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          border: 3px solid #8B7D72;
          box-sizing: border-box;
        }

        .artwork-info {
          padding: 10px;
        }

        .artwork-title {
          font-family: 'Playfair Display', serif;
          font-size: 13px;
          font-weight: 500;
          color: #F5F0EB;
          margin-bottom: 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .artwork-artist {
          font-family: 'Cormorant Garamond', serif;
          font-size: 12px;
          color: #8B7D72;
          font-style: italic;
          margin-bottom: 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .artwork-year {
          font-family: 'Cormorant Garamond', serif;
          font-size: 11px;
          color: #5C4F44;
        }
      `}</style>
    </div>
  );
};

export default AssetLibrary;
