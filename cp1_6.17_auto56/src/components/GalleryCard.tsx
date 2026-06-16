import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gallery, Artwork } from '../db/Database';
import db from '../db/Database';
import './GalleryCard.css';

interface GalleryCardProps {
  gallery: Gallery;
}

export function GalleryCard({ gallery }: GalleryCardProps) {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFading, setIsFading] = useState(false);
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [activeAuctionCount, setActiveAuctionCount] = useState(0);
  const fadeTimeoutRef = useRef<number | null>(null);

  const curator = db.getUser(gallery.curatorId);

  useEffect(() => {
    const galleryArtworks = db.getArtworksByGallery(gallery.id);
    const positioned = galleryArtworks.filter(a => a.positionIndex !== null);
    setArtworks(positioned.slice(0, 5));
    setActiveAuctionCount(db.getActiveAuctionCountForGallery(gallery.id));
  }, [gallery.id]);

  useEffect(() => {
    return () => {
      if (fadeTimeoutRef.current) {
        clearTimeout(fadeTimeoutRef.current);
      }
    };
  }, []);

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (artworks.length <= 1) return;
    
    setIsFading(true);
    fadeTimeoutRef.current = window.setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + artworks.length) % artworks.length);
      setIsFading(false);
    }, 150);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (artworks.length <= 1) return;
    
    setIsFading(true);
    fadeTimeoutRef.current = window.setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % artworks.length);
      setIsFading(false);
    }, 150);
  };

  const handleClick = () => {
    navigate(`/gallery/${gallery.id}`);
  };

  const currentArtwork = artworks[currentIndex];

  return (
    <div className="gallery-card" onClick={handleClick}>
      <div className="gallery-card__carousel">
        {currentArtwork && (
          <div
            className={`gallery-card__artwork ${isFading ? 'fading' : ''}`}
            style={{ backgroundColor: currentArtwork.color }}
          >
            <span className="gallery-card__artwork-title">{currentArtwork.title}</span>
          </div>
        )}
        
        {!currentArtwork && (
          <div className="gallery-card__artwork gallery-card__artwork--empty">
            <span>暂无作品</span>
          </div>
        )}

        {artworks.length > 1 && (
          <>
            <button
              className="gallery-card__arrow gallery-card__arrow--left"
              onClick={handlePrev}
              aria-label="上一张"
            >
              ‹
            </button>
            <button
              className="gallery-card__arrow gallery-card__arrow--right"
              onClick={handleNext}
              aria-label="下一张"
            >
              ›
            </button>
          </>
        )}

        {artworks.length > 1 && (
          <div className="gallery-card__dots">
            {artworks.map((_, index) => (
              <span
                key={index}
                className={`gallery-card__dot ${index === currentIndex ? 'active' : ''}`}
              />
            ))}
          </div>
        )}
      </div>

      <div className="gallery-card__info">
        <h3 className="gallery-card__name">{gallery.name}</h3>
        
        <div className="gallery-card__meta">
          <div className="gallery-card__curator">
            <div
              className="gallery-card__avatar"
              style={{ backgroundColor: curator?.avatar || '#ccc' }}
            >
              {curator?.name.charAt(0) || '?'}
            </div>
            <span className="gallery-card__curator-name">{curator?.name || '未知'}</span>
          </div>

          <div className="gallery-card__auction-badge">
            <span className="gallery-card__auction-icon">◆</span>
            <span>{activeAuctionCount} 件竞拍中</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GalleryCard;
