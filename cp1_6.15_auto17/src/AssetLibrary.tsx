import React, { useState, useMemo, useCallback } from 'react';
import { Artwork, FilterState } from './types';
import { artworks, genreLabels, yearRanges } from './data/artworks';

interface AssetLibraryProps {
  onDragStart: (artwork: Artwork) => void;
  onDragEnd: () => void;
}

const AssetLibrary: React.FC<AssetLibraryProps> = ({ onDragStart, onDragEnd }) => {
  const [filter, setFilter] = useState<FilterState>({
    genre: 'all',
    yearRange: [1400, 2000]
  });

  const [animatingItems, setAnimatingItems] = useState<Set<string>>(new Set());
  const [filterKey, setFilterKey] = useState(0);

  const filteredArtworks = useMemo(() => {
    return artworks.filter(art => {
      const genreMatch = filter.genre === 'all' || art.genre === filter.genre;
      const yearMatch = art.year >= filter.yearRange[0] && art.year <= filter.yearRange[1];
      return genreMatch && yearMatch;
    });
  }, [filter]);

  const handleFilterChange = useCallback((newFilter: Partial<FilterState>) => {
    const allIds = new Set(artworks.map(a => a.id));
    setAnimatingItems(allIds);
    
    setTimeout(() => {
      setFilter(prev => ({ ...prev, ...newFilter }));
      setFilterKey(prev => prev + 1);
      
      setTimeout(() => {
        setAnimatingItems(new Set());
      }, 250);
    }, 125);
  }, []);

  const handleDragStart = useCallback((e: React.DragEvent, artwork: Artwork) => {
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('application/json', JSON.stringify(artwork));
    onDragStart(artwork);
  }, [onDragStart]);

  const renderThumbnail = (artwork: Artwork) => {
    const isAnimating = animatingItems.has(artwork.id);
    const isVisible = filteredArtworks.some(a => a.id === artwork.id);
    
    return (
      <div
        key={`${artwork.id}-${filterKey}`}
        draggable
        onDragStart={(e) => handleDragStart(e, artwork)}
        onDragEnd={onDragEnd}
        className="artwork-card"
        style={{
          opacity: isAnimating ? 0 : 1,
          transform: isAnimating ? 'scale(0.8)' : 'scale(1)',
          transition: 'opacity 0.25s ease, transform 0.25s ease',
          display: isVisible || isAnimating ? 'block' : 'none',
          cursor: 'grab'
        }}
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
        <p className="library-subtitle">{filteredArtworks.length} / {artworks.length} 件艺术品</p>
      </div>

      <div className="filter-section">
        <div className="filter-group">
          <label>流派</label>
          <div className="filter-buttons">
            {Object.entries(genreLabels).map(([key, label]) => (
              <button
                key={key}
                className={`filter-btn ${filter.genre === key ? 'active' : ''}`}
                onClick={() => handleFilterChange({ genre: key as FilterState['genre'] })}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-group">
          <label>年代</label>
          <div className="filter-buttons">
            {yearRanges.map(({ label, range }) => (
              <button
                key={label}
                className={`filter-btn ${
                  filter.yearRange[0] === range[0] && filter.yearRange[1] === range[1] ? 'active' : ''
                }`}
                onClick={() => handleFilterChange({ yearRange: range })}
              >
                {label}
              </button>
            ))}
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
          transition: all 0.2s ease;
          border-radius: 2px;
        }

        .filter-btn:hover {
          border-color: #F5F0EB;
          color: #F5F0EB;
        }

        .filter-btn.active {
          background: #5C4F44;
          border-color: #5C4F44;
          color: #F5F0EB;
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
          background: #5C4F44;
          border-radius: 2px;
        }

        .artwork-card {
          background: #1A1A1A;
          border-radius: 4px;
          overflow: hidden;
          user-select: none;
          transition: all 0.2s ease;
        }

        .artwork-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }

        .artwork-card:active {
          cursor: 'grabbing';
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
