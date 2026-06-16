import React from 'react';
import type { Pattern } from '../types';
import { PRODUCT_TYPE_LABELS, PRODUCT_TYPE_COLORS } from '../types';

interface PatternCardProps {
  pattern: Pattern;
  onClick: () => void;
}

export const PatternCard: React.FC<PatternCardProps> = ({ pattern, onClick }) => {
  const typeColor = PRODUCT_TYPE_COLORS[pattern.productType];
  const typeLabel = PRODUCT_TYPE_LABELS[pattern.productType];

  return (
    <div className="pattern-card fade-in" onClick={onClick}>
      <span
        className="pattern-type-tag"
        style={{ backgroundColor: typeColor }}
      >
        {typeLabel}
      </span>
      <div className="pattern-image-container">
        <img
          src={pattern.imageUrl}
          alt={pattern.name}
          className="pattern-image"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZTVlNWVhIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM5OTkiPumCruS7tuWbvueJh+WKoOi9veWlhTwvdGV4dD48L3N2Zz4=';
          }}
        />
      </div>
      <div className="pattern-info">
        <h3 className="pattern-name">{pattern.name}</h3>
        <p className="pattern-materials-count">
          共 {pattern.materials.length} 种材料
        </p>
      </div>
    </div>
  );
};
