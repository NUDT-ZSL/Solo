import React from 'react';
import { Exhibit } from '../types';
import './ExhibitCard.css';

interface ExhibitCardProps {
  exhibit: Exhibit;
  onDragStart?: (e: React.MouseEvent, exhibit: Exhibit) => void;
  onClick?: () => void;
  isDragging?: boolean;
  isOnMap?: boolean;
  style?: React.CSSProperties;
  showRotationControls?: boolean;
  onRotate?: (direction: 'left' | 'right') => void;
  showRipple?: boolean;
  rippleKey?: number;
}

const ExhibitCard: React.FC<ExhibitCardProps> = ({
  exhibit,
  onDragStart,
  onClick,
  isDragging = false,
  isOnMap = false,
  style,
  showRotationControls = false,
  onRotate,
  showRipple = false,
  rippleKey = 0,
}) => {
  const handleMouseDown = (e: React.MouseEvent) => {
    if (onDragStart) {
      e.preventDefault();
      onDragStart(e, exhibit);
    }
  };

  const handleRotate = (direction: 'left' | 'right', e: React.MouseEvent) => {
    e.stopPropagation();
    if (onRotate) {
      onRotate(direction);
    }
  };

  return (
    <div
      className={`exhibit-card ${isDragging ? 'dragging' : ''} ${isOnMap ? 'on-map' : ''}`}
      onMouseDown={handleMouseDown}
      onClick={onClick}
      style={{
        ...style,
        transform: `${style?.transform || ''} rotate(${exhibit.rotation}deg)`,
      }}
    >
      <div className="exhibit-card-thumbnail">
        <span>🖼️</span>
      </div>
      <div className="exhibit-card-info">
        <div className="exhibit-card-name">{exhibit.name}</div>
        <div className="exhibit-card-artist">{exhibit.artist || '未知艺术家'}</div>
      </div>

      {showRotationControls && (
        <div className="rotation-controls">
          <button
            className="rotate-btn rotate-left"
            onClick={(e) => handleRotate('left', e)}
            title="逆时针旋转"
          >
            ↺
          </button>
          <button
            className="rotate-btn rotate-right"
            onClick={(e) => handleRotate('right', e)}
            title="顺时针旋转"
          >
            ↻
          </button>
        </div>
      )}

      {showRipple && (
        <div key={rippleKey} className="ripple-effect"></div>
      )}
    </div>
  );
};

export default ExhibitCard;
