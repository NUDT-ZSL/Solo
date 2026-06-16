import { useState } from 'react';
import './ImageGrid.css';

interface ImageGridProps {
  images: string[];
  size?: number;
  max?: number;
}

function ImageGrid({ images, size = 120, max = 3 }: ImageGridProps) {
  const displayImages = images.slice(0, max);
  const remaining = images.length - max;

  if (images.length === 0) {
    return null;
  }

  return (
    <div className="image-grid" style={{ gridTemplateColumns: `repeat(${Math.min(displayImages.length, 3)}, ${size}px)` }}>
      {displayImages.map((src, idx) => (
        <div
          key={idx}
          className="image-grid__item"
          style={{ width: size, height: size }}
        >
          <img
            src={src}
            alt={`图片 ${idx + 1}`}
            className="image-grid__img"
            loading="lazy"
          />
          {idx === max - 1 && remaining > 0 && (
            <div className="image-grid__overlay">
              <span className="image-grid__overlay-text">+{remaining}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default ImageGrid;
