import React from 'react';
import type { ClothingItem } from '../types';
import { useLazyImage } from '../hooks/useLazyLoad';

interface CardGalleryProps {
  items: ClothingItem[];
  onItemClick: (item: ClothingItem) => void;
}

interface LazyImageCardProps {
  item: ClothingItem;
  onClick: () => void;
}

const LazyImageCard: React.FC<LazyImageCardProps> = ({ item, onClick }) => {
  const [imgRef, imageSrc, isLoaded] = useLazyImage(item.imageUrl);

  return (
    <div className="item-card" onClick={onClick}>
      <img
        ref={imgRef}
        src={imageSrc}
        alt={item.name}
        className={isLoaded ? 'loaded' : 'loading'}
        loading="lazy"
      />
    </div>
  );
};

export const CardGallery: React.FC<CardGalleryProps> = ({ items, onItemClick }) => {
  const displayItems = items.slice(0, 12);

  return (
    <div>
      <h3 className="section-title" style={{ textAlign: 'center', marginBottom: 24 }}>
        精选单品
      </h3>
      <div className="card-gallery">
        {displayItems.map((item) => (
          <LazyImageCard
            key={item.id}
            item={item}
            onClick={() => onItemClick(item)}
          />
        ))}
      </div>
    </div>
  );
};
