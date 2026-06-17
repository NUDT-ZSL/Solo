import { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import type { Artwork } from '../data/mockData';
import { styleTags } from '../data/mockData';
import ArtworkDetailModal from './ArtworkDetailModal';

interface PortfolioGridProps {
  onCommission: (artwork: Artwork) => void;
}

export default function PortfolioGrid({ onCommission }: PortfolioGridProps) {
  const artworks = useStore((state) => state.artworks);
  const activeFilter = useStore((state) => state.activeFilter);
  const toggleFilter = useStore((state) => state.toggleFilter);

  const filteredArtworks = useMemo(() => {
    if (!activeFilter) return artworks;
    return artworks.filter((a) => a.styles.includes(activeFilter));
  }, [artworks, activeFilter]);

  const [selectedArtwork, setSelectedArtwork] = useState<Artwork | null>(null);

  const handleTagClick = (style: string, e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFilter(style);
  };

  const handleCommissionFromModal = () => {
    if (selectedArtwork) {
      onCommission(selectedArtwork);
      setSelectedArtwork(null);
    }
  };

  return (
    <div className="portfolio-wrapper">
      <div className="portfolio-header">
        <h1 className="portfolio-title">艺作工坊</h1>
        <p className="portfolio-subtitle">发现独特的艺术风格，定制专属创作</p>
      </div>

      <div className="filter-bar">
        <span className="filter-label">风格筛选:</span>
        <div className="filter-tags">
          {styleTags.map((tag) => (
            <button
              key={tag}
              type="button"
              className={`filter-tag ${activeFilter === tag ? 'active' : ''}`}
              onClick={() => toggleFilter(tag)}
            >
              {tag}
            </button>
          ))}
        </div>
        {activeFilter && (
          <button className="filter-clear" onClick={() => toggleFilter(activeFilter)}>
            清除筛选
          </button>
        )}
      </div>

      <div className="portfolio-result-info">
        {activeFilter ? (
          <span>筛选「{activeFilter}」共 {filteredArtworks.length} 件作品</span>
        ) : (
          <span>共 {filteredArtworks.length} 件作品</span>
        )}
      </div>

      <div className="masonry-grid">
        {filteredArtworks.map((artwork, index) => (
          <div
            key={artwork.id}
            className="artwork-card"
            style={{ animationDelay: `${index * 0.05}s` }}
            onClick={() => setSelectedArtwork(artwork)}
          >
            <div className="artwork-thumbnail">
              <img src={artwork.thumbnail} alt={artwork.shortTitle} loading="lazy" />
              <button
                type="button"
                className="commission-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onCommission(artwork);
                }}
              >
                发起委托
              </button>
            </div>
            <div className="artwork-info">
              <div className="artwork-author">
                <img src={artwork.author.avatar} alt={artwork.author.name} />
                <span>{artwork.author.name}</span>
              </div>
              <h3 className="artwork-title">{artwork.shortTitle}</h3>
              <div className="artwork-tags">
                {artwork.styles.map((style) => (
                  <button
                    key={style}
                    type="button"
                    className={`tag tag-btn ${activeFilter === style ? 'active' : ''}`}
                    onClick={(e) => handleTagClick(style, e)}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedArtwork && (
        <ArtworkDetailModal
          artwork={selectedArtwork}
          onClose={() => setSelectedArtwork(null)}
          onCommission={handleCommissionFromModal}
        />
      )}
    </div>
  );
}
