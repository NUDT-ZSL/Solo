import { useStore } from '../store/useStore';
import type { Artwork } from '../data/mockData';

interface PortfolioGridProps {
  onCommission: (artwork: Artwork) => void;
}

export default function PortfolioGrid({ onCommission }: PortfolioGridProps) {
  const artworks = useStore((state) => state.artworks);

  return (
    <div className="portfolio-wrapper">
      <div className="portfolio-header">
        <h1 className="portfolio-title">艺作工坊</h1>
        <p className="portfolio-subtitle">发现独特的艺术风格，定制专属创作</p>
      </div>
      <div className="masonry-grid">
        {artworks.map((artwork, index) => (
          <div
            key={artwork.id}
            className="artwork-card"
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <div className="artwork-thumbnail">
              <img src={artwork.thumbnail} alt={artwork.title} loading="lazy" />
              <button
                className="commission-btn"
                onClick={() => onCommission(artwork)}
              >
                发起委托
              </button>
            </div>
            <div className="artwork-info">
              <div className="artwork-author">
                <img src={artwork.author.avatar} alt={artwork.author.name} />
                <span>{artwork.author.name}</span>
              </div>
              <h3 className="artwork-title">{artwork.title}</h3>
              <div className="artwork-tags">
                {artwork.styles.map((style) => (
                  <span key={style} className="tag">{style}</span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
