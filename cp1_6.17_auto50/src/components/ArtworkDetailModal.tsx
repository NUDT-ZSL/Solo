import { useEffect } from 'react';
import type { Artwork } from '../data/mockData';

interface ArtworkDetailModalProps {
  artwork: Artwork;
  onClose: () => void;
  onCommission: () => void;
}

export default function ArtworkDetailModal({ artwork, onClose, onCommission }: ArtworkDetailModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div className="artwork-modal-overlay" onClick={onClose}>
      <div className="artwork-modal" onClick={(e) => e.stopPropagation()}>
        <button className="artwork-modal-close" onClick={onClose}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        <div className="artwork-modal-image">
          <img src={artwork.thumbnail} alt={artwork.title} />
        </div>
        <div className="artwork-modal-content">
          <h2 className="artwork-modal-title">{artwork.title}</h2>
          <p className="artwork-modal-subtitle">{artwork.shortTitle}</p>

          <div className="artwork-modal-author">
            <img src={artwork.author.avatar} alt={artwork.author.name} />
            <div>
              <p className="author-name">{artwork.author.name}</p>
              <p className="author-bio">{artwork.author.bio}</p>
            </div>
          </div>

          <div className="artwork-modal-section">
            <h4>作品描述</h4>
            <p className="artwork-modal-description">{artwork.description}</p>
          </div>

          <div className="artwork-modal-section">
            <h4>风格标签</h4>
            <div className="artwork-modal-tags">
              {artwork.styles.map((style) => (
                <span key={style} className="tag">{style}</span>
              ))}
            </div>
          </div>

          <button className="btn-primary artwork-modal-cta" onClick={onCommission}>
            发起委托
          </button>
        </div>
      </div>
    </div>
  );
}
