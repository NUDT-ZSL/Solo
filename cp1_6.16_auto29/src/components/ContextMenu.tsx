import React, { useState, useRef, useEffect } from 'react';
import { PlacedExhibit } from '../types';

interface ContextMenuProps {
  exhibit: PlacedExhibit;
  position: { x: number; y: number };
  onClose: () => void;
  onRotate: (angle: number) => void;
  onScale: (scale: number) => void;
  onBorderColor: (color: string) => void;
  onDescription: (desc: string) => void;
  onDelete: () => void;
}

const ROTATION_OPTIONS = [-15, -10, -5, 0, 5, 10, 15];
const SCALE_OPTIONS = [0.8, 0.9, 1.0, 1.1, 1.2];
const BORDER_COLORS = [
  '#FFD700',
  '#C0C0C0',
  '#B87333',
  '#FFFFFF',
  '#000000',
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1'
];

const ContextMenu: React.FC<ContextMenuProps> = ({
  exhibit,
  position,
  onClose,
  onRotate,
  onScale,
  onBorderColor,
  onDescription,
  onDelete
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [showRotation, setShowRotation] = useState(false);
  const [showScale, setShowScale] = useState(false);
  const [showBorderColor, setShowBorderColor] = useState(false);
  const [description, setDescription] = useState(exhibit.description);
  const [showDescription, setShowDescription] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const menuStyle: React.CSSProperties = {
    left: position.x,
    top: position.y
  };

  return (
    <div className="context-menu" ref={menuRef} style={menuStyle}>
      <div
        className="context-menu-item"
        onClick={() => {
          setShowRotation(!showRotation);
          setShowScale(false);
          setShowBorderColor(false);
          setShowDescription(false);
        }}
      >
        <span>🔄</span>
        <span className="context-menu-sub">
          旋转
          <span>{exhibit.rotation}°</span>
        </span>
      </div>
      {showRotation && (
        <div className="context-menu-sub-options">
          {ROTATION_OPTIONS.map(angle => (
            <div
              key={angle}
              className={`sub-option ${exhibit.rotation === angle ? 'active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                onRotate(angle);
              }}
            >
              {angle > 0 ? `+${angle}°` : `${angle}°`}
            </div>
          ))}
        </div>
      )}

      <div
        className="context-menu-item"
        onClick={() => {
          setShowScale(!showScale);
          setShowRotation(false);
          setShowBorderColor(false);
          setShowDescription(false);
        }}
      >
        <span>🔍</span>
        <span className="context-menu-sub">
          缩放
          <span>{(exhibit.scale * 100).toFixed(0)}%</span>
        </span>
      </div>
      {showScale && (
        <div className="context-menu-sub-options">
          {SCALE_OPTIONS.map(s => (
            <div
              key={s}
              className={`sub-option ${Math.abs(exhibit.scale - s) < 0.01 ? 'active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                onScale(s);
              }}
            >
              {(s * 100).toFixed(0)}%
            </div>
          ))}
        </div>
      )}

      <div
        className="context-menu-item"
        onClick={() => {
          setShowBorderColor(!showBorderColor);
          setShowRotation(false);
          setShowScale(false);
          setShowDescription(false);
        }}
      >
        <span>🎨</span>
        <span>边框颜色</span>
      </div>
      {showBorderColor && (
        <div className="color-options">
          {BORDER_COLORS.map(color => (
            <div
              key={color}
              className={`color-option ${exhibit.borderColor === color ? 'active' : ''}`}
              style={{ background: color }}
              onClick={(e) => {
                e.stopPropagation();
                onBorderColor(color);
              }}
            />
          ))}
        </div>
      )}

      <div
        className="context-menu-item"
        onClick={() => {
          setShowDescription(!showDescription);
          setShowRotation(false);
          setShowScale(false);
          setShowBorderColor(false);
        }}
      >
        <span>📝</span>
        <span>添加描述</span>
      </div>
      {showDescription && (
        <div style={{ padding: '8px 4px' }}>
          <textarea
            className="text-input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="输入展品描述..."
            rows={3}
            style={{ resize: 'vertical', minHeight: '60px' }}
            onClick={(e) => e.stopPropagation()}
          />
          <button
            className="btn btn-primary btn-small btn-block"
            style={{ marginTop: '8px' }}
            onClick={(e) => {
              e.stopPropagation();
              onDescription(description);
            }}
          >
            保存描述
          </button>
        </div>
      )}

      <div className="context-menu-divider"></div>

      <div
        className="context-menu-item"
        style={{ color: 'var(--danger)' }}
        onClick={onDelete}
      >
        <span>🗑️</span>
        <span>删除展品</span>
      </div>
    </div>
  );
};

export default ContextMenu;
