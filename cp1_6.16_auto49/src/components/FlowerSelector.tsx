import React, { useRef, useEffect } from 'react';
import type { Flower, SelectedFlower } from '../types';
import { FLOWER_COLORS } from '../types';

interface FlowerSelectorProps {
  flowers: Flower[];
  selectedIds: string[];
  onToggle: (flower: Flower) => void;
  onRemove: (flowerId: string) => void;
  selectedFlowers: SelectedFlower[];
}

function generateThumbnail(color: string): string {
  const canvas = document.createElement('canvas');
  canvas.width = 60;
  canvas.height = 60;
  const ctx = canvas.getContext('2d')!;
  const colors = FLOWER_COLORS[color] || FLOWER_COLORS.white;

  const gradient = ctx.createRadialGradient(30, 25, 5, 30, 30, 25);
  gradient.addColorStop(0, colors.inner);
  gradient.addColorStop(1, colors.outer);
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(30, 25, 18, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#27AE60';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(30, 43);
  ctx.lineTo(30, 58);
  ctx.stroke();

  return canvas.toDataURL();
}

const FlowerSelector: React.FC<FlowerSelectorProps> = ({
  flowers,
  selectedIds,
  onToggle,
  onRemove,
  selectedFlowers,
}) => {
  const thumbnailCache = useRef<Record<string, string>>({});

  useEffect(() => {
    flowers.forEach((f) => {
      if (!thumbnailCache.current[f.id]) {
        thumbnailCache.current[f.id] = generateThumbnail(f.color);
      }
    });
  }, [flowers]);

  return (
    <div className="flower-selector">
      <h2 className="section-title">🌸 选择花材</h2>
      <div className="flower-grid">
        {flowers.map((flower) => {
          const isSelected = selectedIds.includes(flower.id);
          return (
            <div
              key={flower.id}
              className={`flower-card ${isSelected ? 'selected' : ''}`}
              onClick={() => onToggle(flower)}
            >
              {isSelected && (
                <div className="check-mark">✓</div>
              )}
              <img
                src={thumbnailCache.current[flower.id]}
                alt={flower.name}
                className="flower-thumbnail"
              />
              <div className="flower-name">{flower.name}</div>
              <div className="flower-price">¥{flower.price}/支</div>
              <div className="flower-season">{flower.season}</div>
            </div>
          );
        })}
      </div>

      {selectedFlowers.length > 0 && (
        <div className="selected-list">
          <h3 className="selected-title">已选花材</h3>
          {selectedFlowers.map((sf) => (
            <div key={sf.id} className="selected-item">
              <span>{sf.name} × {sf.quantity}</span>
              <button
                className="remove-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(sf.id);
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FlowerSelector;
