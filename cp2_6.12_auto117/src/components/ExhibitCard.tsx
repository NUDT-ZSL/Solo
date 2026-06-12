import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Exhibit } from '../types';
import './ExhibitCard.css';

interface ExhibitCardProps {
  exhibit: Exhibit;
  isDragging?: boolean;
  isOnMap?: boolean;
  showRotation?: boolean;
  showRipple?: boolean;
  rippleKey?: number;
  onDragStart?: (e: React.MouseEvent, exhibit: Exhibit) => void;
  onClick?: () => void;
  onRotate?: (direction: 'left' | 'right') => void;
  style?: React.CSSProperties;
  className?: string;
}

const ExhibitCard: React.FC<ExhibitCardProps> = ({
  exhibit,
  isDragging = false,
  isOnMap = false,
  showRotation = false,
  showRipple = false,
  rippleKey = 0,
  onDragStart,
  onClick,
  onRotate,
  style,
  className = '',
}) => {
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if (onDragStart) {
      e.preventDefault();
      e.stopPropagation();
      onDragStart(e, exhibit);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClick) onClick();
  };

  const handleRotate = (direction: 'left' | 'right', e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (onRotate) onRotate(direction);
  };

  return (
    <div
      className={`exhibit-card ${isDragging ? 'dragging' : ''} ${isOnMap ? 'on-map' : ''} ${className}`}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      style={{
        ...style,
        transform: `${style?.transform || ''} rotate(${exhibit.rotation}deg)`,
      }}
    >
      <div className="exhibit-card-thumb">
        <span className="thumb-placeholder">🖼️</span>
      </div>
      <div className="exhibit-card-content">
        <div className="exhibit-card-name">{exhibit.name}</div>
        <div className="exhibit-card-artist">{exhibit.artist || '未知艺术家'}</div>
      </div>

      {showRotation && isOnMap && (
        <div className="rotation-controls">
          <button
            className="rotate-btn left"
            onClick={(e) => handleRotate('left', e)}
            onMouseDown={(e) => e.stopPropagation()}
            title="逆时针旋转90°"
          >
            ↺
          </button>
          <button
            className="rotate-btn right"
            onClick={(e) => handleRotate('right', e)}
            onMouseDown={(e) => e.stopPropagation()}
            title="顺时针旋转90°"
          >
            ↻
          </button>
        </div>
      )}

      {showRipple && (
        <div key={`ripple-${rippleKey}`} className="ripple-effect" />
      )}
    </div>
  );
};

export default ExhibitCard;
