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
  const [displayIndex, setDisplayIndex] = useState(0);
  const [nextIndex, setNextIndex] = useState<number | null>(null);
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [activeAuctionCount, setActiveAuctionCount] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const transitionRef = useRef<number | null>(null);

  const curator = db.getUser(gallery.curatorId);

  useEffect(() => {
    const galleryArtworks = db.getArtworksByGallery(gallery.id);
    const positioned = galleryArtworks.filter(a => a.positionIndex !== null);
    setArtworks(positioned.slice(0, 5));
    setActiveAuctionCount(db.getActiveAuctionCountForGallery(gallery.id));
  }, [gallery.id]);

  useEffect(() => {
    return () => {
      if (transitionRef.current) {
        clearTimeout(transitionRef.current);
      }
    };
  }, []);

  const switchTo = (targetIndex: number) => {
    if (isTransitioning || artworks.length <= 1) return;
    if (targetIndex === displayIndex) return;

    setIsTransitioning(true);
    setNextIndex(targetIndex);

    transitionRef.current = window.setTimeout(() => {
      setDisplayIndex(targetIndex);
      setCurrentIndex(targetIndex);
      setNextIndex(null);
      setIsTransitioning(false);
    }, 300);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    const target = (displayIndex - 1 + artworks.length) % artworks.length;
    switchTo(target);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    const target = (displayIndex + 1) % artworks.length;
    switchTo(target);
  };

  const handleDotClick = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    switchTo(index);
  };

  const handleClick = () => {
    navigate(`/gallery/${gallery.id}`);
  };

  const currentArtwork = artworks[displayIndex];
  const nextArtwork = nextIndex !== null ? artworks[nextIndex] : null;

  return (
    <div className="gallery-card" onClick={handleClick}>
      <div className="gallery-card__carousel">
        {currentArtwork && (
          <div
            className={`gallery-card__artwork gallery-card__artwork--current ${isTransitioning ? 'fading-out' : ''}`}
            style={{ backgroundColor: currentArtwork.color }}
          >
            <span className="gallery-card__artwork-title">{currentArtwork.title}</span>
          </div>
        )}

        {nextArtwork && (
          <div
            className="gallery-card__artwork gallery-card__artwork--next fading-in"
            style={{ backgroundColor: nextArtwork.color }}
          >
            <span className="gallery-card__artwork-title">{nextArtwork.title}</span>
          </div>
        )}
        
        {!currentArtwork && !nextArtwork && (
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
              <button
                key={index}
                className={`gallery-card__dot ${index === displayIndex ? 'active' : ''}`}
                onClick={(e) => handleDotClick(e, index)}
                aria-label={`第${index + 1}张`}
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
